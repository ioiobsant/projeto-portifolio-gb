import { ORDER_CATEGORIES, ORDER_STATUSES, MANUFACTURE_TYPES } from '../types/order'
import type { OrderCategory, OrderItem, OrderStatus } from '../types/order'
import { formatBrazilianPhone } from './phone'
import { formatBrazilianCurrencyFromNumber } from './currency'

export interface NewOrderForm {
  id: string
  // Cliente (para futura lista de clientes)
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerContact: string
  // Pedido
  category: OrderCategory
  model: string
  productImageUrl: string
  size: string
  deliveryDate: string
  status: OrderStatus
  quantity: number
  saleValue: string
  notes: string
  // Especificações
  fabric: string
  foam: string
  base: string
  hasPainting: boolean
  paintColor: string
  paintFinish: string
  manufactureType: (typeof MANUFACTURE_TYPES)[number]
}

export function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DEFAULT_ORDER_ID_PREFIX = 'GBA'

function normalizeIdPrefix(prefix: string | undefined): string {
  if (!prefix || typeof prefix !== 'string') return DEFAULT_ORDER_ID_PREFIX
  const cleaned = prefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return cleaned || DEFAULT_ORDER_ID_PREFIX
}

/** Gera um ID único no formato PREFIXO-XXXXXX (número aleatório de 6 dígitos), sem repetir os existentes */
export function generateRandomOrderId(orders: OrderItem[], idPrefix?: string): string {
  const prefix = `${normalizeIdPrefix(idPrefix)}-`
  const existingIds = new Set(orders.map((o) => o.id.toUpperCase()))
  const maxTries = 30
  for (let i = 0; i < maxTries; i++) {
    const num = Math.floor(100_000 + Math.random() * 900_000) // 100000–999999
    const id = `${prefix}${num}`
    if (!existingIds.has(id.toUpperCase())) return id
  }
  const fallback = `${prefix}${Date.now().toString().slice(-8)}`
  if (!existingIds.has(fallback.toUpperCase())) return fallback
  return `${prefix}${Date.now()}`
}

/** Gera próximo ID (mantido para compatibilidade) */
export function generateNextOrderId(orders: OrderItem[], idPrefix?: string): string {
  return generateRandomOrderId(orders, idPrefix)
}

/** Gera próximo ID vinculado ao cliente: GBA-INICIAIS-YYYY-NN (ex: GBA-JS-2026-01) */
export function generateNextOrderIdForClient(
  orders: OrderItem[],
  firstName: string,
  lastName: string
): string {
  const first = (firstName.trim().charAt(0) || '').toUpperCase()
  const last = (lastName.trim().charAt(0) || '').toUpperCase()
  const initials = first && last ? `${first}${last}` : ''
  const year = new Date().getFullYear()
  const basePrefix = normalizeIdPrefix(undefined)
  if (!initials) return generateRandomOrderId(orders, basePrefix)
  const prefix = `GBA-${initials}-${year}-`
  const existingIds = new Set(orders.map((o) => o.id.toUpperCase()))
  const maxSuffix = orders.reduce((max, order) => {
    if (!order.id.toUpperCase().startsWith(prefix.toUpperCase())) return max
    const suffix = order.id.slice(prefix.length)
    const value = Number.parseInt(suffix, 10)
    return Number.isNaN(value) ? max : Math.max(max, value)
  }, 0)
  const candidate = `${prefix}${String(maxSuffix + 1).padStart(2, '0')}`
  if (!existingIds.has(candidate.toUpperCase())) return candidate
  return generateRandomOrderId(orders, basePrefix)
}

function fullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim()
}

export function createInitialOrderForm(orders: OrderItem[], idPrefix?: string): NewOrderForm {
  return {
    id: generateRandomOrderId(orders, idPrefix),
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerContact: '',
    category: ORDER_CATEGORIES[0],
    model: '',
    productImageUrl: '',
    size: '',
    deliveryDate: getTodayIsoDate(),
    status: ORDER_STATUSES[0],
    quantity: 1,
    saleValue: '',
    notes: '',
    fabric: '',
    foam: '',
    base: '',
    hasPainting: false,
    paintColor: '',
    paintFinish: '',
    manufactureType: MANUFACTURE_TYPES[0],
  }
}

export function createOrderFormFromOrder(order: OrderItem): NewOrderForm {
  const [first = '', ...rest] = (order.customer.name || '').trim().split(/\s+/)
  const lastName = rest.join(' ') || ''
  return {
    id: order.id,
    customerFirstName: (order.customer as { firstName?: string }).firstName ?? first,
    customerLastName: (order.customer as { lastName?: string }).lastName ?? lastName,
    customerEmail: order.customer.email ?? '',
    customerContact: formatBrazilianPhone(order.customer.whatsapp ?? ''),
    category: order.category,
    model: order.model,
    productImageUrl: order.productImageUrl ?? '',
    size: order.size ?? '',
    deliveryDate: order.deliveryDate,
    status: order.status,
    quantity: order.quantity,
    saleValue: order.saleValue ? formatBrazilianCurrencyFromNumber(order.saleValue) : '',
    notes: order.notes ?? '',
    fabric: order.specs.fabric ?? '',
    foam: order.specs.foam ?? '',
    base: order.specs.base ?? '',
    hasPainting: order.specs.hasPainting ?? false,
    paintColor: order.specs.paintColor ?? '',
    paintFinish: order.specs.paintFinish ?? '',
    manufactureType: order.specs.manufactureType ?? MANUFACTURE_TYPES[0],
  }
}
