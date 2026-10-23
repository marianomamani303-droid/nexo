import { request } from './http-client';
export interface SessionUser {
  id: string;
  email: string;
  handle: string;
  name: string;
}
export interface AuthResult {
  user: SessionUser;
}
export const authApi = {
  session: (signal?: AbortSignal) => request<AuthResult>('/auth/session', undefined, signal),
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { name, email, password }),
  logout: () => request<void>('/auth/logout', {}),
};
