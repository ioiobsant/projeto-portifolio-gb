import { useEffect, useState, type ChangeEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import BuildIcon from '@mui/icons-material/Build'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { ORDER_CATEGORIES, ORDER_STATUSES, MANUFACTURE_TYPES } from '../types/order'
import type { OrderCategory, OrderItem, OrderStatus } from '../types/order'
import {
  createInitialOrderForm,
  generateRandomOrderId,
  getTodayIsoDate,
  type NewOrderForm,
} from '../utils/orderFormHelpers'
import { loadSettings } from '../utils/settings'
import { formatBrazilianPhone } from '../utils/phone'
import { formatBrazilianCurrency, parseBrazilianCurrency } from '../utils/currency'
import * as ordersApi from '../api/orders'

const ORDER_IMAGE_FALLBACK = '/genice-brandao-atelier-logo.png'

function fullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim()
}

export default function NewOrderPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [form, setForm] = useState<NewOrderForm | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [customerLookupInfo, setCustomerLookupInfo] = useState('')
  const [customerLookupError, setCustomerLookupError] = useState('')
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false)

  useEffect(() => {
    const settings = loadSettings()
    ordersApi
      .getOrders()
      .then((data) => {
        setOrders(data)
        setForm(createInitialOrderForm(data, settings.orderIdPrefix))
      })
      .finally(() => setOrdersLoading(false))
  }, [])

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => (prev ? { ...prev, productImageUrl: reader.result as string } : null))
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleUseDefaultLogo = () => {
    setForm((prev) => (prev ? { ...prev, productImageUrl: '' } : null))
  }

  const handleFieldChange = <K extends keyof NewOrderForm>(field: K, value: NewOrderForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const handleGenerateNewId = () => {
    if (!form) return
    const prefix = loadSettings().orderIdPrefix
    setForm((prev) => (prev ? { ...prev, id: generateRandomOrderId(orders, prefix) } : null))
  }

  const handleCustomerLookup = async () => {
    if (!form) return

    const email = form.customerEmail.trim()
    const phone = form.customerContact.trim()
    const phoneDigits = phone.replace(/\D/g, '')

    if (!email && phoneDigits.length < 10) {
      setCustomerLookupInfo('')
      setCustomerLookupError('')
      return
    }

    setCustomerLookupLoading(true)
    setCustomerLookupError('')

    try {
      const result = await ordersApi.lookupCustomer({
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      })

      if (!result.found || !result.customer) {
        setCustomerLookupInfo('')
        return
      }

      setForm((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          customerFirstName: result.customer?.firstName || prev.customerFirstName,
          customerLastName: result.customer?.lastName || prev.customerLastName,
          customerEmail: result.customer?.email || prev.customerEmail,
          customerContact: result.customer?.whatsapp
            ? formatBrazilianPhone(result.customer.whatsapp)
            : prev.customerContact,
        }
      })

      setCustomerLookupInfo(
        `Cliente identificado: ${result.customer.firstName} ${result.customer.lastName}`
      )
    } catch (e) {
      setCustomerLookupInfo('')
      setCustomerLookupError(e instanceof Error ? e.message : 'Erro ao buscar cliente.')
    } finally {
      setCustomerLookupLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form) return
    const name = fullName(form.customerFirstName, form.customerLastName)
    const orderId = form.id.trim().toUpperCase()
    if (!orderId) {
      setSubmitError('Preencha o ID do pedido ou use "Gerar novo" para obter um ID automático.')
      return
    }
    if (!form.customerFirstName.trim() || !form.customerLastName.trim()) {
      setSubmitError('Preencha nome e sobrenome do cliente.')
      return
    }
    if (!form.customerContact.trim()) {
      setSubmitError('Preencha o celular (telefone/WhatsApp) do cliente.')
      return
    }
    if (!form.model.trim() || !form.deliveryDate) {
      setSubmitError('Preencha os campos obrigatórios: modelo e data de entrega.')
      return
    }
    if (orders.some((o) => o.id.toUpperCase() === orderId)) {
      setSubmitError('Já existe um pedido com esse ID. Altere o ID ou use "Gerar novo".')
      return
    }

    const quantity = form.quantity > 0 ? form.quantity : 1
    const saleValue = parseBrazilianCurrency(form.saleValue) || 0

    const orderToInsert: OrderItem = {
      id: orderId,
      category: form.category,
      model: form.model.trim(),
      productImageUrl: form.productImageUrl.trim() || undefined,
      size: form.size.trim() || undefined,
      customer: {
        name,
        whatsapp: form.customerContact.trim(),
        email: (form.customerEmail || '').trim() || '',
        firstName: form.customerFirstName.trim(),
        lastName: form.customerLastName.trim(),
      },
      specs: {
        hasPainting: form.hasPainting,
        paintColor: form.paintColor.trim() || undefined,
        paintFinish: form.paintFinish.trim() || undefined,
        fabric: form.fabric.trim() || undefined,
        foam: form.foam.trim() || undefined,
        base: form.base.trim() || undefined,
        manufactureType: form.manufactureType,
      },
      quantity,
      saleValue,
      deliveryDate: form.deliveryDate,
      status: form.status,
      createdAt: getTodayIsoDate(),
      notes: form.notes.trim() || undefined,
    }

    setSubmitError('')
    setSubmitting(true)
    try {
      await ordersApi.createOrder(orderToInsert)
      navigate('/pedidos')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao criar pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  if (ordersLoading || !form) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Carregando...</Typography>
      </Box>
    )
  }

  const gridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: 2,
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Button
        component={RouterLink}
        to="/pedidos"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        Voltar aos pedidos
      </Button>

      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Novo pedido
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        {/* Dados do cliente */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PersonIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Dados do cliente
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <TextField
            label="Nome *"
            size="small"
            value={form.customerFirstName}
            onChange={(e) => handleFieldChange('customerFirstName', e.target.value)}
            placeholder="Ex.: Maria"
            fullWidth
          />
          <TextField
            label="Sobrenome *"
            size="small"
            value={form.customerLastName}
            onChange={(e) => handleFieldChange('customerLastName', e.target.value)}
            placeholder="Ex.: Silva"
            fullWidth
          />
          <TextField
            label="Email (opcional)"
            type="email"
            size="small"
            value={form.customerEmail}
            onChange={(e) => {
              setCustomerLookupInfo('')
              setCustomerLookupError('')
              handleFieldChange('customerEmail', e.target.value)
            }}
            onBlur={handleCustomerLookup}
            fullWidth
          />
          <TextField
            label="Contato (telefone/WhatsApp) *"
            size="small"
            value={form.customerContact}
            onChange={(e) => {
              setCustomerLookupInfo('')
              setCustomerLookupError('')
              handleFieldChange('customerContact', formatBrazilianPhone(e.target.value))
            }}
            onBlur={handleCustomerLookup}
            placeholder="Ex.: (11) 99999-0000"
            inputProps={{ inputMode: 'numeric', maxLength: 16 }}
            fullWidth
          />
        </Box>

        {(customerLookupLoading || customerLookupInfo || customerLookupError) && (
          <Box sx={{ mt: 1 }}>
            {customerLookupLoading && (
              <Typography variant="body2" color="text.secondary">
                Buscando cliente cadastrado...
              </Typography>
            )}
            {!customerLookupLoading && customerLookupInfo && !customerLookupError && (
              <Typography variant="body2" color="success.main">
                {customerLookupInfo}
              </Typography>
            )}
            {!customerLookupLoading && customerLookupError && (
              <Typography variant="body2" color="error.main">
                {customerLookupError}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Dados do pedido */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DescriptionIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Dados do pedido
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                label="ID do pedido *"
                size="small"
                value={form.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                helperText="Gerado automaticamente (ex.: GBA-123456). Você pode alterar se desejar."
                sx={{ flex: 1 }}
              />
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={handleGenerateNewId}
                sx={{ mt: 0.5, flexShrink: 0 }}
              >
                Gerar novo
              </Button>
            </Box>
          </Box>
          <FormControl size="small" fullWidth>
            <InputLabel id="new-category-label">Categoria</InputLabel>
            <Select
              labelId="new-category-label"
              label="Categoria"
              value={form.category}
              onChange={(e) => handleFieldChange('category', e.target.value as OrderCategory)}
            >
              {ORDER_CATEGORIES.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Modelo *"
            size="small"
            value={form.model}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            fullWidth
          />
          <TextField
            label="Medidas"
            size="small"
            value={form.size}
            onChange={(e) => handleFieldChange('size', e.target.value)}
            placeholder="Ex.: 138 x 188 cm ou L 138 x A 188 x P 90 cm"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="new-status-label">Status</InputLabel>
            <Select
              labelId="new-status-label"
              label="Status"
              value={form.status}
              onChange={(e) => handleFieldChange('status', e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Data de entrega *"
            type="date"
            size="small"
            value={form.deliveryDate}
            onChange={(e) => handleFieldChange('deliveryDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Quantidade"
            type="number"
            size="small"
            value={form.quantity}
            onChange={(e) => handleFieldChange('quantity', e.target.value === '' ? 0 : Number(e.target.value))}
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField
            label="Valor de venda"
            size="small"
            value={form.saleValue}
            onChange={(e) => handleFieldChange('saleValue', formatBrazilianCurrency(e.target.value))}
            placeholder="R$ 0"
            inputProps={{ inputMode: 'decimal', maxLength: 18 }}
            fullWidth
          />
        </Box>

        {/* Imagem do produto - padrão: logo */}
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Imagem do produto
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Por padrão é exibida a logo. Envie outra imagem para substituir.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={form.productImageUrl || ORDER_IMAGE_FALLBACK}
                alt="Preview do produto"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
              >
                Enviar imagem
                <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
              </Button>
              <Button variant="outlined" size="small" onClick={handleUseDefaultLogo}>
                Usar logo padrão
              </Button>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Especificações */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BuildIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Especificações
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <TextField
            label="Material"
            size="small"
            value={form.fabric}
            onChange={(e) => handleFieldChange('fabric', e.target.value)}
            fullWidth
          />
          <TextField
            label="Tipo de esponja"
            size="small"
            value={form.foam}
            onChange={(e) => handleFieldChange('foam', e.target.value)}
            fullWidth
          />
          <TextField
            label="Base"
            size="small"
            value={form.base}
            onChange={(e) => handleFieldChange('base', e.target.value)}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="new-manufacture-label">Tipo de fabricação</InputLabel>
            <Select
              labelId="new-manufacture-label"
              label="Tipo de fabricação"
              value={form.manufactureType}
              onChange={(e) => handleFieldChange('manufactureType', e.target.value as NewOrderForm['manufactureType'])}
            >
              {MANUFACTURE_TYPES.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={form.hasPainting}
                onChange={(e) => handleFieldChange('hasPainting', e.target.checked)}
              />
            }
            label="Possui pintura"
            sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}
          />
          {form.hasPainting && (
            <>
              <TextField
                label="Cor da pintura"
                size="small"
                value={form.paintColor}
                onChange={(e) => handleFieldChange('paintColor', e.target.value)}
                fullWidth
              />
              <TextField
                label="Acabamento da pintura"
                size="small"
                value={form.paintFinish}
                onChange={(e) => handleFieldChange('paintFinish', e.target.value)}
                placeholder="Ex.: Fosco, Brilhante"
                fullWidth
              />
            </>
          )}
        </Box>

        {submitError && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {submitError}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button component={RouterLink} to="/pedidos">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar pedido'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
