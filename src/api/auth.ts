import { request } from './client';

export type LoginPayload = { username: string; password: string };
export type LoginResponse = { token: string, role: 'l2' | 'l3' | 'super_admin', userData: {token: string, role: 'l2' | 'l3' | 'super_admin', username: string, nickname?: string, forms: string[], forms_view: string[], reports: string[], logs: string[]} };

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: payload });
}
