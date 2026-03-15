import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { AuthUser } from '../api/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  isBootstrapping: boolean
  user: AuthUser | null
  login: (loginValue: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthContextProvider')
  return ctx
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me()
      setUser(response.user)
    } catch {
      setUser(null)
    }
  }, [])

  const login = useCallback(async (loginValue: string, password: string): Promise<boolean> => {
    try {
      await authApi.login(loginValue.trim(), password)
      const response = await authApi.me()
      setUser(response.user)
      return true
    } catch {
      setUser(null)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const response = await authApi.me()
        if (!cancelled) setUser(response.user)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsBootstrapping(false)
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      isAuthenticated: !!user,
      isBootstrapping,
      user,
      login,
      logout,
      refreshUser,
    }
  }, [isBootstrapping, login, logout, refreshUser, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
