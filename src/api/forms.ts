import { request } from './client';

export type FormField = {
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'lookup' | 'exist';
  required?: boolean;
  options?: string[];
  lookupFormId?: string;
  lookupSourceField?: string;
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
  subFields?: FormField[];
  hasSubFields?: boolean;
  // Optional PDF export settings
  pdfDescription?: string;
  pdfImage?: string; // filename of an asset, e.g., 'fire_department.png'
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