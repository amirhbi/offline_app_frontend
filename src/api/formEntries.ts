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