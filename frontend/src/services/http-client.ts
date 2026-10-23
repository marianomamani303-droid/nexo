export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/v1' + path, {
      method,
      credentials: 'include',
      signal,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Nexo-CSRF': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('No pudimos conectar con el servidor. Intentá nuevamente.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new HttpError(response.status, data?.message || 'No pudimos procesar la solicitud.');
  return data as T;
}
