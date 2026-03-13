import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import BusinessIcon from '@mui/icons-material/Business'
import DescriptionIcon from '@mui/icons-material/Description'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { loadSettings, saveSettings, type AppSettings } from '../utils/settings'
import { useThemeMode } from '../contexts/ThemeContext'

const APP_VERSION = '1.0.0'

export default function SettingsPage() {
  const { mode, setMode } = useThemeMode()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
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

        {/* Pedidos */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DescriptionIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Pedidos
          </Typography>
        </Box>
        <Box sx={gridSx}>
          <TextField
            label="Prefixo do ID do pedido"
            size="small"
            value={settings.orderIdPrefix}
            onChange={(e) => handleChange('orderIdPrefix', e.target.value)}
            placeholder="Ex.: GBA"
            helperText="Usado ao gerar novos IDs (ex.: GBA-123456). Apenas letras e números."
            fullWidth
            inputProps={{ maxLength: 12 }}
          />
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
