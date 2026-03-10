const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type RequestOptions = RequestInit & { params?: Record<string, string> }

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { params, ...init } = options ?? {}
  const url = params
    ? `${API_BASE}${path}?${new URLSearchParams(params)}`
    : `${API_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as HeadersInit),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = (body as { error?: string }).error ?? res.statusText
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export { API_BASE, request }
