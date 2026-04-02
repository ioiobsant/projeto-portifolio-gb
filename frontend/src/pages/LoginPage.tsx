import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import { useAuth } from '../contexts/AuthContext'
import * as authApi from '../api/auth'

type Mode = 'login' | 'forgot' | 'reset'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const tokenFromUrl = searchParams.get('reset')
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl)
      setMode('reset')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const emailFromUrl = searchParams.get('email')
    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }
  }, [searchParams])

  const resetAlerts = () => {
    setError('')
    setSuccess('')
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()
    setLoading(true)
    try {
      const ok = await login(email.trim(), password)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Email ou senha incorretos.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()
    const emailToSend = forgotEmail.trim()
    if (!emailToSend) {
      setError('Digite o email cadastrado.')
      return
    }
    setLoading(true)
    try {
      await authApi.forgotPassword(emailToSend)
      setSuccess('Se o email estiver cadastrado, você receberá o token por e-mail. Insira o token abaixo e defina sua nova senha.')
      setMode('reset')
    } catch {
      setSuccess('Se o email estiver cadastrado, você receberá o token por e-mail. Insira o token abaixo e defina sua nova senha.')
      setMode('reset')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault()
    resetAlerts()

    if (!resetToken.trim()) {
      setError('Informe o token recebido por e-mail.')
      return
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(resetToken.trim(), newPassword)
      setSuccess('Senha alterada com sucesso. A partir de agora você pode entrar com seu email e nova senha.')
      setMode('login')
      setResetToken('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    resetAlerts()
    setMode('login')
  }

  const goToForgot = () => {
    resetAlerts()
    setMode('forgot')
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
            {mode === 'login' && 'Entrar'}
            {mode === 'forgot' && 'Enviar token de autenticação ao email cadastrado'}
            {mode === 'reset' && 'Redefinir senha'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {mode === 'login' && 'Acesso ao painel administrativo'}
            {mode === 'forgot' && 'Digite seu email para receber o token por e-mail'}
            {mode === 'reset' && 'Insira o token recebido por e-mail e defina a nova senha (com confirmação)'}
          </Typography>
        </Box>

        {mode === 'login' && (
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <Link component="button" type="button" variant="body2" onClick={goToForgot} sx={{ cursor: 'pointer' }}>
                Enviar token de autenticação ao email cadastrado
              </Link>
            </Typography>
          </Box>
        )}

        {mode === 'forgot' && (
          <Box component="form" onSubmit={handleForgotSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email cadastrado"
              type="email"
              size="small"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Digite seu email"
              fullWidth
              autoFocus
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar token de autenticação ao email cadastrado'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={goToLogin}>
              Voltar ao login
            </Button>
          </Box>
        )}

        {mode === 'reset' && (
          <Box component="form" onSubmit={handleResetSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Token recebido por e-mail"
              size="small"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Cole o token no espaço definido"
              fullWidth
              autoFocus
            />
            <TextField
              label="Nova senha"
              type="password"
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              fullWidth
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              size="small"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Digite a nova senha novamente para confirmar"
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Alterando...' : 'Redefinir senha'}
            </Button>
            <Button type="button" variant="text" size="small" fullWidth onClick={goToLogin}>
              Voltar ao login
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
