import { useEffect, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import BusinessIcon from '@mui/icons-material/Business'
import DescriptionIcon from '@mui/icons-material/Description'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import EmailIcon from '@mui/icons-material/Email'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { loadSettings, saveSettings, type AppSettings } from '../utils/settings'
import { useThemeMode } from '../contexts/ThemeContext'
import * as authApi from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

const APP_VERSION = '1.0.0'

const MONTH_INITIALS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const

export default function SettingsPage() {
  const { mode, setMode } = useThemeMode()
  const { user } = useAuth()
  const currentAdminId = user?.id
  const isAdminMaster = user?.email === 'ioiobsant@gmail.com'
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [admins, setAdmins] = useState<authApi.AdminListItem[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [deleteAdminLoadingId, setDeleteAdminLoadingId] = useState<string | null>(null)
  const [deleteAdminError, setDeleteAdminError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  useEffect(() => {
    let cancelled = false
    authApi.getAdmins().then((res) => {
      if (!cancelled) setAdmins(res.admins)
    }).catch(() => {
      if (!cancelled) setAdmins([])
    }).finally(() => {
      if (!cancelled) setAdminsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleChange = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null))
    setSaved(false)
  }

  const handleSave = () => {
    if (!settings) return
    saveSettings({ ...settings, themeMode: mode })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleThemeChange = (checked: boolean) => {
    const newMode = checked ? 'dark' : 'light'
    setMode(newMode)
    setSettings((prev) => (prev ? { ...prev, themeMode: newMode } : null))
    setSaved(false)
  }

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    const email = inviteEmail.trim()
    if (!email) {
      setInviteError('Digite o e-mail do novo administrador.')
      return
    }
    setInviteLoading(true)
    try {
      await authApi.inviteAdmin(email)
      setInviteSuccess(`Token de convite enviado para ${email}. O usuário deve acessar o link do e-mail, informar o token e cadastrar a senha.`)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!adminId) return

    const ok = window.confirm(`Excluir o admin "${adminEmail}"? Esta ação não pode ser desfeita.`)
    if (!ok) return

    setDeleteAdminError('')
    setDeleteAdminLoadingId(adminId)
    try {
      await authApi.deleteAdmin(adminId)
      setAdmins((prev) => prev.filter((a) => a.id !== adminId))
    } catch (err) {
      setDeleteAdminError(err instanceof Error ? err.message : 'Erro ao excluir admin.')
    } finally {
      setDeleteAdminLoadingId(null)
    }
  }

  if (!settings) {
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
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        Configurações
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Preferências do sistema. As alterações são salvas no navegador.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        {/* Geral */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BusinessIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Geral
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <TextField
            label="Nome do atelier / empresa"
            size="small"
            value={settings.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="Ex.: Genice Brandão Atelier"
            fullWidth
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Divider sx={{ my: 3 }} />

        {/* Emails de admin */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmailIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Emails de admin cadastrados
          </Typography>
        </Box>
        {adminsLoading ? (
          <Typography variant="body2" color="text.secondary">Carregando...</Typography>
        ) : admins.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nenhum email cadastrado.</Typography>
        ) : (
          <List dense disablePadding sx={{ mb: 2 }}>
            {admins.map((a) => (
              <ListItem
                key={a.id}
                disablePadding
                sx={{
                  py: 0.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <ListItemText
                  primary={a.email}
                  secondary={
                    a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : undefined
                  }
                />
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  disabled={a.email === 'ioiobsant@gmail.com' || deleteAdminLoadingId === a.id}
                  onClick={() => handleDeleteAdmin(a.id, a.email)}
                >
                  Excluir{a.id === currentAdminId ? ' (você)' : ''}
                </Button>
              </ListItem>
            ))}
          </List>
        )}
        {deleteAdminError && <Alert severity="error">{deleteAdminError}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 2 }}>
          <PersonAddIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Cadastrar um novo email de login
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleInviteSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="E-mail do novo administrador"
            type="email"
            size="small"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="exemplo@email.com"
            fullWidth
            sx={{ maxWidth: 360 }}
            disabled={!isAdminMaster}
          />
          {inviteError && <Alert severity="error">{inviteError}</Alert>}
          {inviteSuccess && <Alert severity="success">{inviteSuccess}</Alert>}
          {!isAdminMaster && (
            <Alert severity="info">
              Apenas o admin master pode cadastrar novos emails de login.
            </Alert>
          )}
          <Button type="submit" variant="outlined" size="medium" disabled={inviteLoading} sx={{ alignSelf: 'flex-start' }}>
            {inviteLoading ? 'Enviando...' : 'Enviar token de autenticação ao email'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Pedidos */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DescriptionIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Pedidos
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <InputLabel id="order-id-prefix-label">Prefixo do ID do pedido</InputLabel>
          <Select
            labelId="order-id-prefix-label"
            label="Prefixo do ID do pedido"
            size="small"
            value={settings.orderIdPrefix}
            onChange={(e) => handleChange('orderIdPrefix', e.target.value as AppSettings['orderIdPrefix'])}
            fullWidth
          >
            {MONTH_INITIALS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
          {/* Fica na mesma caixa do Select para manter o layout */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Usado ao gerar novos IDs (ex.: {settings.orderIdPrefix}-123456).
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Aparência */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {mode === 'dark' ? (
            <DarkModeIcon color="action" />
          ) : (
            <LightModeIcon color="action" />
          )}
          <Typography variant="subtitle1" fontWeight={600}>
            Aparência
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={(_, checked) => handleThemeChange(checked)}
                color="primary"
              />
            }
            label={mode === 'dark' ? 'Tema escuro' : 'Tema claro'}
          />
          <Typography variant="body2" color="text.secondary">
            Alteração aplicada na hora.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Sobre */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoOutlinedIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Sobre
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Versão {APP_VERSION}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
          <Button variant="contained" onClick={handleSave} disabled={saved}>
            {saved ? 'Salvo!' : 'Salvar alterações'}
          </Button>
          {saved && (
            <Typography variant="body2" color="success.main">
              Preferências salvas.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
