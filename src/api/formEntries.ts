import { request } from './client';

export type FormEntryRecord = {
  id: string;
  formId: string;
  data: Record<string, any>;
  createdAt?: string;
};

type ServerEntry = Omit<FormEntryRecord, 'id' | 'formId' | 'createdAt'> & { _id: string; formId: string; createdAt?: string };

function mapEntry(e: ServerEntry): FormEntryRecord {
  const { _id, ...rest } = e;
  return { id: _id, ...rest } as FormEntryRecord;
}

export async function listFormEntries(formId: string): Promise<FormEntryRecord[]> {
  const data = await request<ServerEntry[]>(`/forms/${formId}/entries`);
  return data.map(mapEntry);
}

export async function createFormEntry(formId: string, payload: { data: Record<string, any> }): Promise<FormEntryRecord> {
  const data = await request<ServerEntry>(`/forms/${formId}/entries`, { method: 'POST', body: payload });
  return mapEntry(data);
}

export async function updateFormEntry(formId: string, entryId: string, payload: { data: Record<string, any> }): Promise<FormEntryRecord> {
  const data = await request<ServerEntry>(`/forms/${formId}/entries/${entryId}`, { method: 'PUT', body: payload });
  return mapEntry(data);
}

export async function deleteFormEntry(formId: string, entryId: string): Promise<void> {
  await request<void>(`/forms/${formId}/entries/${entryId}`, { method: 'DELETE' });
}