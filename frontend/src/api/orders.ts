import type { OrderItem } from '../types/order'
import { request } from './client'

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
