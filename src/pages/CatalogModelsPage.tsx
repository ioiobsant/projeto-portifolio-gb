import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

function CatalogModelsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Catálogo de Modelos
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Categorias: Cabeceiras, Camas, Poltronas, Sofás, Cadeira de Jantar. (Em construção.)
      </Typography>
    </Box>
  )
}

export default CatalogModelsPage
