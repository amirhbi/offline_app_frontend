export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const API_BASE = 'https://off.liara.run/api';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('app_token');
  } catch {
    return null;
  }
}

export async function request<T>(path: string, opts: { method?: HttpMethod; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!res.ok) {
    const msg = isJson ? (await res.json())?.message || res.statusText : res.statusText;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }
  return (isJson ? res.json() : (null as unknown)) as T;
}
