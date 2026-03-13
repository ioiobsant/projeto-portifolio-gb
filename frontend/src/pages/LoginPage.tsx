import { useState, useEffect, type FormEvent } from 'react'
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

type Mode = 'login' | 'register-step1' | 'register-step2'

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerCode, setRegisterCode] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const ok = await login(loginValue.trim(), password)
      if (ok) navigate('/', { replace: true })
      else setError('Login ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRequest = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setDevCode(null)
    const email = registerEmail.trim()
    const phone = registerPhone.replace(/\D/g, '')
    if (!email && !phone) {
      setError('Informe o email ou o número de celular.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.requestRegisterCode(
        email ? { email } : { phone: registerPhone.trim() }
      )
      setDevCode(res.devCode ?? null)
      setMode('register-step2')
      setSuccess('Código enviado. Verifique seu email ou celular.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterConfirm = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (registerPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (registerPassword !== registerConfirm) {
      setError('As senhas não coincidem.')
      return
    }
    const email = registerEmail.trim()
    const phone = registerPhone.replace(/\D/g, '')
    setLoading(true)
    try {
      await authApi.confirmRegister({
        ...(email ? { email } : { phone: registerPhone.trim() }),
        token: registerCode.trim(),
        password: registerPassword,
      })
      setSuccess('Conta criada. Faça login com sua senha.')
      setLoginValue(email || registerPhone.trim())
      setPassword('')
      setMode('login')
      setRegisterCode('')
      setRegisterPassword('')
      setRegisterConfirm('')
      setDevCode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    setMode('login')
    setError('')
    setSuccess('')
    setDevCode(null)
  }

  const goToRegister = () => {
    setMode('register-step1')
    setRegisterEmail('')
    setRegisterPhone('')
    setRegisterCode('')
    setRegisterPassword('')
    setRegisterConfirm('')
    setError('')
    setSuccess('')
    setDevCode(null)
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
          maxWidth: 400,
          boxShadow: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/genice-brandao-atelier-logo.png"
            alt="Genice Brandão Atelier"
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mb: 2 }}
          />
          <Typography variant="h5" fontWeight={600}>
            {mode === 'login' ? 'Entrar' : 'Cadastrar administrador'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'login'
              ? 'Acesso ao painel administrativo'
              : mode === 'register-step1'
                ? 'Informe email ou celular para receber o código'
                : 'Digite o código recebido e defina sua senha'}
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
              Não tem conta?{' '}
              <Link component="button" type="button" variant="body2" onClick={goToRegister} sx={{ cursor: 'pointer' }}>
                Cadastrar administrador
              </Link>
            </Typography>
          </Box>
        )}

        {mode === 'register-step1' && (
          <Box component="form" onSubmit={handleRegisterRequest} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              — ou —
            </Typography>
            <TextField
              label="Celular (com DDD)"
              size="small"
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={goToLogin}>
              Voltar ao login
            </Button>
          </Box>
        )}

        {mode === 'register-step2' && (
          <Box component="form" onSubmit={handleRegisterConfirm} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Código de verificação (6 dígitos)"
              size="small"
              value={registerCode}
              onChange={(e) => setRegisterCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              fullWidth
              inputProps={{ maxLength: 6 }}
            />
            {devCode && (
              <Alert severity="info">
                Em desenvolvimento: use o código <strong>{devCode}</strong> (também no console do backend).
              </Alert>
            )}
            <TextField
              label="Senha (mín. 6 caracteres)"
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
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={() => setMode('register-step1')}>
              Voltar
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
