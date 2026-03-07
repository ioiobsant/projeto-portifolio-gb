import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'

function NotFoundPage() {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={600} color="text.secondary" gutterBottom>
        404
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Página não encontrada.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" color="primary">
        Voltar ao Dashboard
      </Button>
    </Box>
  )
}

export default NotFoundPage
