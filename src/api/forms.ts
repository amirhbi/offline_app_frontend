import { request } from './client';

export type FormField = {
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
};

export type FormCategory = {
  name: string;
  fields: FormField[];
};

export type FormRecord = {
  id: string;
  name: string;
  fields: FormField[];
  categories?: FormCategory[];
};

type ServerForm = Omit<FormRecord, 'id'> & { _id: string };

function mapForm(f: ServerForm): FormRecord {
  const { _id, ...rest } = f;
  return { id: _id, ...rest };
}

export async function listForms(): Promise<FormRecord[]> {
  const data = await request<ServerForm[]>('/forms');
  return data.map(mapForm);
}

export async function getForm(id: string): Promise<FormRecord> {
  const data = await request<ServerForm>(`/forms/${id}`);
  return mapForm(data);
}