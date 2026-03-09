import type { OrderItem, DashboardStats } from '../types/order'

export const mockDashboardStats: DashboardStats = {
  totalOrders: 45,
  inProduction: 18,
  readyForDelivery: 7,
  deliveredThisMonth: 20,
}

export const mockOrders: OrderItem[] = [
  {
    id: 'GBA-2023-0101',
    category: 'Sofá',
    model: 'Chesterfield Imperial',
    productImageUrl: '/genice-brandao-atelier-logo.png',
    size: '3 Lugares (2.40m)',
    customer: {
      name: 'Juliana Costa',
      whatsapp: '(11) 99999-0001',
      email: 'juliana.costa@email.com',
    },
    specs: {
      hasPainting: false,
      fabric: 'Couro natural',
      foam: 'D28',
      base: 'Madeira maciça',
      manufactureType: 'Fabricação própria',
    },
    quantity: 1,
    saleValue: 18500,
    deliveryDate: '2026-03-06',
    status: 'Em Produção',
    createdAt: '2026-02-15',
  },
  {
    id: 'GBA-2023-0102',
    category: 'Cama',
    model: 'Paris',
    productImageUrl: '/genice-brandao-atelier-logo.png',
    size: 'King Size',
    customer: {
      name: 'Marcos Almeida',
      whatsapp: '(11) 99999-0002',
      email: 'marcos.almeida@email.com',
    },
    specs: {
      hasPainting: true,
      paintColor: 'Branco neve',
      paintFinish: 'Fosco',
      fabric: 'Linho',
      foam: 'D33',
      base: 'Estrutura box',
      manufactureType: 'Fabricação própria',
    },
    quantity: 1,
    saleValue: 12200,
    deliveryDate: '2026-03-04',
    status: 'Pronto',
    createdAt: '2026-02-10',
  },
  {
    id: 'GBA-2023-0103',
    category: 'Poltrona',
    model: 'Duda',
    productImageUrl: '/genice-brandao-atelier-logo.png',
    size: 'Padrão',
    customer: {
      name: 'Camila Fernandes',
      whatsapp: '(11) 99999-0003',
      email: 'camila.fernandes@email.com',
    },
    specs: {
      hasPainting: false,
      fabric: 'Veludo',
      foam: 'D24',
      base: 'Pés metálicos',
      manufactureType: 'Reforma',
    },
    quantity: 2,
    saleValue: 6800,
    deliveryDate: '2026-02-24',
    status: 'Entregue',
    createdAt: '2026-01-28',
  },
  {
    id: 'GBA-2023-0104',
    category: 'Cadeira de Jantar',
    model: 'Elegance',
    productImageUrl: '/genice-brandao-atelier-logo.png',
    size: 'Conjunto de 8',
    customer: {
      name: 'Arquitetura & Design (Roberto)',
      whatsapp: '(11) 99999-0004',
      email: 'roberto@arquitetura.com',
    },
    specs: {
      hasPainting: true,
      paintColor: 'Preto piano',
      paintFinish: 'Brilhante',
      fabric: 'Couro sintético',
      foam: 'D22',
      base: 'Madeira',
      manufactureType: 'Fabricação própria',
    },
    quantity: 8,
    saleValue: 24000,
    deliveryDate: '2026-03-06',
    status: 'Em Produção',
    createdAt: '2026-02-20',
  },
  {
    id: 'GBA-2023-0105',
    category: 'Cabeceira',
    model: 'Estofada Modular',
    productImageUrl: '/genice-brandao-atelier-logo.png',
    size: 'Sob Medida (3.00m x 1.20m)',
    customer: {
      name: 'Sandra Nogueira',
      whatsapp: '(11) 99999-0005',
      email: 'sandra.nogueira@email.com',
    },
    specs: {
      hasPainting: false,
      fabric: 'Sarja',
      foam: 'D26',
      base: 'MDF',
      manufactureType: 'Fabricação própria',
    },
    quantity: 1,
    saleValue: 9500,
    deliveryDate: '2026-03-06',
    status: 'Orçamento',
    createdAt: '2026-03-01',
  },
]

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function getOrdersWithDisplayDates(orders: OrderItem[]) {
  return orders.map((o) => ({
    ...o,
    deliveryDateDisplay: formatDisplayDate(o.deliveryDate),
  }))
}
