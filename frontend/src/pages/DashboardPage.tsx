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
import DescriptionIcon from '@mui/icons-material/Description'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WeekendIcon from '@mui/icons-material/Weekend'
import BedIcon from '@mui/icons-material/Bed'
import ChairIcon from '@mui/icons-material/Chair'
import DinnerDiningIcon from '@mui/icons-material/DinnerDining'
import KingBedIcon from '@mui/icons-material/KingBed'
import { mockDashboardStats, mockOrders, getOrdersWithDisplayDates } from '../data/mockOrders'
import type { OrderCategory, OrderStatus } from '../types/order'

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

function DashboardPage() {
  const stats = mockDashboardStats
  const ordersWithDisplay = getOrdersWithDisplayDates(mockOrders)

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Typography
        variant="h5"
        fontWeight={600}
        color="text.primary"
        sx={{ mb: { xs: 2, md: 3 }, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
      >
        Dashboard
      </Typography>

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
            bgcolor: '#fafafa',
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
            bgcolor: '#fafafa',
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
            bgcolor: '#fafafa',
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
            bgcolor: '#fafafa',
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
              ENTREGUES (MÊS)
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
        <Link href="#" underline="hover" variant="body2" sx={{ fontWeight: 500 }}>
          Ver Todos &gt;
        </Link>
      </Box>
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
            <TableRow sx={{ bgcolor: '#fafafa' }}>
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
    </Box>
  )
}

export default DashboardPage
