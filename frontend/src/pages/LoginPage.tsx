import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import { useAuth } from '../contexts/AuthContext'
import * as authApi from '../api/auth'
import { formatBrazilianPhone } from '../utils/phone'

type Mode = 'login' | 'register' | 'activate'

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')

  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')

  const [activationToken, setActivationToken] = useState('')
  const [devActivationToken, setDevActivationToken] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const resetAlerts = () => {
    setError('')
    setSuccess('')
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()
    setLoading(true)
    try {
      const ok = await login(loginValue.trim(), password)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Login ou senha incorretos.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()

    const email = registerEmail.trim()
    const phoneDigits = registerPhone.replace(/\D/g, '')

    if (!email && !phoneDigits) {
      setError('Informe email ou celular.')
      return
    }

    if (registerPassword.length < 8) {
      setError('A senha deve ter no minimo 8 caracteres.')
      return
    }

    if (registerPassword !== registerConfirm) {
      setError('As senhas nao coincidem.')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.register({
        ...(email ? { email } : { phone: registerPhone.trim() }),
        password: registerPassword,
      })

      setDevActivationToken(response.activationToken ?? null)
      setActivationToken(response.activationToken ?? '')
      setSuccess('Cadastro criado. Ative sua conta para fazer login.')
      setMode('activate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar conta.')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()

    if (!activationToken.trim()) {
      setError('Informe o token de ativacao.')
      return
    }

    setLoading(true)
    try {
      await authApi.activate(activationToken.trim())
      setSuccess('Conta ativada com sucesso. Agora faca login.')
      setMode('login')
      setLoginValue(registerEmail.trim() || registerPhone.trim())
      setPassword('')
      setActivationToken('')
      setDevActivationToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ativar conta.')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    resetAlerts()
    setMode('login')
    setDevActivationToken(null)
  }

  const goToRegister = () => {
    resetAlerts()
    setMode('register')
    setActivationToken('')
    setDevActivationToken(null)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          width: '100%',
          maxWidth: 420,
          boxShadow: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/genice-brandao-atelier-logo.png"
            alt="Genice Brandao Atelier"
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mb: 2 }}
          />
          <Typography variant="h5" fontWeight={600}>
            {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Ativar conta'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'login'
              ? 'Acesso ao painel administrativo'
              : mode === 'register'
                ? 'Cadastre email ou celular e defina sua senha'
                : 'Informe o token de ativacao para liberar o acesso'}
          </Typography>
        </Box>

        {mode === 'login' && (
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email ou celular"
              size="small"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              autoComplete="username"
              autoFocus
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
              Nao tem conta?{' '}
              <Link component="button" type="button" variant="body2" onClick={goToRegister} sx={{ cursor: 'pointer' }}>
                Cadastrar administrador
              </Link>
            </Typography>
          </Box>
        )}

        {mode === 'register' && (
          <Box component="form" onSubmit={handleRegisterSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              size="small"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              placeholder="ou use o celular abaixo"
              fullWidth
            />
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              ou
            </Typography>
            <TextField
              label="Celular (com DDD)"
              size="small"
              value={registerPhone}
              onChange={(e) => setRegisterPhone(formatBrazilianPhone(e.target.value))}
              placeholder="(11) 99999-0000"
              inputProps={{ inputMode: 'numeric', maxLength: 16 }}
              fullWidth
            />
            <TextField
              label="Senha (minimo 8 caracteres)"
              type="password"
              size="small"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirmar senha"
              type="password"
              size="small"
              value={registerConfirm}
              onChange={(e) => setRegisterConfirm(e.target.value)}
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar e receber token'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={goToLogin}>
              Voltar ao login
            </Button>
          </Box>
        )}

        {mode === 'activate' && (
          <Box component="form" onSubmit={handleActivateSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Token de ativacao"
              size="small"
              value={activationToken}
              onChange={(e) => setActivationToken(e.target.value)}
              placeholder="Cole o token recebido"
              fullWidth
              autoFocus
            />
            {devActivationToken && (
              <Alert severity="info">
                Em desenvolvimento: use o token <strong>{devActivationToken}</strong> (tambem no console do backend).
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Ativando...' : 'Ativar conta'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={goToRegister}>
              Voltar ao cadastro
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
