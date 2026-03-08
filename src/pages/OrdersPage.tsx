import { useState, useMemo } from 'react'
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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import WeekendIcon from '@mui/icons-material/Weekend'
import BedIcon from '@mui/icons-material/Bed'
import ChairIcon from '@mui/icons-material/Chair'
import DinnerDiningIcon from '@mui/icons-material/DinnerDining'
import KingBedIcon from '@mui/icons-material/KingBed'
import { ORDER_CATEGORIES, ORDER_STATUSES } from '../types/order'
import type { OrderCategory, OrderStatus } from '../types/order'
import { mockOrders, getOrdersWithDisplayDates } from '../data/mockOrders'

type OrderWithDisplay = ReturnType<typeof getOrdersWithDisplayDates>[number]

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

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Data do pedido' },
  { value: 'customer', label: 'Cliente' },
  { value: 'deliveryDate', label: 'Data de entrega' },
] as const

type SortBy = (typeof SORT_OPTIONS)[number]['value']

type FilterStatusValue = '' | OrderStatus | 'flow-asc' | 'flow-desc'

function compareOrders(
  a: OrderWithDisplay,
  b: OrderWithDisplay,
  sortBy: SortBy,
  order: 'asc' | 'desc'
): number {
  const mult = order === 'asc' ? 1 : -1
  switch (sortBy) {
    case 'createdAt':
      return mult * (a.createdAt.localeCompare(b.createdAt) || 0)
    case 'customer':
      return mult * (a.customer.name.localeCompare(b.customer.name, 'pt-BR') || 0)
    case 'deliveryDate':
      return mult * (a.deliveryDate.localeCompare(b.deliveryDate) || 0)
    default:
      return 0
  }
}

function compareByStatus(a: OrderWithDisplay, b: OrderWithDisplay, order: 'asc' | 'desc'): number {
  const indexA = ORDER_STATUSES.indexOf(a.status)
  const indexB = ORDER_STATUSES.indexOf(b.status)
  return order === 'asc' ? indexA - indexB : indexB - indexA
}

function OrdersTable({ rows }: { rows: OrderWithDisplay[] }) {
  return (
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
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              ID
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Cliente
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Categoria
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Modelo
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Data de Entrega
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Status
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Nenhum pedido encontrado com os filtros selecionados.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontFamily: 'monospace', py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {row.id}
                </TableCell>
                <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {row.customer.name}
                </TableCell>
                <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {categoryIcons[row.category]}
                    {row.category}
                  </Box>
                </TableCell>
                <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {row.size ? `${row.model} (${row.size})` : row.model}
                </TableCell>
                <TableCell sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {row.deliveryDateDisplay}
                </TableCell>
                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                  <Chip
                    label={row.status}
                    color={statusColors[row.status]}
                    size="small"
                    sx={{ fontWeight: 500, borderRadius: 2, fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const categories = ['Todos', ...ORDER_CATEGORIES] as const

function OrdersPage() {
  const ordersWithDisplay = useMemo(() => getOrdersWithDisplayDates(mockOrders), [])
  const [tab, setTab] = useState<number>(0)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchId, setSearchId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatusValue>('')
  const [filterMaterial, setFilterMaterial] = useState<string>('')
  const [filterFoam, setFilterFoam] = useState<string>('')

  const category = categories[tab]

  const filteredByCategory = useMemo(
    () =>
      category === 'Todos'
        ? [...ordersWithDisplay]
        : ordersWithDisplay.filter((o) => o.category === category),
    [ordersWithDisplay, category]
  )

  const uniqueMaterials = useMemo(
    () =>
      Array.from(
        new Set(filteredByCategory.map((o) => o.specs.fabric).filter(Boolean))
      ) as string[],
    [filteredByCategory]
  )

  const uniqueFoams = useMemo(
    () =>
      Array.from(
        new Set(filteredByCategory.map((o) => o.specs.foam).filter(Boolean))
      ) as string[],
    [filteredByCategory]
  )

  const filteredList = useMemo(() => {
    let list = [...filteredByCategory]
    const idQuery = searchId.trim().toUpperCase()
    if (idQuery) {
      list = list.filter((o) => o.id.toUpperCase().includes(idQuery))
    }
    if (ORDER_STATUSES.includes(filterStatus as OrderStatus)) {
      list = list.filter((o) => o.status === filterStatus)
    }
    if (filterMaterial) {
      list = list.filter((o) => (o.specs.fabric ?? '') === filterMaterial)
    }
    if (filterFoam) {
      list = list.filter((o) => (o.specs.foam ?? '') === filterFoam)
    }
    if (filterStatus === 'flow-asc' || filterStatus === 'flow-desc') {
      list.sort((a, b) => compareByStatus(a, b, filterStatus === 'flow-asc' ? 'asc' : 'desc'))
    } else {
      list.sort((a, b) => compareOrders(a, b, sortBy, sortOrder))
    }
    return list
  }, [filteredByCategory, searchId, filterStatus, filterMaterial, filterFoam, sortBy, sortOrder])

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value)
  }

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Typography
        variant="h5"
        fontWeight={600}
        color="text.primary"
        sx={{ mb: { xs: 2, md: 3 }, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
      >
        Pedidos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Listagem por categoria. Selecione uma aba e use os filtros para ordenar ou filtrar os pedidos.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v)
          setFilterStatus('')
          setFilterMaterial('')
          setFilterFoam('')
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
          minHeight: 48,
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab label="Todos" />
        {ORDER_CATEGORIES.map((cat) => (
          <Tab key={cat} label={cat} />
        ))}
      </Tabs>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: '#fafafa',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
          Ordenar e filtrar
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'minmax(180px, 1.2fr) minmax(140px, 1fr) minmax(120px, auto) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)',
            },
            gap: 2,
            alignItems: 'end',
          }}
        >
          <TextField
            size="small"
            placeholder="Pesquisa pelo ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="sort-by-label">Ordenar por</InputLabel>
            <Select
              labelId="sort-by-label"
              label="Ordenar por"
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value as SortBy)}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="sort-order-label" shrink>Ordem</InputLabel>
            <Select
              labelId="sort-order-label"
              label="Ordem"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="asc">
                {sortBy === 'createdAt' || sortBy === 'deliveryDate'
                  ? 'Mais antigo primeiro'
                  : 'Crescente (A→Z)'}
              </MenuItem>
              <MenuItem value="desc">
                {sortBy === 'createdAt' || sortBy === 'deliveryDate'
                  ? 'Mais recente primeiro'
                  : 'Decrescente (Z→A)'}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-status-label" shrink>Status</InputLabel>
            <Select
              labelId="filter-status-label"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus((e.target.value ?? '') as FilterStatusValue)}
              displayEmpty
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="flow-asc">Orçamento → Entregue</MenuItem>
              <MenuItem value="flow-desc">Entregue → Orçamento</MenuItem>
              {ORDER_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-material-label" shrink>Material</InputLabel>
            <Select
              labelId="filter-material-label"
              label="Material"
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(String(e.target.value ?? ''))}
              displayEmpty
            >
              <MenuItem value="">Todos</MenuItem>
              {uniqueMaterials.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-foam-label" shrink>Tipo de esponja</InputLabel>
            <Select
              labelId="filter-foam-label"
              label="Tipo de esponja"
              value={filterFoam}
              onChange={(e) => setFilterFoam(String(e.target.value ?? ''))}
              displayEmpty
            >
              <MenuItem value="">Todos</MenuItem>
              {uniqueFoams.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <OrdersTable rows={filteredList} />
    </Box>
  )
}

export default OrdersPage
