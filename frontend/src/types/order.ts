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
  /** Nome (para futura lista de clientes) */
  firstName?: string
  /** Sobrenome (para futura lista de clientes) */
  lastName?: string
}

export const MANUFACTURE_TYPES = ['Fabricação própria', 'Reforma'] as const
export type ManufactureType = (typeof MANUFACTURE_TYPES)[number]

export interface OrderSpecs {
  hasPainting: boolean
  paintColor?: string
  paintFinish?: string
  fabric?: string
  foam?: string
  base?: string
  manufactureType: ManufactureType
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
