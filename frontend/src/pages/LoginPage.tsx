import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (login(username.trim(), password)) {
      navigate('/', { replace: true })
    } else {
      setError('Login ou senha incorretos.')
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
            Entrar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Acesso ao painel administrativo
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Login"
            size="small"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          <Button type="submit" variant="contained" size="medium" fullWidth sx={{ mt: 1 }}>
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
