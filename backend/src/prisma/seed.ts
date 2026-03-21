/// <reference types="node" />
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'ioiobsant@gmail.com').trim().toLowerCase()
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)

type SeedOrder = {
  id: string
  category: string
  model: string
  productImageUrl: string
  size: string
  customer: {
    name: string
    whatsapp: string
    email: string
  }
  specs: {
    hasPainting: boolean
    paintColor?: string
    paintFinish?: string
    fabric?: string
    foam?: string
    base?: string
    manufactureType: 'Fabricação própria' | 'Reforma'
  }
  quantity: number
  saleValue: number
  deliveryDate: string
  status: string
  createdAt: string
}

const orders: SeedOrder[] = [
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

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

function normalizeEmail(email: string): string | null {
  const normalized = (email || '').trim().toLowerCase()
  return normalized || null
}

function splitName(name: string): { firstName: string; lastName: string } {
  const safe = (name || '').trim().replace(/\s+/g, ' ')
  if (!safe) {
    return { firstName: 'Cliente', lastName: 'Sem sobrenome' }
  }
  const [firstName, ...rest] = safe.split(' ')
  return {
    firstName,
    lastName: rest.join(' ') || 'Sem sobrenome',
  }
}

async function main() {
  const now = new Date().toISOString()
  const passwordHash =
    ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_HASH.length > 0
      ? ADMIN_PASSWORD_HASH
      : await bcrypt.hash('TempPassword1!', BCRYPT_SALT_ROUNDS)

  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      passwordHash,
      isActive: true,
      updatedAt: now,
    },
  })
  console.log('Admin único configurado:', admin.email)

  await prisma.order.deleteMany()
  await prisma.customer.deleteMany()

  for (const order of orders) {
    const now = new Date().toISOString()
    const phone = normalizePhone(order.customer.whatsapp)
    const email = normalizeEmail(order.customer.email)
    const { firstName, lastName } = splitName(order.customer.name)

    if (!phone && !email) {
      throw new Error(`Pedido ${order.id} sem email e celular do cliente.`)
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    })

    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName,
            lastName,
            phone: phone || existingCustomer.phone,
            email,
            updatedAt: now,
          },
        })
      : await prisma.customer.create({
          data: {
            firstName,
            lastName,
            phone: phone || `seed-${order.id}`,
            email,
            createdAt: now,
            updatedAt: now,
          },
        })

    await prisma.order.create({
      data: {
        id: order.id,
        category: order.category,
        model: order.model,
        productImageUrl: order.productImageUrl,
        size: order.size,
        customerId: customer.id,
        specs: order.specs as object,
        quantity: order.quantity,
        saleValue: order.saleValue,
        deliveryDate: order.deliveryDate,
        status: order.status,
        createdAt: order.createdAt,
      },
    })
  }

  console.log('Seed concluído: %d pedidos criados.', orders.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
