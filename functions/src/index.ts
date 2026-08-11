import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { ZodError } from 'zod';
import { adminAuth } from './firebase';
import { contextRowSchema, labelSchema, microActionSchema, reorderSchema, stackSchema } from './schemas';
import * as store from './store';
import type { ContextRowInput, LabelInput, MicroActionInput, StackInput } from './types';

setGlobalOptions({ region: 'europe-west4', maxInstances: 10 });
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

type Handler = (request: Request, response: Response) => Promise<void>;
const route = (handler: Handler) => (request: Request, response: Response, next: NextFunction) => handler(request, response).catch(next);

app.get('/health', (_request, response) => response.json({ ok: true, project: 'biohabit', region: 'europe-west4' }));
app.use((request, response, next) => {
  const authenticate = async () => {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new store.HttpError(401, 'A Firebase ID token is required.');
    let decoded;
    try { decoded = await adminAuth.verifyIdToken(header.slice(7)); }
    catch { throw new store.HttpError(401, 'The Firebase ID token is invalid or expired.'); }
    response.locals.admin = await store.ensureAdminUser(decoded.uid, decoded.email ?? '');
  };
  authenticate().then(() => next()).catch(next);
});

app.get('/auth/session', route(async (_request, response) => { response.json({ user: response.locals.admin }); }));

app.get('/stacks', route(async (request, response) => {
  const search = String(request.query.search ?? '').toLowerCase(); const functionTag = String(request.query.functionTag ?? ''); const label = String(request.query.label ?? ''); const active = String(request.query.active ?? '');
  const data = (await store.listStacks()).filter((stack) => (!search || `${stack.title.en} ${stack.title.nl}`.toLowerCase().includes(search)) && (!functionTag || stack.functionTag === functionTag) && (!label || stack.primaryLabel === label || stack.supportingLabels.includes(label)) && (!active || stack.isActive === (active === 'true' || active === 'active')));
  response.json(data);
}));
app.post('/stacks', route(async (request, response) => { const input = stackSchema.parse(request.body) as StackInput; response.status(201).json(await store.createStack(input)); }));
app.get('/stacks/:id', route(async (request, response) => { response.json(await store.getStack(request.params.id)); }));
app.patch('/stacks/:id', route(async (request, response) => { const existing = await store.getStack(request.params.id); const input = stackSchema.parse({ ...stackInput(existing), ...request.body }) as StackInput; response.json(await store.updateStack(request.params.id, input)); }));
app.post('/stacks/:id/duplicate', route(async (request, response) => { response.status(201).json(await store.duplicateStack(request.params.id)); }));
app.get('/stacks/:id/context-rows', route(async (request, response) => { await store.getStack(request.params.id); response.json(await store.listContextRows(request.params.id)); }));
app.post('/stacks/:id/context-rows', route(async (request, response) => { const input = contextRowSchema.parse(request.body) as ContextRowInput; response.status(201).json(await store.createContextRow(request.params.id, input)); }));

app.patch('/context-rows/:id', route(async (request, response) => { const existing = await store.getContextRow(request.params.id); const input = contextRowSchema.parse({ ...contextInput(existing), ...request.body }) as ContextRowInput; response.json(await store.updateContextRow(request.params.id, input)); }));
app.delete('/context-rows/:id', route(async (request, response) => { await store.deleteContextRow(request.params.id); response.status(204).send(); }));
app.post('/context-rows/reorder', route(async (request, response) => { const input = reorderSchema.parse(request.body); await store.reorderContextRows(input.stackId, input.ids); response.status(204).send(); }));

app.get('/micro-actions', route(async (request, response) => { const search = String(request.query.search ?? '').toLowerCase(); const label = String(request.query.label ?? ''); response.json((await store.listMicroActions()).filter((action) => (!search || `${action.title.en} ${action.title.nl}`.toLowerCase().includes(search)) && (!label || action.labels.includes(label)))); }));
app.post('/micro-actions', route(async (request, response) => { const input = microActionSchema.parse(request.body) as MicroActionInput; response.status(201).json(await store.createMicroAction(input)); }));
app.get('/micro-actions/:id', route(async (request, response) => { response.json(await store.getMicroAction(request.params.id)); }));
app.patch('/micro-actions/:id', route(async (request, response) => { const existing = await store.getMicroAction(request.params.id); const input = microActionSchema.parse({ ...microActionInput(existing), ...request.body }) as MicroActionInput; response.json(await store.updateMicroAction(request.params.id, input)); }));
app.delete('/micro-actions/:id', route(async (request, response) => { await store.deleteMicroAction(request.params.id); response.status(204).send(); }));

app.get('/labels', route(async (_request, response) => { response.json(await store.listLabels()); }));
app.post('/labels', route(async (request, response) => { const input = labelSchema.parse(request.body) as LabelInput; response.status(201).json(await store.createLabel(input)); }));
app.patch('/labels/:id', route(async (request, response) => { const existing = (await store.listLabels()).find((label) => label.id === request.params.id); if (!existing) throw new store.HttpError(404, 'Label not found.'); const input = labelSchema.parse({ key: existing.key, name: existing.name, ...request.body }) as LabelInput; response.json(await store.updateLabel(request.params.id, input)); }));
app.delete('/labels/:id', route(async (request, response) => { await store.deleteLabel(request.params.id); response.status(204).send(); }));

app.get('/users', route(async (request, response) => { const status = String(request.query.status ?? 'all'); const now = Date.now(); response.json((await store.listUsers()).filter((user) => status === 'all' || (status === 'silent' && (!user.lastCheckOffAt || now - new Date(user.lastCheckOffAt).getTime() >= 259_200_000)) || (status === 'unlocked' && Boolean(user.unlockedAt)) || (status === 'locked' && !user.unlockedAt))); }));
app.post('/users/:id/unlock', route(async (request, response) => { response.json(await store.unlockUser(request.params.id)); }));

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) { const flattened = error.flatten(); response.status(422).json({ message: 'Validation failed.', fieldErrors: flattened.fieldErrors }); return; }
  if (error instanceof store.HttpError) { response.status(error.status).json({ message: error.message, fieldErrors: error.fieldErrors }); return; }
  console.error(error); response.status(500).json({ message: 'Unexpected server error.' });
});

function stackInput(stack: StackInput): StackInput { return { title: stack.title, description: stack.description, coherence: stack.coherence, suggestedTiming: stack.suggestedTiming, functionTag: stack.functionTag, primaryLabel: stack.primaryLabel, supportingLabels: stack.supportingLabels, level: stack.level, isPremium: stack.isPremium, isActive: stack.isActive }; }
function microActionInput(action: MicroActionInput): MicroActionInput { return { title: action.title, effect: action.effect, howTo: action.howTo, warning: action.warning, labels: action.labels, durationMin: action.durationMin, level: action.level }; }
function contextInput(row: ContextRowInput): ContextRowInput { return { microActionId: row.microActionId, microActionTitle: row.microActionTitle, stackSortOrder: row.stackSortOrder, priorityOrder: row.priorityOrder, isOptional: row.isOptional, isActiveByDefault: row.isActiveByDefault, includedInMode: row.includedInMode, daypart: row.daypart, durationOverrideMin: row.durationOverrideMin, timingType: row.timingType, startTime: row.startTime, endTime: row.endTime, relativeToContextId: row.relativeToContextId, dependencyText: row.dependencyText, contextEffect: row.contextEffect, contextWarning: row.contextWarning, centreTime: row.centreTime, elasticityMin: row.elasticityMin }; }

export const api = onRequest({ timeoutSeconds: 60, memory: '256MiB', invoker: 'public' }, app);
