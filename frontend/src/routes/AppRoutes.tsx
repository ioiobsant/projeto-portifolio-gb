import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.tsx'
import DashboardPage from '../pages/DashboardPage.tsx'
import OrdersPage from '../pages/OrdersPage.tsx'
import CatalogModelsPage from '../pages/CatalogModelsPage.tsx'
import ClientsPage from '../pages/ClientsPage.tsx'
import SettingsPage from '../pages/SettingsPage.tsx'
import NotFoundPage from '../pages/NotFoundPage.tsx'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/catalogo" element={<CatalogModelsPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
