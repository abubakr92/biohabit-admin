export const endpoints = {
  auth: { login: '/auth/login', logout: '/auth/logout', session: '/auth/session' },
  stacks: {
    list: '/stacks',
    detail: (id: string) => `/stacks/${id}`,
    duplicate: (id: string) => `/stacks/${id}/duplicate`,
    contexts: (id: string) => `/stacks/${id}/context-rows`,
  },
  contextRows: { detail: (id: string) => `/context-rows/${id}`, reorder: '/context-rows/reorder' },
  microActions: { list: '/micro-actions', detail: (id: string) => `/micro-actions/${id}` },
  labels: { list: '/labels', detail: (id: string) => `/labels/${id}` },
  users: { list: '/users', unlock: (id: string) => `/users/${id}/unlock` },
} as const;
