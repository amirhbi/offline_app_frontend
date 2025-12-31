import { request } from './client';

export type UserRecord = {
  id: string;
  username: string;
  nickname?: string;
  role: 'l2' | 'l3';
  password?: string;
  forms: string[];
  forms_view: string[];
  reports: string[];
  logs: string[];
  backupAllowed?: boolean;
};

type ServerUser = Omit<UserRecord, 'id'> & { _id: string };

function mapUser(u: ServerUser): UserRecord {
  const { _id, ...rest } = u;
  return { id: _id, ...rest };
}

export async function listUsers(role?: 'l2' | 'l3'): Promise<UserRecord[]> {
  const q = role ? `?role=${encodeURIComponent(role)}` : '';
  const data = await request<ServerUser[]>(`/users${q}`);
  return data.map(mapUser);
}

export async function createUser(payload: Omit<UserRecord, 'id'>): Promise<UserRecord> {
  const data = await request<ServerUser>(`/users`, { method: 'POST', body: payload });
  return mapUser(data);
}

export async function updateUser(id: string, payload: Partial<Omit<UserRecord, 'id'>>): Promise<UserRecord> {
  const data = await request<ServerUser>(`/users/${id}`, { method: 'PUT', body: payload });
  return mapUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`/users/${id}`, { method: 'DELETE' });
}