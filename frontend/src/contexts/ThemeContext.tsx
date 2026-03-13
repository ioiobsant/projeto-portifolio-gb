import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { loadSettings, saveSettings, type ThemeMode } from '../utils/settings'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeContextProvider')
  return ctx
}

const baseThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
} as const

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => loadSettings().themeMode)

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    const settings = loadSettings()
    saveSettings({ ...settings, themeMode: newMode })
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      const settings = loadSettings()
      saveSettings({ ...settings, themeMode: next })
      return next
    })
  }, [])

  const theme = useMemo(
    () =>
      createTheme({
        ...baseThemeOptions,
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                background: { default: '#f5f5f5', paper: '#fff' },
                primary: { main: '#1a1a1a' },
                secondary: { main: '#5c5c5c' },
              }
            : {
                background: { default: '#121212', paper: '#1e1e1e' },
                primary: { main: '#e0e0e0' },
                secondary: { main: '#b0b0b0' },
              }),
        },
      }),
    [mode]
  )

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode])

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
