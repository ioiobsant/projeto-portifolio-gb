import { request } from './client'

export interface RegisterRequestResponse {
  ok: boolean
  devCode?: string
}

export interface LoginResponse {
  token: string
}

export async function requestRegisterCode(params: {
  email?: string
  phone?: string
}): Promise<RegisterRequestResponse> {
  return request<RegisterRequestResponse>('/auth/register/request', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function confirmRegister(params: {
  email?: string
  phone?: string
  token: string
  password: string
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/register/confirm', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginValue, password }),
  })
}
