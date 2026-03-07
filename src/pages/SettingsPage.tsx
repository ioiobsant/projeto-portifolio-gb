import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function SettingsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Configurações
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Preferências do sistema. (Em construção.)
      </Typography>
    </Box>
  )
}

export default SettingsPage
