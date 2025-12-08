import { request } from './client';

export type LoginPayload = { username: string; password: string };
export type LoginResponse = { token: string };

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: payload });
}