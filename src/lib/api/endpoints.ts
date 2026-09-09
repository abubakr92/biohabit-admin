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
  notificationTemplates: {
    list: '/notification-templates',
    detail: (id: string) => `/notification-templates/${id}`,
  },
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    unlock: (id: string) => `/users/${id}/unlock`,
    routines: (id: string) => `/users/${id}/routines`,
    activity: (id: string) => `/users/${id}/activity`,
    preferences: (id: string) => `/users/${id}/preferences`,
    checkOffs: (id: string) => `/users/${id}/check-offs`,
  },
  // Member-owned routines. Read-only: no create, update or delete exists anywhere.
  routines: {
    list: '/routines',
    detail: (id: string) => `/routines/${id}`,
    actions: (id: string) => `/routines/${id}/actions`,
    divergence: (id: string) => `/routines/${id}/divergence`,
    completion: (id: string) => `/routines/${id}/completion`,
  },
} as const;
