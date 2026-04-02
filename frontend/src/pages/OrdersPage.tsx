import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import BuildIcon from '@mui/icons-material/Build'
import WeekendIcon from '@mui/icons-material/Weekend'
import BedIcon from '@mui/icons-material/Bed'
import ChairIcon from '@mui/icons-material/Chair'
import DinnerDiningIcon from '@mui/icons-material/DinnerDining'
import KingBedIcon from '@mui/icons-material/KingBed'
import { ORDER_CATEGORIES, ORDER_STATUSES, MANUFACTURE_TYPES } from '../types/order'
import type { OrderCategory, OrderItem, OrderStatus } from '../types/order'
import { getOrdersWithDisplayDates } from '../data/mockOrders'
import { createInitialOrderForm, createOrderFormFromOrder, type NewOrderForm } from '../utils/orderFormHelpers'
import { formatBrazilianPhone } from '../utils/phone'
import { formatBrazilianCurrency, parseBrazilianCurrency } from '../utils/currency'
import * as ordersApi from '../api/orders'
import { pdf } from '@react-pdf/renderer'
import { OrdersPdfDocument, type OrdersPdfDocumentRow } from '../components/OrdersPdfDocument'

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

const ORDER_IMAGE_FALLBACK = '/genice-brandao-atelier-logo.png'

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

function parseISODateToLocalMidnight(isoDate: string): Date | null {
  // Esperado: 'YYYY-MM-DD' (valor do <TextField type="date" />)
  const parts = isoDate.split('-')
  if (parts.length !== 3) return null
  const [yRaw, mRaw, dRaw] = parts
  const y = Number(yRaw)
  const m = Number(mRaw)
  const d = Number(dRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  // m em JS é 0-indexado
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function isDeliveryDateOverdue(isoDate: string): boolean {
  const date = parseISODateToLocalMidnight(isoDate)
  if (!date) return false
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

interface OrdersTableProps {
  rows: OrderWithDisplay[]
  onViewDetails: (order: OrderWithDisplay) => void
  onEditOrder: (order: OrderWithDisplay) => void
  onRemoveOrder: (order: OrderWithDisplay) => void
}

function OrdersTable({ rows, onViewDetails, onEditOrder, onRemoveOrder }: OrdersTableProps) {
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const toggleRow = (id: string) => {
    setExpandedRowId((previous) => (previous === id ? null : id))
  }

  const actionButtonSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1.75,
    width: 32,
    height: 32,
    '&:hover': {
      borderColor: 'text.secondary',
      bgcolor: 'action.hover',
    },
  }

  /** Card expansível no estilo referência: "Imagem do produto" + atributos em lista vertical, sem cortar bordas */
  const renderExpandedDetails = (row: OrderWithDisplay) => (
    <Box
      sx={{
        px: 1.5,
        pb: 1.5,
        pt: 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          bgcolor: 'grey.50',
          borderRadius: 2,
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
          Imagem do produto
        </Typography>
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
            aspectRatio: '4 / 3',
            maxWidth: '100%',
          }}
        >
          <Box
            component="img"
            src={row.productImageUrl ?? ORDER_IMAGE_FALLBACK}
            alt={`Produto ${row.model}`}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.25 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Categoria
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {categoryIcons[row.category]}
              {row.category}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Modelo
            </Typography>
            <Typography variant="body2">{row.size ? `${row.model} (${row.size})` : row.model}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Material
            </Typography>
            <Typography variant="body2">{row.specs.fabric ?? 'Não informado'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Tipo de esponja
            </Typography>
            <Typography variant="body2">{row.specs.foam ?? 'Não informado'}</Typography>
          </Box>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={(e) => { e.stopPropagation(); onViewDetails(row); }}
        >
          Ver mais detalhes
        </Button>
        <Tooltip title="Editar pedido">
          <IconButton size="small" aria-label="Editar pedido" onClick={(e) => { e.stopPropagation(); onEditOrder(row); }} sx={actionButtonSx}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remover pedido">
          <IconButton
            size="small"
            aria-label="Remover pedido"
            onClick={(e) => { e.stopPropagation(); onRemoveOrder(row); }}
            sx={{ ...actionButtonSx, borderColor: 'error.light', color: 'error.main' }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  /** Vista mobile: lista de cards com âncora (chevron) para expandir, sem tabela e sem cortar layout */
  if (isCompact) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 72px', maxWidth: '100%' }}>Pedido</Typography>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '1 1 60px', minWidth: 0 }}>Cliente</Typography>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ flex: '0 0 88px', maxWidth: '100%' }}>Status</Typography>
          <Box sx={{ flex: '0 0 40px', maxWidth: '100%' }} aria-hidden />
        </Box>
        {rows.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum pedido encontrado com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((row) => {
              const isExpanded = expandedRowId === row.id
              return (
                <Fragment key={row.id}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => toggleRow(row.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(row.id); } }}
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
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: isDeliveryDateOverdue(row.deliveryDate) ? 'error.main' : 'text.secondary',
                          fontSize: '0.75rem',
                        }}
                      >
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
                      {renderExpandedDetails(row)}
                    </Box>
                  </Collapse>
                </Fragment>
              )
            })}
          </Box>
        )}
      </Paper>
    )
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Table size="medium" sx={{ minWidth: 880 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Pedido
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Cliente
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Produto
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Data de Entrega
            </TableCell>
            <TableCell sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Status
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Ações
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
                <TableCell sx={{ fontFamily: 'monospace', py: 1.25, fontSize: '0.8rem' }}>{row.id}</TableCell>
                <TableCell sx={{ py: 1.25, fontSize: '0.875rem' }}>{row.customer.name}</TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Box
                      component="img"
                      src={row.productImageUrl ?? ORDER_IMAGE_FALLBACK}
                      alt={`Produto ${row.model}`}
                      sx={{
                        width: 88,
                        height: 66,
                        objectFit: 'cover',
                        borderRadius: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ display: 'grid', gap: 0.25, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.size ? `${row.model} (${row.size})` : row.model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {categoryIcons[row.category]}
                        {row.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Material: {row.specs.fabric ?? 'Não informado'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.25, fontSize: '0.875rem' }}>
                  <Typography
                    component="span"
                    sx={{ color: isDeliveryDateOverdue(row.deliveryDate) ? 'error.main' : 'inherit' }}
                  >
                    {row.deliveryDateDisplay}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <Chip label={row.status} color={statusColors[row.status]} size="small" sx={{ fontWeight: 500, borderRadius: 2, fontSize: '0.8125rem' }} />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.25, whiteSpace: 'nowrap' }}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="Ver detalhes">
                      <IconButton size="small" aria-label="Ver detalhes do pedido" onClick={() => onViewDetails(row)} sx={actionButtonSx}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar pedido">
                      <IconButton size="small" aria-label="Editar pedido" onClick={() => onEditOrder(row)} sx={actionButtonSx}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover pedido">
                      <IconButton size="small" aria-label="Remover pedido" onClick={() => onRemoveOrder(row)} sx={{ ...actionButtonSx, borderColor: 'error.light', color: 'error.main' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true)
  const [ordersError, setOrdersError] = useState<string>('')
  const ordersWithDisplay = useMemo(() => getOrdersWithDisplayDates(orders), [orders])
  const [tab, setTab] = useState<number>(0)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchId, setSearchId] = useState<string>('')
  const [searchCustomer, setSearchCustomer] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatusValue>('')
  const [filterMaterial, setFilterMaterial] = useState<string>('')
  const [filterFoam, setFilterFoam] = useState<string>('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editOrderError, setEditOrderError] = useState<string>('')
  const [editOrderForm, setEditOrderForm] = useState<NewOrderForm>(() => createInitialOrderForm([]))
  const [editImageFileName, setEditImageFileName] = useState<string>('')
  const [orderPendingDelete, setOrderPendingDelete] = useState<OrderWithDisplay | null>(null)
  const [orderDetailView, setOrderDetailView] = useState<OrderWithDisplay | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(true)

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const data = await ordersApi.getOrders()
      setOrders(data)
    } catch (e) {
      setOrdersError(e instanceof Error ? e.message : 'Erro ao carregar pedidos.')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const orderIdFromUrl = searchParams.get('id')
  useEffect(() => {
    if (ordersLoading || !orderIdFromUrl || ordersWithDisplay.length === 0) return
    const order = ordersWithDisplay.find((o) => o.id.toUpperCase() === orderIdFromUrl.toUpperCase())
    if (order) setOrderDetailView(order)
  }, [ordersLoading, orderIdFromUrl, ordersWithDisplay])

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

  const filteredList = useMemo(() => {
    let list = [...filteredByCategory]
    const idQuery = searchId.trim().toUpperCase()
    if (idQuery) {
      list = list.filter((o) => o.id.toUpperCase().includes(idQuery))
    }
    const customerQuery = searchCustomer.trim().toLowerCase()
    if (customerQuery) {
      list = list.filter((o) =>
        (o.customer?.name ?? '').toLowerCase().includes(customerQuery)
      )
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
  }, [filteredByCategory, searchId, searchCustomer, filterStatus, filterMaterial, filterFoam, sortBy, sortOrder])

  const getStatusExportLabel = (): string => {
    if (!filterStatus) return 'Todos'
    if (filterStatus === 'flow-asc') return 'Orçamento → Entregue'
    if (filterStatus === 'flow-desc') return 'Entregue → Orçamento'
    return filterStatus
  }

  const getSortExportLabel = (): string => {
    if (filterStatus === 'flow-asc') return 'Por status: Orçamento → Entregue'
    if (filterStatus === 'flow-desc') return 'Por status: Entregue → Orçamento'

    const byLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy
    const orderLabel =
      sortBy === 'createdAt' || sortBy === 'deliveryDate'
        ? sortOrder === 'desc'
          ? 'Mais recente primeiro'
          : 'Mais antigo primeiro'
        : sortOrder === 'desc'
          ? 'Decrescente (Z→A)'
          : 'Crescente (A→Z)'

    return `${byLabel} (${orderLabel})`
  }

  const handleExportOrders = async () => {
    if (ordersLoading) return
    const rows = filteredList
    if (rows.length === 0) return

    const categoryLabel = categories[tab] ?? 'Todos'
    const statusLabel = getStatusExportLabel()
    const materialLabel = filterMaterial ? filterMaterial : 'Todos'
    const foamLabel = filterFoam ? filterFoam : 'Todos'
    const searchParts: string[] = []
    if (searchId.trim()) searchParts.push(`Busca por ID: ${searchId.trim()}`)
    if (searchCustomer.trim()) searchParts.push(`Busca por cliente: ${searchCustomer.trim()}`)
    const searchLabel = searchParts.length ? searchParts.join(' | ') : 'Sem busca'
    const sortLabel = getSortExportLabel()
    const generatedAt = new Date().toLocaleString('pt-BR')

    try {
      // Abre a aba imediatamente para evitar bloqueio de pop-up.
      // Usamos 'about:blank' para melhorar a compatibilidade e garantir uma referência válida ao `w`.
      const w = window.open('about:blank', '_blank')
      const pdfRows: OrdersPdfDocumentRow[] = rows.map((row) => ({
        ...row,
        deliveryDateDisplay: row.deliveryDateDisplay,
      }))
      const blob = await pdf(
        <OrdersPdfDocument
          rows={pdfRows}
          categoryLabel={categoryLabel}
          statusLabel={statusLabel}
          materialLabel={materialLabel}
          foamLabel={foamLabel}
          searchLabel={searchLabel}
          sortLabel={sortLabel}
          generatedAt={generatedAt}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      if (w && !w.closed) {
        // `replace` evita deixar histórico da página em branco.
        w.location.replace(url)
        w.focus?.()
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      alert(e instanceof Error ? `Erro ao exportar pedidos: ${e.message}` : 'Erro ao exportar pedidos.')
    }
  }

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value)
  }

  const handleOpenDetailView = (order: OrderWithDisplay) => {
    setOrderDetailView(order)
  }

  const handleCloseDetailView = () => {
    setOrderDetailView(null)
    if (searchParams.has('id')) {
      setSearchParams({}, { replace: true })
    }
  }

  const handleOpenEditDialog = (order: OrderWithDisplay) => {
    setEditingOrderId(order.id)
    setEditOrderError('')
    setEditOrderForm(createOrderFormFromOrder(order))
    setEditImageFileName('')
    setIsEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingOrderId(null)
    setEditOrderError('')
    setEditImageFileName('')
  }

  const handleEditOrderFieldChange = <K extends keyof NewOrderForm,>(field: K, value: NewOrderForm[K]) => {
    setEditOrderForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return
      }

      setEditOrderForm((prev) => ({ ...prev, productImageUrl: reader.result as string }))
      setEditImageFileName(file.name)
    }
    reader.readAsDataURL(file)

    // Allows selecting the same file again if needed.
    event.target.value = ''
  }

  const handleEditOrder = async () => {
    if (!editingOrderId) {
      return
    }

    const normalizedId = editOrderForm.id.trim().toUpperCase()

    const clientName = `${(editOrderForm.customerFirstName || '').trim()} ${(editOrderForm.customerLastName || '').trim()}`.trim()
    if (!normalizedId || !clientName || !editOrderForm.model.trim() || !editOrderForm.deliveryDate) {
      setEditOrderError('Preencha os campos obrigatórios: ID, nome e sobrenome do cliente, modelo e data de entrega.')
      return
    }

    if (
      orders.some(
        (order) => order.id.toUpperCase() === normalizedId && order.id.toUpperCase() !== editingOrderId.toUpperCase()
      )
    ) {
      setEditOrderError('Já existe um pedido com esse ID. Informe outro identificador.')
      return
    }

    const current = orders.find((o) => o.id === editingOrderId)
    if (!current) return

    const quantity = editOrderForm.quantity > 0 ? editOrderForm.quantity : 1
    const saleValue = parseBrazilianCurrency(editOrderForm.saleValue) || 0

    const updated: OrderItem = {
      ...current,
      id: normalizedId,
      category: editOrderForm.category,
      model: editOrderForm.model.trim(),
      productImageUrl: editOrderForm.productImageUrl.trim() || undefined,
      size: editOrderForm.size.trim() || undefined,
      quantity,
      saleValue,
      notes: editOrderForm.notes.trim() || undefined,
      customer: {
        ...current.customer,
        name: clientName,
        firstName: editOrderForm.customerFirstName.trim() || undefined,
        lastName: editOrderForm.customerLastName.trim() || undefined,
        email: (editOrderForm.customerEmail || '').trim() || '',
        whatsapp: (editOrderForm.customerContact || '').trim() || current.customer.whatsapp,
      },
      specs: {
        ...current.specs,
        fabric: editOrderForm.fabric.trim() || undefined,
        foam: editOrderForm.foam.trim() || undefined,
        base: editOrderForm.base.trim() || undefined,
        manufactureType: editOrderForm.manufactureType,
        hasPainting: editOrderForm.hasPainting,
        paintColor: editOrderForm.paintColor.trim() || undefined,
        paintFinish: editOrderForm.paintFinish.trim() || undefined,
      },
      deliveryDate: editOrderForm.deliveryDate,
      status: editOrderForm.status,
    }

    setEditOrderError('')
    try {
      const result = await ordersApi.updateOrder(editingOrderId, updated)
      setOrders((prev) =>
        prev.map((order) => (order.id === editingOrderId ? result : order))
      )
      setIsEditDialogOpen(false)
      setEditingOrderId(null)
    } catch (e) {
      setEditOrderError(e instanceof Error ? e.message : 'Erro ao atualizar pedido.')
    }
  }

  const handleOpenRemoveDialog = (order: OrderWithDisplay) => {
    setOrderPendingDelete(order)
  }

  const handleCloseRemoveDialog = () => {
    setOrderPendingDelete(null)
  }

  const handleRemoveOrder = async () => {
    if (!orderPendingDelete) {
      return
    }
    const idToRemove = orderPendingDelete.id
    setOrderPendingDelete(null)
    try {
      await ordersApi.deleteOrder(idToRemove)
      setOrders((prev) => prev.filter((order) => order.id !== idToRemove))
    } catch {
      setOrderPendingDelete(ordersWithDisplay.find((o) => o.id === idToRemove) ?? null)
    }
  }

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden', pb: { xs: 10, sm: 0 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row',
          gap: 2,
          mb: { xs: 2, md: 3 },
        }}
      >
        <Typography
          variant="h5"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Pedidos
        </Typography>
        <Button
          component={RouterLink}
          to="/pedidos/novo"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            borderRadius: 2,
            px: 2.5,
            whiteSpace: 'nowrap',
          }}
        >
          Novo pedido
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Listagem por categoria. Selecione uma aba e use os filtros para ordenar ou filtrar os pedidos.
        No desktop, a imagem do produto já aparece na linha do pedido. Em telas pequenas, toque no pedido para abrir os detalhes e ações.
      </Typography>

      {ordersError && (
        <Alert severity="error" onClose={() => setOrdersError('')} sx={{ mb: 2 }}>
          {ordersError}
        </Alert>
      )}

      {ordersLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
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
          touchAction: 'pan-x',
          '& .MuiTabs-scroller': {
            overflowX: 'auto !important',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          '& .MuiTabs-scroller::-webkit-scrollbar': {
            display: 'none',
          },
          '& .MuiTabs-flexContainer': {
            flexWrap: 'nowrap',
          },
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
          mb: 2,
          borderRadius: 3,
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        <Box
          onClick={() => setFiltersExpanded((prev) => !prev)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            borderBottom: filtersExpanded ? 1 : 0,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          role="button"
          aria-expanded={filtersExpanded}
          aria-controls="filters-content"
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
            Ordenar e filtrar
          </Typography>
          <IconButton size="small" aria-label={filtersExpanded ? 'Recolher filtros' : 'Expandir filtros'} sx={{ ml: 0.5 }}>
            {filtersExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={filtersExpanded}>
          <Box
            id="filters-content"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr 1fr',
              },
              gap: 2,
              alignItems: 'end',
              p: 2,
            }}
          >
            <TextField
              size="small"
              placeholder="Pesquisa por ID"
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
            <TextField
              size="small"
              placeholder="Pesquisa por cliente"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
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
            <TextField
              size="small"
              label="Tipo de esponja"
              placeholder="Ex.: D18"
              value={filterFoam}
              onChange={(e) => setFilterFoam(String(e.target.value ?? ''))}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputLabel-root': { color: 'text.secondary' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
              }}
              fullWidth
            />
          </Box>
        </Collapse>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, mb: 2, mt: 1 }}>
        <Button
          variant="outlined"
          onClick={handleExportOrders}
          disabled={filteredList.length === 0}
          sx={{ minWidth: { xs: '100%', sm: 260 } }}
        >
          Exportar pedidos
        </Button>
      </Box>

      <Fab
        component={RouterLink}
        to="/pedidos/novo"
        color="primary"
        variant="extended"
        aria-label="Novo pedido"
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          right: 16,
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          zIndex: (theme) => theme.zIndex.fab,
          borderRadius: 99,
          px: 2,
          boxShadow: 4,
        }}
      >
        <AddIcon sx={{ mr: 0.75 }} />
        Novo pedido
      </Fab>

      <Dialog open={isEditDialogOpen} onClose={handleCloseEditDialog} fullWidth maxWidth="md">
        <DialogTitle>Editar pedido</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Dados do cliente */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonIcon color="action" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>Dados do cliente</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="Nome *" size="small" value={editOrderForm.customerFirstName} onChange={(e) => handleEditOrderFieldChange('customerFirstName', e.target.value)} fullWidth />
                <TextField label="Sobrenome *" size="small" value={editOrderForm.customerLastName} onChange={(e) => handleEditOrderFieldChange('customerLastName', e.target.value)} fullWidth />
                <TextField label="Email (opcional)" type="email" size="small" value={editOrderForm.customerEmail} onChange={(e) => handleEditOrderFieldChange('customerEmail', e.target.value)} fullWidth />
                <TextField label="Contato (telefone/WhatsApp)" size="small" value={editOrderForm.customerContact} onChange={(e) => handleEditOrderFieldChange('customerContact', formatBrazilianPhone(e.target.value))} placeholder="(11) 99999-0000" inputProps={{ inputMode: 'numeric', maxLength: 16 }} fullWidth />
              </Box>
            </Box>

            <Divider />

            {/* Dados do pedido */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <DescriptionIcon color="action" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>Dados do pedido</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="ID do pedido *" size="small" value={editOrderForm.id} onChange={(e) => handleEditOrderFieldChange('id', e.target.value)} fullWidth />
                <FormControl size="small" fullWidth>
                  <InputLabel id="edit-order-category-label">Categoria</InputLabel>
                  <Select labelId="edit-order-category-label" label="Categoria" value={editOrderForm.category} onChange={(e) => handleEditOrderFieldChange('category', e.target.value as OrderCategory)}>
                    {ORDER_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Modelo *" size="small" value={editOrderForm.model} onChange={(e) => handleEditOrderFieldChange('model', e.target.value)} fullWidth />
                <TextField label="Medidas" size="small" value={editOrderForm.size} onChange={(e) => handleEditOrderFieldChange('size', e.target.value)} placeholder="Ex.: 138 x 188 cm ou L 138 x A 188 x P 90 cm" fullWidth />
                <FormControl size="small" fullWidth>
                  <InputLabel id="edit-order-status-label">Status</InputLabel>
                  <Select labelId="edit-order-status-label" label="Status" value={editOrderForm.status} onChange={(e) => handleEditOrderFieldChange('status', e.target.value as OrderStatus)}>
                    {ORDER_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Data de entrega *" type="date" size="small" value={editOrderForm.deliveryDate} onChange={(e) => handleEditOrderFieldChange('deliveryDate', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField label="Quantidade" type="number" size="small" value={editOrderForm.quantity} onChange={(e) => handleEditOrderFieldChange('quantity', e.target.value === '' ? 0 : Number(e.target.value))} inputProps={{ min: 1 }} fullWidth />
                <TextField label="Valor de venda" size="small" value={editOrderForm.saleValue} onChange={(e) => handleEditOrderFieldChange('saleValue', formatBrazilianCurrency(e.target.value))} placeholder="R$ 0" inputProps={{ inputMode: 'decimal', maxLength: 18 }} fullWidth />
              </Box>
            </Box>

            <Divider />

            {/* Imagem do produto */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Imagem do produto</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ width: 120, height: 120, borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden', bgcolor: 'action.hover', flexShrink: 0 }}>
                  <Box component="img" src={editOrderForm.productImageUrl || ORDER_IMAGE_FALLBACK} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />}>
                    Enviar outra imagem
                    <input hidden type="file" accept="image/*" onChange={handleEditImageUpload} />
                  </Button>
                  {editImageFileName && <Typography variant="caption" color="text.secondary">{editImageFileName}</Typography>}
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Especificações */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <BuildIcon color="action" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>Especificações</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="Material" size="small" value={editOrderForm.fabric} onChange={(e) => handleEditOrderFieldChange('fabric', e.target.value)} fullWidth />
                <TextField label="Tipo de esponja" size="small" value={editOrderForm.foam} onChange={(e) => handleEditOrderFieldChange('foam', e.target.value)} fullWidth />
                <TextField label="Base" size="small" value={editOrderForm.base} onChange={(e) => handleEditOrderFieldChange('base', e.target.value)} fullWidth />
                <FormControl size="small" fullWidth>
                  <InputLabel id="edit-manufacture-label">Tipo de fabricação</InputLabel>
                  <Select labelId="edit-manufacture-label" label="Tipo de fabricação" value={editOrderForm.manufactureType} onChange={(e) => handleEditOrderFieldChange('manufactureType', e.target.value as NewOrderForm['manufactureType'])}>
                    {MANUFACTURE_TYPES.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControlLabel control={<Switch checked={editOrderForm.hasPainting} onChange={(e) => handleEditOrderFieldChange('hasPainting', e.target.checked)} />} label="Possui pintura" sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }} />
                {editOrderForm.hasPainting && (
                  <>
                    <TextField label="Cor da pintura" size="small" value={editOrderForm.paintColor} onChange={(e) => handleEditOrderFieldChange('paintColor', e.target.value)} fullWidth />
                    <TextField label="Acabamento da pintura" size="small" value={editOrderForm.paintFinish} onChange={(e) => handleEditOrderFieldChange('paintFinish', e.target.value)} fullWidth />
                  </>
                )}
              </Box>
            </Box>
          </Box>
          {editOrderError && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{editOrderError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditOrder}>Salvar alterações</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(orderPendingDelete)} onClose={handleCloseRemoveDialog} fullWidth maxWidth="xs">
        <DialogTitle>Remover pedido</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {orderPendingDelete
              ? `Confirma a remoção do pedido ${orderPendingDelete.id} de ${orderPendingDelete.customer.name}?`
              : 'Confirma a remoção do pedido selecionado?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveDialog}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleRemoveOrder}>
            Remover pedido
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(orderDetailView)} onClose={handleCloseDetailView} fullWidth maxWidth="sm">
        <DialogTitle>Detalhes do pedido {orderDetailView?.id}</DialogTitle>
        <DialogContent dividers>
          {orderDetailView && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {isDeliveryDateOverdue(orderDetailView.deliveryDate) && (
                <Alert severity="error">
                  Este pedido está em atraso. Atualize a <strong>data de entrega</strong> para corrigir.
                </Alert>
              )}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Cliente
                </Typography>
                <Typography variant="body2"><strong>Nome:</strong> {orderDetailView.customer.name}</Typography>
                {(orderDetailView.customer as { email?: string }).email && (
                  <Typography variant="body2"><strong>Email:</strong> {(orderDetailView.customer as { email?: string }).email}</Typography>
                )}
                {orderDetailView.customer.whatsapp && (
                  <Typography variant="body2"><strong>Contato:</strong> {orderDetailView.customer.whatsapp}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Pedido
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Box sx={{ width: 100, height: 100, borderRadius: 1.5, overflow: 'hidden', border: 1, borderColor: 'divider', flexShrink: 0 }}>
                    <Box component="img" src={orderDetailView.productImageUrl ?? ORDER_IMAGE_FALLBACK} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                    <Typography variant="body2"><strong>ID:</strong> {orderDetailView.id}</Typography>
                    <Typography variant="body2"><strong>Categoria:</strong> {orderDetailView.category}</Typography>
                    <Typography variant="body2"><strong>Modelo:</strong> {orderDetailView.model}</Typography>
                    {orderDetailView.size && <Typography variant="body2"><strong>Medidas:</strong> {orderDetailView.size}</Typography>}
                    <Typography
                      variant="body2"
                      sx={{ color: isDeliveryDateOverdue(orderDetailView.deliveryDate) ? 'error.main' : 'inherit' }}
                    >
                      <strong>Data de entrega:</strong> {orderDetailView.deliveryDateDisplay}
                    </Typography>
                    <Typography variant="body2"><strong>Status:</strong> <Chip label={orderDetailView.status} color={statusColors[orderDetailView.status]} size="small" sx={{ height: 20, fontSize: '0.75rem' }} /></Typography>
                    <Typography variant="body2"><strong>Quantidade:</strong> {orderDetailView.quantity}</Typography>
                    <Typography variant="body2"><strong>Valor de venda:</strong> R$ {orderDetailView.saleValue.toLocaleString('pt-BR')}</Typography>
                    <Typography variant="body2"><strong>Data do pedido:</strong> {orderDetailView.createdAt}</Typography>
                    {orderDetailView.notes && <Typography variant="body2"><strong>Observações:</strong> {orderDetailView.notes}</Typography>}
                  </Box>
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Especificações
                </Typography>
                <Typography variant="body2"><strong>Material:</strong> {orderDetailView.specs.fabric ?? 'Não informado'}</Typography>
                <Typography variant="body2"><strong>Tipo de esponja:</strong> {orderDetailView.specs.foam ?? 'Não informado'}</Typography>
                <Typography variant="body2"><strong>Base:</strong> {orderDetailView.specs.base ?? 'Não informado'}</Typography>
                <Typography variant="body2"><strong>Tipo de fabricação:</strong> {orderDetailView.specs.manufactureType}</Typography>
                <Typography variant="body2"><strong>Possui pintura:</strong> {orderDetailView.specs.hasPainting ? 'Sim' : 'Não'}</Typography>
                {orderDetailView.specs.hasPainting && (
                  <>
                    <Typography variant="body2"><strong>Cor da pintura:</strong> {orderDetailView.specs.paintColor ?? '—'}</Typography>
                    <Typography variant="body2"><strong>Acabamento:</strong> {orderDetailView.specs.paintFinish ?? '—'}</Typography>
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailView}>Fechar</Button>
          {orderDetailView && (
            <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => { handleCloseDetailView(); handleOpenEditDialog(orderDetailView); }}>
              Editar pedido
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <OrdersTable rows={filteredList} onViewDetails={handleOpenDetailView} onEditOrder={handleOpenEditDialog} onRemoveOrder={handleOpenRemoveDialog} />
        </>
      )}
    </Box>
  )
}

export default OrdersPage
