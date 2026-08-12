// Stand-in for the mock adapter in builds where mocks are disabled. The API client's mock branch
// is statically dead in those builds, so nothing here is ever called.
export function mockRequest<T>(): Promise<T> {
  throw new Error('Mock mode is not enabled in this build.');
}
