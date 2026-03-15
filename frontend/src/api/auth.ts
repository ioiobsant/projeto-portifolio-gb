import { request } from './client'

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  createdAt: string
}

export interface RegisterResponse {
  ok: boolean
  activationToken?: string
}

export async function register(params: {
  email?: string
  phone?: string
  password: string
}): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function activate(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/activate', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function login(loginValue: string, password: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginValue, password }),
  })
}

export async function me(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/me')
}

export async function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
  })
}
