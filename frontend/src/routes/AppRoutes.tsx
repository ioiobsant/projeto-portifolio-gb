import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import AdminLayout from '../layouts/AdminLayout.tsx'
import DashboardPage from '../pages/DashboardPage.tsx'
import OrdersPage from '../pages/OrdersPage.tsx'
import NewOrderPage from '../pages/NewOrderPage.tsx'
import ClientsPage from '../pages/ClientsPage.tsx'
import SettingsPage from '../pages/SettingsPage.tsx'
import LoginPage from '../pages/LoginPage.tsx'
import NotFoundPage from '../pages/NotFoundPage.tsx'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/pedidos/novo" element={<NewOrderPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/inicio" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRoutes
