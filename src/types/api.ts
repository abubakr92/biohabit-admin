export interface ApiFieldErrors {
  [field: string]: string[];
}
export interface ApiList<T> {
  data: T[];
  total: number;
}
export interface ApiSuccess<T> {
  data: T;
}
export interface SessionUser {
  id: string;
  email: string;
  accessLevel: 'admin' | 'free' | 'premium' | 'test';
}
