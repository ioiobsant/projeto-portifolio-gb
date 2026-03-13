import { Fragment, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import DescriptionIcon from '@mui/icons-material/Description'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WeekendIcon from '@mui/icons-material/Weekend'
import BedIcon from '@mui/icons-material/Bed'
import ChairIcon from '@mui/icons-material/Chair'
import DinnerDiningIcon from '@mui/icons-material/DinnerDining'
import KingBedIcon from '@mui/icons-material/KingBed'
import { Link as RouterLink } from 'react-router-dom'
import { getOrdersWithDisplayDates } from '../data/mockOrders'
import type { OrderCategory, OrderItem, OrderStatus } from '../types/order'
import type { DashboardStats } from '../types/order'
import * as ordersApi from '../api/orders'
import { loadSettings } from '../utils/settings'

const categoryIcons: Record<OrderCategory, React.ReactNode> = {
  Sofá: <WeekendIcon fontSize="small" />,
  Cama: <BedIcon fontSize="small" />,
  Poltrona: <ChairIcon fontSize="small" />,
  'Cadeira de Jantar': <DinnerDiningIcon fontSize="small" />,
  Cabeceira: <KingBedIcon fontSize="small" />,
}

const statusColors: Record<OrderStatus, 'default' | 'warning' | 'success' | 'info'> = {
  Orçamento: 'default',
  'Em Produção': 'warning',
  Pronto: 'success',
  Entregue: 'info',
}

function computeStatsFromOrders(orders: { status: string; deliveryDate: string }[]): DashboardStats {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    totalOrders: orders.length,
    inProduction: orders.filter((o) => o.status === 'Em Produção').length,
    readyForDelivery: orders.filter((o) => o.status === 'Pronto').length,
    deliveredThisMonth: orders.filter(
      (o) => o.status === 'Entregue' && o.deliveryDate.startsWith(yearMonth)
    ).length,
  }
}

function DashboardPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ordersApi
      .getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = computeStatsFromOrders(orders)
  const ordersWithDisplay = getOrdersWithDisplayDates(orders)
  const { businessName } = loadSettings()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: '100%' }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>Dashboard</Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mb: { xs: 2, md: 3 } }}>
        <Typography
          variant="h5"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Dashboard
        </Typography>
        {businessName && (
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
            {businessName}
          </Typography>
        )}
      </Box>

      <Typography
        variant="h6"
        fontWeight={600}
        color="text.primary"
        sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        Resumo
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, md: 2 },
          mb: { xs: 3, md: 4 },
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ color: 'text.secondary', flexShrink: 0 }}>
            <DescriptionIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              TOTAL DE PEDIDOS
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {stats.totalOrders}
            </Typography>
          </Box>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ color: '#ed6c02', flexShrink: 0 }}>
            <ScheduleIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              EM PRODUÇÃO
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {stats.inProduction}
            </Typography>
          </Box>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ color: '#2e7d32', flexShrink: 0 }}>
            <CheckCircleIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              PRONTOS PARA ENTREGA
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {stats.readyForDelivery}
            </Typography>
          </Box>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ color: '#0288d1', flexShrink: 0 }}>
            <LocalShippingIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              ENTREGUES 
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {stats.deliveredThisMonth}
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Pedidos Recentes
        </Typography>
        <Link component={RouterLink} to="/pedidos" underline="hover" variant="body2" sx={{ fontWeight: 500 }}>
          Ver Todos &gt;
        </Link>
      </Box>

      {isMobile ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 72px', maxWidth: '100%' }}>Pedido</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '1 1 60px', minWidth: 0 }}>Cliente</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 88px', maxWidth: '100%' }}>Status</Typography>
            <Box sx={{ flex: '0 0 40px' }} aria-hidden />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {ordersWithDisplay.map((row) => {
              const isExpanded = expandedOrderId === row.id
              return (
                <Fragment key={row.id}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setExpandedOrderId((id) => (id === row.id ? null : row.id))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedOrderId((id) => (id === row.id ? null : row.id)); } }}
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
                    <Box sx={{ minWidth: 72, flexShrink: 0 }}>
                      <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                        {row.id}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem' }}>
                        Entrega: {row.deliveryDateDisplay}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word', fontSize: '0.875rem' }}>
                      {row.customer.name}
                    </Typography>
                    <Chip
                      label={row.status}
                      color={statusColors[row.status]}
                      size="small"
                      sx={{ fontWeight: 600, borderRadius: 2, fontSize: '0.75rem', flexShrink: 0 }}
                    />
                    <Box sx={{ width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }} aria-label={isExpanded ? 'Recolher' : 'Expandir'}>
                      {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </Box>
                  </Box>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                      <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
                        <Paper variant="outlined" sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Categoria</Typography>
                              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {categoryIcons[row.category]}
                                {row.category}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Modelo</Typography>
                              <Typography variant="body2">{row.size ? `${row.model} (${row.size})` : row.model}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Data de entrega</Typography>
                              <Typography variant="body2">{row.deliveryDateDisplay}</Typography>
                            </Box>
                          </Box>
                          <Button component={RouterLink} to={`/pedidos?id=${encodeURIComponent(row.id)}`} size="small" variant="outlined" sx={{ mt: 1.5 }}>
                            Ver pedido
                          </Button>
                        </Paper>
                      </Box>
                    </Box>
                  </Collapse>
                </Fragment>
              )
            })}
          </Box>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflowX: 'auto',
            '-webkit-overflow-scrolling': 'touch',
          }}
        >
          <Table size="medium" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Modelo</TableCell>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Data de Entrega</TableCell>
                <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordersWithDisplay.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{row.id}</TableCell>
                  <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{row.customer.name}</TableCell>
                  <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {categoryIcons[row.category]}
                      {row.category}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {row.size ? `${row.model} (${row.size})` : row.model}
                  </TableCell>
                  <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{row.deliveryDateDisplay}</TableCell>
                  <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                    <Chip
                      label={row.status}
                      color={statusColors[row.status]}
                      size="small"
                      sx={{ fontWeight: 500, borderRadius: 2, fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

export default DashboardPage
