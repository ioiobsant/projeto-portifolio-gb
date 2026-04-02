import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import * as authApi from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function ConvitePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { logout } = useAuth()
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token.trim()) {
      setError('Informe o token recebido por e-mail.')
      return
    }
    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.acceptInvite(token.trim(), newPassword)
      // Garante que o estado do frontend saia do admin anterior.
      await logout()
      setSuccess('Conta criada com sucesso. Faça login com seu email e a senha cadastrada.')
      const emailParam = response.email ? `?email=${encodeURIComponent(response.email)}` : ''
      setTimeout(() => navigate(`/login${emailParam}`, { replace: true }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar senha.')
    } finally {
      setLoading(false)
    }
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
            alt="Genice Brandão Atelier"
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mb: 2 }}
          />
          <Typography variant="h5" fontWeight={600}>
            Cadastrar senha de acesso
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Você foi convidado ao painel. Insira o token recebido por e-mail e defina sua senha.
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Token recebido por e-mail"
            size="small"
            value={token}
            onChange={(e) => setToken(e.target.value)}
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
            placeholder="Digite a senha novamente para confirmar"
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar senha'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            <Link component="button" type="button" variant="body2" onClick={() => navigate('/login')} sx={{ cursor: 'pointer' }}>
              Voltar ao login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
