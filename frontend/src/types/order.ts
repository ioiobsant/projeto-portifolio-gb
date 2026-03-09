export const ORDER_CATEGORIES = [
  'Cabeceira',
  'Cama',
  'Poltrona',
  'Sofá',
  'Cadeira de Jantar',
] as const

export type OrderCategory = (typeof ORDER_CATEGORIES)[number]

export const ORDER_STATUSES = [
  'Orçamento',
  'Em Produção',
  'Pronto',
  'Entregue',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface OrderCustomer {
  name: string
  whatsapp: string
  email: string
}

export interface OrderSpecs {
  hasPainting: boolean
  paintColor?: string
  paintFinish?: string
  fabric?: string
  foam?: string
  base?: string
  manufactureType: 'Fabricação própria' | 'Reforma'
}

export interface OrderItem {
  id: string
  category: OrderCategory
  model: string
  productImageUrl?: string
  size?: string
  customer: OrderCustomer
  specs: OrderSpecs
  quantity: number
  saleValue: number
  deliveryDate: string
  status: OrderStatus
  createdAt: string
  notes?: string
}

export interface DashboardStats {
  totalOrders: number
  inProduction: number
  readyForDelivery: number
  deliveredThisMonth: number
}
