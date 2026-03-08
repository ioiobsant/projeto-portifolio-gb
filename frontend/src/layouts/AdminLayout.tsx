import { useState } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DescriptionIcon from '@mui/icons-material/Description'
import WeekendIcon from '@mui/icons-material/Weekend'
import PeopleIcon from '@mui/icons-material/People'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'

const DRAWER_WIDTH = 260

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/pedidos', label: 'Pedidos', icon: <DescriptionIcon /> },
  { path: '/catalogo', label: 'Catálogo de Modelos', icon: <WeekendIcon /> },
  { path: '/clientes', label: 'Clientes', icon: <PeopleIcon /> },
  { path: '/configuracoes', label: 'Configurações', icon: <SettingsIcon /> },
]

const navLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/pedidos': 'Pedidos',
  '/catalogo': 'Catálogo de Modelos',
  '/clientes': 'Clientes',
  '/configuracoes': 'Configurações',
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return navLabels['/']
  for (const path of Object.keys(navLabels)) {
    if (path !== '/' && pathname.startsWith(path)) return navLabels[path]
  }
  return 'Genice Brandão Atelier'
}

function SidebarContent({
  onNavigate,
  onItemClick,
}: {
  onNavigate: (path: string) => void
  onItemClick?: () => void
}) {
  const location = useLocation()

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Box
          component="img"
          src="/genice-brandao-atelier-logo.png"
          alt="Genice Brandão Atelier"
          sx={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
        />
      </Box>
      <List sx={{ px: 1 }}>
        {navItems.map(({ path, label, icon }) => {
          const isActive =
            path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  onNavigate(path)
                  onItemClick?.()
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Box sx={{ flex: 1 }} />
      <List sx={{ px: 1, pb: 2 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={() => {}} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  )
}

function AdminLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleDrawerToggle = () => setMobileOpen((v) => !v)
  const handleNav = (path: string) => navigate(path)

  const drawer = (
    <SidebarContent
      onNavigate={handleNav}
      onItemClick={isDesktop ? undefined : handleDrawerToggle}
    />
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Mobile: AppBar + temporary drawer */}
      {!isDesktop && (
        <AppBar
          position="fixed"
          sx={{
            width: '100%',
            bgcolor: '#fff',
            color: 'text.primary',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56 } }}>
            <IconButton
              color="inherit"
              aria-label="abrir menu"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1.5 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="h1" fontWeight={600} sx={{ flex: 1 }}>
              {getPageTitle(location.pathname)}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fafafa',
            mt: isDesktop ? 0 : 0,
            pt: isDesktop ? 0 : 2,
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isDesktop ? undefined : '100%',
          p: { xs: 2, sm: 2.5, md: 3 },
          pt: { xs: 8, sm: 9, md: 3 },
          bgcolor: '#fff',
          minHeight: '100vh',
          borderTopLeftRadius: { xs: 0, md: 16 },
          borderBottomLeftRadius: { xs: 0, md: 16 },
          boxShadow: { xs: 'none', md: '-4px 0 24px rgba(0,0,0,0.04)' },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

export default AdminLayout
