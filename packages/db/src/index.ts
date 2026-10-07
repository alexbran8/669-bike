export interface ApiError { error: string }
export async function apiRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/.netlify/functions/${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } })
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      response.status === 404 || response.ok
        ? 'The API is unavailable. Open the app through Netlify Dev (usually http://localhost:8888), not the Vite server on port 5173.'
        : `API request failed (${response.status})`,
    )
  }
  const body = await response.json().catch(() => ({ error: 'Unexpected server response' })) as T | ApiError
  if (!response.ok) throw new Error('error' in (body as ApiError) ? (body as ApiError).error : `Request failed (${response.status})`)
  return body as T
}
