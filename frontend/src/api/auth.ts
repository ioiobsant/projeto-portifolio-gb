import { request } from './client'

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  createdAt: string
}

export interface AdminListItem {
  id: string
  email: string
  createdAt: string
}

export async function login(email: string, password: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: email, password }),
  })
}

export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function getAdmins(): Promise<{ admins: AdminListItem[] }> {
  return request<{ admins: AdminListItem[] }>('/auth/admins')
}

export async function inviteAdmin(email: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/invite-admin', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function acceptInvite(token: string, newPassword: string): Promise<{ ok: boolean; email?: string }> {
  return request<{ ok: boolean; email?: string }>('/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function deleteAdmin(adminId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/auth/admins/${adminId}`, {
    method: 'DELETE',
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
