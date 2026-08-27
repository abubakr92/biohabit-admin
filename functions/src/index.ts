import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { ZodError } from 'zod';
import { adminAuth } from './firebase';
import { contextRowSchema, labelSchema, microActionSchema, reorderSchema, stackSchema, userQuerySchema } from './schemas';
import * as store from './store';
import * as routines from './routines';
import type { ContextRowInput, LabelInput, MicroActionInput, StackInput } from './types';

setGlobalOptions({ region: 'europe-west4', maxInstances: 10 });
const app = express();
app.disable('x-powered-by');

// Only the admin panel's own origins may call the API from a browser. Set ADMIN_ORIGINS in functions/.env.
const allowedOrigins = (process.env.ADMIN_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const emulated = Boolean(process.env.FUNCTIONS_EMULATOR);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (emulated && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  maxAge: 3600,
}));
app.use(express.json({ limit: '1mb' }));

type Handler = (request: Request, response: Response) => Promise<void>;
const route = (handler: Handler) => (request: Request, response: Response, next: NextFunction) => handler(request, response).catch(next);
const audit = (response: Response, action: string, resource: string, id: string) => store.recordAudit(response.locals.admin, action, resource, id);

// Per-instance throttle. It is a guard rail against a runaway client, not a substitute for infrastructure rate limiting.
const RATE_LIMIT = 120; const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string) {
  const now = Date.now(); const entry = hits.get(key);
  if (hits.size > 5_000) for (const [id, value] of hits) if (value.resetAt <= now) hits.delete(id);
  if (!entry || entry.resetAt <= now) { hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS }); return; }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) throw new store.HttpError(429, 'Too many requests. Wait a moment and try again.');
}

app.get('/health', (_request, response) => response.json({ ok: true, project: 'biohabit', region: 'europe-west4' }));
app.use((request, response, next) => {
  const authenticate = async () => {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new store.HttpError(401, 'A Firebase ID token is required.');
    let decoded;
    try { decoded = await adminAuth.verifyIdToken(header.slice(7), true); }
    catch { throw new store.HttpError(401, 'The Firebase ID token is invalid, expired or revoked.'); }
    rateLimit(decoded.uid);
    response.locals.admin = await store.ensureAdminUser(decoded.uid, decoded.email ?? '', decoded.admin === true);
  };
  authenticate().then(() => next()).catch(next);
});

app.get('/auth/session', route(async (_request, response) => { response.json({ user: response.locals.admin }); }));

app.get('/stacks', route(async (request, response) => {
  const search = String(request.query.search ?? '').toLowerCase(); const functionTag = String(request.query.functionTag ?? ''); const label = String(request.query.label ?? ''); const active = String(request.query.active ?? ''); const daypart = String(request.query.daypart ?? '');
  const data = (await store.listStacks()).filter((stack) => (!search || `${stack.title.en} ${stack.title.nl}`.toLowerCase().includes(search)) && (!functionTag || stack.functionTag === functionTag) && (!label || stack.primaryLabel === label || stack.supportingLabels.includes(label)) && (!daypart || stack.daypart === daypart) && (!active || stack.isActive === (active === 'true' || active === 'active')));
  response.json(data);
}));
app.post('/stacks', route(async (request, response) => { const input = stackSchema.parse(request.body) as StackInput; const stack = await store.createStack(input); await audit(response, 'create', 'stack', stack.id); response.status(201).json(stack); }));
app.get('/stacks/:id', route(async (request, response) => { response.json(await store.getStack(request.params.id)); }));
app.patch('/stacks/:id', route(async (request, response) => { const existing = await store.getStack(request.params.id); const input = stackSchema.parse({ ...stackInput(existing), ...request.body }) as StackInput; const stack = await store.updateStack(request.params.id, input); await audit(response, existing.isActive === input.isActive ? 'update' : input.isActive ? 'publish' : 'unpublish', 'stack', request.params.id); response.json(stack); }));
app.delete('/stacks/:id', route(async (request, response) => { await store.deleteStack(request.params.id); await audit(response, 'delete', 'stack', request.params.id); response.status(204).send(); }));
app.post('/stacks/:id/duplicate', route(async (request, response) => { const stack = await store.duplicateStack(request.params.id); await audit(response, 'duplicate', 'stack', stack.id); response.status(201).json(stack); }));
app.get('/stacks/:id/context-rows', route(async (request, response) => { await store.getStack(request.params.id); response.json(await store.listContextRows(request.params.id)); }));
app.post('/stacks/:id/context-rows', route(async (request, response) => { const input = contextRowSchema.parse(request.body) as ContextRowInput; const row = await store.createContextRow(request.params.id, input); await audit(response, 'create', 'contextRow', row.id); response.status(201).json(row); }));

app.patch('/context-rows/:id', route(async (request, response) => { const existing = await store.getContextRow(request.params.id); const input = contextRowSchema.parse({ ...contextInput(existing), ...request.body }) as ContextRowInput; const row = await store.updateContextRow(request.params.id, input); await audit(response, 'update', 'contextRow', request.params.id); response.json(row); }));
app.delete('/context-rows/:id', route(async (request, response) => { await store.deleteContextRow(request.params.id); await audit(response, 'delete', 'contextRow', request.params.id); response.status(204).send(); }));
app.post('/context-rows/reorder', route(async (request, response) => { const input = reorderSchema.parse(request.body); await store.reorderContextRows(input.stackId, input.ids); await audit(response, 'reorder', 'stack', input.stackId); response.status(204).send(); }));

app.get('/micro-actions', route(async (request, response) => { const search = String(request.query.search ?? '').toLowerCase(); const label = String(request.query.label ?? ''); response.json((await store.listMicroActions()).filter((action) => (!search || `${action.title.en} ${action.title.nl}`.toLowerCase().includes(search)) && (!label || action.labels.includes(label)))); }));
app.post('/micro-actions', route(async (request, response) => { const input = microActionSchema.parse(request.body) as MicroActionInput; const action = await store.createMicroAction(input); await audit(response, 'create', 'microAction', action.id); response.status(201).json(action); }));
app.get('/micro-actions/:id', route(async (request, response) => { response.json(await store.getMicroAction(request.params.id)); }));
app.patch('/micro-actions/:id', route(async (request, response) => { const existing = await store.getMicroAction(request.params.id); const input = microActionSchema.parse({ ...microActionInput(existing), ...request.body }) as MicroActionInput; const action = await store.updateMicroAction(request.params.id, input); await audit(response, 'update', 'microAction', request.params.id); response.json(action); }));
app.delete('/micro-actions/:id', route(async (request, response) => { await store.deleteMicroAction(request.params.id); await audit(response, 'delete', 'microAction', request.params.id); response.status(204).send(); }));

app.get('/labels', route(async (_request, response) => { response.json(await store.listLabels()); }));
app.post('/labels', route(async (request, response) => { const input = labelSchema.parse(request.body) as LabelInput; const label = await store.createLabel(input); await audit(response, 'create', 'label', label.id); response.status(201).json(label); }));
app.patch('/labels/:id', route(async (request, response) => { const existing = (await store.listLabels()).find((label) => label.id === request.params.id); if (!existing) throw new store.HttpError(404, 'Label not found.'); const input = labelSchema.parse({ key: existing.key, name: existing.name, ...request.body }) as LabelInput; const label = await store.updateLabel(request.params.id, input); await audit(response, 'update', 'label', request.params.id); response.json(label); }));
app.delete('/labels/:id', route(async (request, response) => { await store.deleteLabel(request.params.id); await audit(response, 'delete', 'label', request.params.id); response.status(204).send(); }));

// Member-owned routines. Read-only by design: no create, update or delete route exists here.
app.get('/routines', route(async (request, response) => { response.json(await routines.listRoutines({ search: String(request.query.search ?? ''), source: String(request.query.source ?? ''), status: String(request.query.status ?? ''), mode: String(request.query.mode ?? ''), userId: String(request.query.userId ?? '') })); }));
app.get('/routines/:id', route(async (request, response) => { response.json(await routines.getRoutine(request.params.id)); }));
app.get('/routines/:id/actions', route(async (request, response) => { response.json(await routines.listRoutineActions(request.params.id)); }));
app.get('/routines/:id/divergence', route(async (request, response) => { response.json(await routines.getRoutineDivergence(request.params.id)); }));
app.get('/routines/:id/completion', route(async (request, response) => { const days = Math.min(Math.max(Number(request.query.days ?? 14), 1), 90); response.json(await routines.getRoutineCompletion(request.params.id, days)); }));
app.get('/users', route(async (request, response) => { const query = userQuerySchema.parse(request.query); response.json(await store.listUsers(query.status, query.limit, query.cursor)); }));
app.get('/users/:id', route(async (request, response) => { response.json(await store.getUser(request.params.id)); }));
app.get('/users/:id/routines', route(async (request, response) => { response.json(await routines.listUserRoutines(request.params.id)); }));
app.get('/users/:id/preferences', route(async (request, response) => { response.json(await store.getUserPreferences(request.params.id)); }));
app.get('/users/:id/check-offs', route(async (request, response) => { const limit = Math.min(Math.max(Number(request.query.limit ?? 30), 1), 100); response.json(await store.listUserCheckOffs(request.params.id, limit, request.query.cursor ? String(request.query.cursor) : undefined)); }));
app.get('/users/:id/activity', route(async (request, response) => { const days = Math.min(Math.max(Number(request.query.days ?? 30), 1), 90); response.json(await store.getUserActivity(request.params.id, days)); }));
app.post('/users/:id/unlock', route(async (request, response) => { const user = await store.unlockUser(request.params.id); await audit(response, 'unlock', 'user', request.params.id); response.json(user); }));

app.use((_request, _response, next: NextFunction) => next(new store.HttpError(404, 'Endpoint not found.')));
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) { response.status(422).json({ message: 'Validation failed.', fieldErrors: fieldErrors(error) }); return; }
  if (error instanceof store.HttpError) { response.status(error.status).json({ message: error.message, fieldErrors: error.fieldErrors }); return; }
  console.error(error); response.status(500).json({ message: 'Unexpected server error.' });
});

// Keys are dotted paths (`description.nl`) so the admin panel can map each message onto the field that produced it.
function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) { const key = issue.path.join('.') || '_'; (result[key] ??= []).push(issue.message); }
  return result;
}
function stackInput(stack: StackInput): StackInput { return { title: stack.title, description: stack.description, coherence: stack.coherence, suggestedTiming: stack.suggestedTiming, functionTag: stack.functionTag, primaryLabel: stack.primaryLabel, supportingLabels: stack.supportingLabels, level: stack.level, daypart: stack.daypart ?? null, isPremium: stack.isPremium, isActive: stack.isActive }; }
function microActionInput(action: MicroActionInput): MicroActionInput { return { title: action.title, effect: action.effect, howTo: action.howTo, warning: action.warning, labels: action.labels, durationMin: action.durationMin, level: action.level, defaultFunctionTag: action.defaultFunctionTag ?? null }; }
function contextInput(row: ContextRowInput): ContextRowInput { return { microActionId: row.microActionId, microActionTitle: row.microActionTitle, functionTag: row.functionTag ?? null, stackSortOrder: row.stackSortOrder, priorityOrder: row.priorityOrder, isOptional: row.isOptional, isActiveByDefault: row.isActiveByDefault, includedInMode: row.includedInMode, daypart: row.daypart, durationOverrideMin: row.durationOverrideMin, timingType: row.timingType, startTime: row.startTime, endTime: row.endTime, relativeToContextId: row.relativeToContextId, dependencyText: row.dependencyText, contextEffect: row.contextEffect, contextWarning: row.contextWarning, centreTime: row.centreTime, elasticityMin: row.elasticityMin }; }

export const api = onRequest({ timeoutSeconds: 60, memory: '256MiB', invoker: 'public' }, app);
