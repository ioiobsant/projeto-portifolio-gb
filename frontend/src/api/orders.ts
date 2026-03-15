import type { OrderItem } from '../types/order'
import { request } from './client'

export interface CustomerLookupResponse {
  found: boolean
  customer?: {
    id: string
    name: string
    firstName: string
    lastName: string
    whatsapp: string
    email: string
  }
}

export async function getOrders(): Promise<OrderItem[]> {
  return request<OrderItem[]>('/orders')
}

export async function getOrder(id: string): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${encodeURIComponent(id)}`)
}

export async function createOrder(order: OrderItem): Promise<OrderItem> {
  return request<OrderItem>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export async function updateOrder(id: string, order: Partial<OrderItem>): Promise<OrderItem> {
  return request<OrderItem>(`/orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(order),
  })
}

export async function deleteOrder(id: string): Promise<void> {
  return request<void>(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function lookupCustomer(params: {
  email?: string
  phone?: string
}): Promise<CustomerLookupResponse> {
  const query: Record<string, string> = {}
  const email = params.email?.trim()
  const phone = params.phone?.trim()

  if (email) query.email = email
  if (phone) query.phone = phone

  return request<CustomerLookupResponse>('/customers/lookup', {
    params: query,
  })
}
