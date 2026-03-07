import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function ClientsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Clientes
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Cadastro e histórico de clientes. (Em construção.)
      </Typography>
    </Box>
  )
}

export default ClientsPage
