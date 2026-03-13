import { Fragment, useEffect, useState } from 'react'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  if (isMobile) {
    return (
      <Box sx={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
          Clientes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lista de clientes a partir dos pedidos. Toque na linha para expandir e ver pedidos.
        </Typography>

        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '1 1 80px', minWidth: 0 }}>Nome</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 100px', maxWidth: '100%' }}>Contato</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 72px', maxWidth: '100%' }}>Pedidos</Typography>
            <Box sx={{ flex: '0 0 40px' }} aria-hidden />
          </Box>
          {clients.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum cliente encontrado. Os clientes aparecem aqui a partir dos pedidos cadastrados.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {clients.map(({ customer, orderIds }) => {
                const rowKey = normalizePhone(customer.whatsapp) || `${customer.name}-${customer.email}`
                const isExpanded = expandedClient === rowKey
                return (
                  <Fragment key={rowKey}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setExpandedClient((c) => (c === rowKey ? null : rowKey))}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedClient((c) => (c === rowKey ? null : rowKey)); } }}
                      aria-expanded={isExpanded}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        px: 1.5,
                        py: 1.25,
                        border: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        font: 'inherit',
                        color: 'inherit',
                        boxSizing: 'border-box',
                        '&:last-of-type': { borderBottom: 0 },
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word', fontWeight: 500, fontSize: '0.875rem' }}>
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flex: '0 0 100px', maxWidth: '100%', fontSize: '0.75rem' }} noWrap>
                        {customer.whatsapp || customer.email || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flex: '0 0 72px', fontSize: '0.75rem' }}>
                        {orderIds.length} pedido{orderIds.length !== 1 ? 's' : ''}
                      </Typography>
                      <Box sx={{ width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }} aria-label={isExpanded ? 'Recolher' : 'Expandir'}>
                        {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                      </Box>
                    </Box>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', px: 1.5, pb: 1.5, pt: 0.5 }}>
                        <Paper variant="outlined" sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Email</Typography>
                              <Typography variant="body2">{customer.email || '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Contato</Typography>
                              <Typography variant="body2">{customer.whatsapp || '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Pedidos</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {orderIds.map((id) => (
                                  <Link key={id} component={RouterLink} to={`/pedidos?id=${encodeURIComponent(id)}`} sx={orderLinkSx}>
                                    {id}
                                  </Link>
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        </Paper>
                      </Box>
                    </Collapse>
                  </Fragment>
                )
              })}
            </Box>
          )}
        </Paper>
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
