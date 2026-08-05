import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
  const [email, setEmail] = useState('suraudebayu@gmail.com')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error: authError } = await signIn(email, password)
        if (authError) {
          setError(authError.message || 'Log masuk gagal')
        } else {
          navigate('/dashboard')
        }
      } else {
        const { error: authError } = await signUp(email, password)
        if (authError) {
          setError(authError.message || 'Pendaftaran gagal')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ralat tidak diketahui')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dashboard">
      <div className="card shadow-lg" style={{ width: '420px', border: 'none', borderRadius: '12px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <img
              src="/assets/surau-de-bayu-header.jpg"
              alt="Surau De Bayu"
              className="img-fluid rounded mb-3"
              style={{ maxHeight: '120px', objectFit: 'cover' }}
            />
            <h3 className="text-gradient mb-1">Dashboard Admin</h3>
            <p className="text-secondary small mb-0">Kariah Surau De Bayu</p>
          </div>

          {error && (
            <div className="alert alert-danger small mb-3" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label small text-muted">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="form-control form-control-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@contoh.com"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label small text-muted">
                Kata Laluan
              </label>
              <input
                type="password"
                id="password"
                className="form-control form-control-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="• • • • • • • •"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn w-100 mb-3"
              disabled={loading}
              style={{ backgroundColor: '#2563eb', color: 'white', border: 'none' }}
            >
              {loading
                ? 'Sedang memproses...'
                : isLogin
                  ? 'Log Masuk'
                  : 'Daftar Pengguna'}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? 'Belum ada akaun? Daftar di sini'
                  : 'Sudah ada akaun? Log masuk di sini'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
