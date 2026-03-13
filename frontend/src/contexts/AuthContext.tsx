import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { AUTH_TOKEN_KEY } from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (loginValue: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthContextProvider')
  return ctx
}

function readStored(): boolean {
  try {
    return !!sessionStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return false
  }
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readStored)

  const login = useCallback(async (loginValue: string, password: string): Promise<boolean> => {
    try {
      const { token } = await authApi.login(loginValue.trim(), password)
      sessionStorage.setItem(AUTH_TOKEN_KEY, token)
      setIsAuthenticated(true)
      return true
    } catch {
      // Acesso temporário em desenvolvimento: admin / admin
      if (loginValue.trim() === 'admin' && password === 'admin') {
        sessionStorage.setItem(AUTH_TOKEN_KEY, 'dev-admin')
        setIsAuthenticated(true)
        return true
      }
      return false
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    setIsAuthenticated(false)
  }, [])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY && e.newValue === null) setIsAuthenticated(false)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value: AuthContextValue = { isAuthenticated, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
