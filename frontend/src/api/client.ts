const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const CSRF_COOKIE_NAME = 'gba_csrf'
const AUTH_REFRESH_PATH = '/auth/refresh'

const NON_REFRESHABLE_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/activate',
  '/auth/refresh',
])

let refreshPromise: Promise<boolean> | null = null

type RequestOptions = RequestInit & {
  params?: Record<string, string>
  skipAuthRefresh?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readCookie(name: string): string {
  const source = document.cookie || ''
  if (!source) return ''

  const parts = source.split(';')
  for (const rawPart of parts) {
    const part = rawPart.trim()
    if (!part) continue
    const separator = part.indexOf('=')
    if (separator <= 0) continue
    const key = part.slice(0, separator).trim()
    if (key !== name) continue
    return decodeURIComponent(part.slice(separator + 1).trim())
  }

  return ''
}

function getCsrfToken(): string {
  return readCookie(CSRF_COOKIE_NAME)
}

function shouldAttachCsrf(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

function getUrl(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) {
    return `${API_BASE}${path}`
  }
  const query = new URLSearchParams(params)
  return `${API_BASE}${path}?${query.toString()}`
}

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const csrfToken = getCsrfToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    }

    const response = await fetch(`${API_BASE}${AUTH_REFRESH_PATH}`, {
      method: 'POST',
      headers,
      credentials: 'include',
    })

    return response.ok
  })()
    .catch(() => false)
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { params, skipAuthRefresh, ...init } = options ?? {}
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers ?? {})

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (shouldAttachCsrf(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  const response = await fetch(getUrl(path, params), {
    ...init,
    method,
    headers,
    credentials: 'include',
  })

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !NON_REFRESHABLE_PATHS.has(path)
  ) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      return request<T>(path, {
        ...options,
        skipAuthRefresh: true,
      })
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = (body as { error?: string }).error ?? response.statusText
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export { API_BASE, request }
