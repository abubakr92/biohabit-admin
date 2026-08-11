import { ApiError } from '@/lib/api/client';
import type { ContextRow, Label, MicroAction, Stack } from '@/types/models';
import { seedStacks } from './data/stacks';
import { seedMicroActions } from './data/micro-actions';
import { seedContextRows } from './data/context-rows';
import { seedLabels } from './data/labels';
import { seedUsers } from './data/users';

let stacks = structuredClone(seedStacks);
let microActions = structuredClone(seedMicroActions);
let contextRows = structuredClone(seedContextRows);
let labels = structuredClone(seedLabels);
const users = structuredClone(seedUsers);

const delay = () => new Promise((resolve) => setTimeout(resolve, 260 + Math.random() * 140));
const body = <T>(init: RequestInit) =>
  init.body ? (JSON.parse(String(init.body)) as T) : undefined;
const id = () => crypto.randomUUID();

export async function mockRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await delay();
  const method = (init.method ?? 'GET').toUpperCase();
  if (
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem('biohabit-force-error') === 'true'
  )
    throw new ApiError(500, 'Simulated mock error. Clear the testing flag to continue.');

  if (path === '/stacks' && method === 'GET') return structuredClone(stacks) as T;
  if (path === '/stacks' && method === 'POST') {
    const input =
      body<Omit<Stack, 'id' | 'createdAt' | 'updatedAt' | 'actionCount' | 'modeDurations'>>(init)!;
    const now = new Date().toISOString();
    const item: Stack = {
      ...input,
      id: id(),
      createdAt: now,
      updatedAt: now,
      actionCount: 0,
      modeDurations: { essential: 0, balanced: 0, full: 0 },
    };
    stacks = [item, ...stacks];
    return structuredClone(item) as T;
  }
  const stackDuplicate = path.match(/^\/stacks\/([^/]+)\/duplicate$/);
  if (stackDuplicate && method === 'POST') {
    const source = stacks.find((item) => item.id === stackDuplicate[1]);
    if (!source) throw new ApiError(404, 'Stack not found.');
    const copyId = id();
    const now = new Date().toISOString();
    const copy: Stack = {
      ...structuredClone(source),
      id: copyId,
      title: { nl: `${source.title.nl} (kopie)`, en: `${source.title.en} (copy)` },
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    stacks = [copy, ...stacks];
    contextRows = [
      ...contextRows,
      ...contextRows
        .filter((row) => row.stackId === source.id)
        .map((row) => ({ ...structuredClone(row), id: id(), stackId: copyId })),
    ];
    return copy as T;
  }
  const stackContexts = path.match(/^\/stacks\/([^/]+)\/context-rows$/);
  if (stackContexts && method === 'GET')
    return structuredClone(
      contextRows
        .filter((row) => row.stackId === stackContexts[1])
        .sort((a, b) => a.stackSortOrder - b.stackSortOrder),
    ) as T;
  if (stackContexts && method === 'POST') {
    const input = body<Omit<ContextRow, 'id' | 'stackId'>>(init)!;
    const row: ContextRow = { ...input, id: id(), stackId: stackContexts[1] };
    contextRows.push(row);
    syncStack(row.stackId);
    return structuredClone(row) as T;
  }
  const stackDetail = path.match(/^\/stacks\/([^/]+)$/);
  if (stackDetail && method === 'GET') {
    const item = stacks.find((value) => value.id === stackDetail[1]);
    if (!item) throw new ApiError(404, 'Stack not found.');
    return structuredClone(item) as T;
  }
  if (stackDetail && method === 'PATCH') {
    const index = stacks.findIndex((value) => value.id === stackDetail[1]);
    if (index < 0) throw new ApiError(404, 'Stack not found.');
    stacks[index] = {
      ...stacks[index],
      ...body<Partial<Stack>>(init),
      id: stacks[index].id,
      updatedAt: new Date().toISOString(),
    };
    return structuredClone(stacks[index]) as T;
  }

  if (path === '/context-rows/reorder' && method === 'POST') {
    const input = body<{ stackId: string; ids: string[] }>(init)!;
    input.ids.forEach((rowId, index) => {
      const row = contextRows.find((item) => item.id === rowId);
      if (row) row.stackSortOrder = index;
    });
    return undefined as T;
  }
  const contextDetail = path.match(/^\/context-rows\/([^/]+)$/);
  if (contextDetail && method === 'PATCH') {
    const index = contextRows.findIndex((value) => value.id === contextDetail[1]);
    if (index < 0) throw new ApiError(404, 'Context row not found.');
    contextRows[index] = {
      ...contextRows[index],
      ...body<Partial<ContextRow>>(init),
      id: contextRows[index].id,
    };
    syncStack(contextRows[index].stackId);
    return structuredClone(contextRows[index]) as T;
  }
  if (contextDetail && method === 'DELETE') {
    const row = contextRows.find((value) => value.id === contextDetail[1]);
    contextRows = contextRows.filter((value) => value.id !== contextDetail[1]);
    if (row) syncStack(row.stackId);
    return undefined as T;
  }

  if (path === '/micro-actions' && method === 'GET') return structuredClone(microActions) as T;
  if (path === '/micro-actions' && method === 'POST') {
    const item = {
      ...body<Omit<MicroAction, 'id' | 'usedInStacksCount'>>(init)!,
      id: id(),
      usedInStacksCount: 0,
    };
    microActions = [item, ...microActions];
    return structuredClone(item) as T;
  }
  const actionDetail = path.match(/^\/micro-actions\/([^/]+)$/);
  if (actionDetail && method === 'GET') {
    const item = microActions.find((value) => value.id === actionDetail[1]);
    if (!item) throw new ApiError(404, 'Micro-action not found.');
    return structuredClone(item) as T;
  }
  if (actionDetail && method === 'PATCH') {
    const index = microActions.findIndex((value) => value.id === actionDetail[1]);
    if (index < 0) throw new ApiError(404, 'Micro-action not found.');
    microActions[index] = {
      ...microActions[index],
      ...body<Partial<MicroAction>>(init),
      id: microActions[index].id,
    };
    return structuredClone(microActions[index]) as T;
  }
  if (actionDetail && method === 'DELETE') {
    const used = contextRows.filter((row) => row.microActionId === actionDetail[1]);
    if (used.length) {
      const dependentNames = [
        ...new Set(
          used
            .map((row) => stacks.find((stack) => stack.id === row.stackId)?.title.en)
            .filter(Boolean),
        ),
      ];
      throw new ApiError(
        409,
        `This action is used in: ${dependentNames.join(', ')}. Remove it from those stacks first.`,
      );
    }
    microActions = microActions.filter((value) => value.id !== actionDetail[1]);
    return undefined as T;
  }

  if (path === '/labels' && method === 'GET') return structuredClone(labels) as T;
  if (path === '/labels' && method === 'POST') {
    const item = { ...body<Omit<Label, 'id' | 'usageCount'>>(init)!, id: id(), usageCount: 0 };
    labels.push(item);
    return structuredClone(item) as T;
  }
  const labelDetail = path.match(/^\/labels\/([^/]+)$/);
  if (labelDetail && method === 'PATCH') {
    const index = labels.findIndex((value) => value.id === labelDetail[1]);
    if (index < 0) throw new ApiError(404, 'Label not found.');
    labels[index] = { ...labels[index], ...body<Partial<Label>>(init), id: labels[index].id };
    return structuredClone(labels[index]) as T;
  }
  if (labelDetail && method === 'DELETE') {
    const item = labels.find((value) => value.id === labelDetail[1]);
    if (item?.usageCount)
      throw new ApiError(
        409,
        `“${item.name.en}” is used ${item.usageCount} times and cannot be deleted.`,
      );
    labels = labels.filter((value) => value.id !== labelDetail[1]);
    return undefined as T;
  }

  if (path === '/users' && method === 'GET') return structuredClone(users) as T;
  const unlock = path.match(/^\/users\/([^/]+)\/unlock$/);
  if (unlock && method === 'POST') {
    const index = users.findIndex((value) => value.id === unlock[1]);
    if (index < 0) throw new ApiError(404, 'User not found.');
    users[index].unlockedAt = new Date().toISOString();
    return structuredClone(users[index]) as T;
  }
  throw new ApiError(404, `Mock endpoint not implemented: ${method} ${path}`);
}

function syncStack(stackId: string) {
  const stack = stacks.find((item) => item.id === stackId);
  if (!stack) return;
  const rows = contextRows.filter((row) => row.stackId === stackId);
  stack.actionCount = rows.length;
  const duration = (mode: 'essential' | 'balanced' | 'full') =>
    rows
      .filter(
        (row) =>
          ({ essential: 0, balanced: 1, full: 2 })[row.includedInMode] <=
          { essential: 0, balanced: 1, full: 2 }[mode],
      )
      .reduce(
        (sum, row) =>
          sum +
          (row.durationOverrideMin ??
            microActions.find((action) => action.id === row.microActionId)?.durationMin ??
            0),
        0,
      );
  stack.modeDurations = {
    essential: duration('essential'),
    balanced: duration('balanced'),
    full: duration('full'),
  };
}
