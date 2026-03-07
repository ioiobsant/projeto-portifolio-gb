import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function OrdersPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Pedidos
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Listagem completa de pedidos com filtros e pesquisa por ID. (Em construção.)
      </Typography>
    </Box>
  )
}

export default OrdersPage
