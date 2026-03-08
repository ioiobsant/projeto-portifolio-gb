import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/catalogo', label: 'Catalogo' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
]

function MainLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">Genice Brandao Atelier</p>
          <h1 className="app-title">Aplicacao base com React Router</h1>
        </div>

        <nav className="app-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
