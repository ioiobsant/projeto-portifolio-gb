import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Link from '@mui/material/Link'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import type { OrderCustomer } from '../types/order'
import type { OrderItem } from '../types/order'
import * as ordersApi from '../api/orders'

/** Extrai só os dígitos do celular para comparar (ex.: (11) 99999-0003 → 11999990003) */
function normalizePhone(whatsapp: string | undefined): string {
  if (!whatsapp) return ''
  return whatsapp.replace(/\D/g, '')
}

/** Agrupa pedidos por cliente: mesmo número de celular = mesmo cliente (permite vários pedidos em andamento) */
function buildClientsFromOrders(orders: OrderItem[]): { customer: OrderCustomer; orderIds: string[] }[] {
  const map = new Map<string, { customer: OrderCustomer; orderIds: string[] }>()
  for (const order of orders) {
    const phone = normalizePhone(order.customer.whatsapp)
    const key = phone || `sem-celular|${order.customer.name || ''}|${order.customer.email || ''}`
    const existing = map.get(key)
    if (existing) {
      existing.orderIds.push(order.id)
    } else {
      map.set(key, {
        customer: order.customer,
        orderIds: [order.id],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'pt-BR'))
}

const orderLinkSx = {
  fontFamily: 'monospace',
  fontSize: '0.8125rem',
  display: 'inline-block',
  px: 1,
  py: 0.25,
  borderRadius: 1,
  bgcolor: 'action.hover',
  '&:hover': { bgcolor: 'action.selected' },
}

export default function ClientsPage() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  useEffect(() => {
    ordersApi
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar clientes.'))
      .finally(() => setLoading(false))
  }, [])

  const clients = buildClientsFromOrders(orders)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>Clientes</Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        Clientes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Lista de clientes a partir dos pedidos. Clique no ID do pedido para abrir os detalhes.
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
        <Table size="medium" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Contato</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Pedidos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Nenhum cliente encontrado. Os clientes aparecem aqui a partir dos pedidos cadastrados.
                </TableCell>
              </TableRow>
            ) : (
              clients.map(({ customer, orderIds }) => {
                const rowKey = normalizePhone(customer.whatsapp) || `${customer.name}-${customer.email}`
                const expanded = expandedClient === rowKey
                const hasMultiple = orderIds.length > 1
                return (
                  <TableRow key={rowKey} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5, fontWeight: 500 }}>{customer.name}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{customer.email || '—'}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{customer.whatsapp || '—'}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Link component={RouterLink} to={`/pedidos?id=${encodeURIComponent(orderIds[0])}`} sx={orderLinkSx}>
                            {orderIds[0]}
                          </Link>
                          {hasMultiple && (
                            <Button
                              size="small"
                              onClick={() => setExpandedClient((c) => (c === rowKey ? null : rowKey))}
                              sx={{ minWidth: 0, px: 0.75, fontSize: '0.875rem', color: 'text.secondary' }}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Recolher lista de pedidos' : `Mostrar mais ${orderIds.length - 1} pedido(s)`}
                            >
                              +{orderIds.length - 1}
                            </Button>
                          )}
                        </Box>
                        <Collapse in={expanded}>
                          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, listStyle: 'none' }}>
                            {orderIds.slice(1).map((id) => (
                              <Box component="li" key={id} sx={{ py: 0.25 }}>
                                <Link component={RouterLink} to={`/pedidos?id=${encodeURIComponent(id)}`} sx={orderLinkSx}>
                                  {id}
                                </Link>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
