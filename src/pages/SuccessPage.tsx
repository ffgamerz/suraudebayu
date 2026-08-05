import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SuccessPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/')
    }, 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="container text-center text-white">
      <div className="form-container mx-auto">
        <div className="form-card card py-5">
          <div className="card-body">
            {/* Success Icon */}
            <div className="mb-4">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#4ade80"/>
              </svg>
            </div>
            <h2 className="text-gradient fw-bold mb-3">Pendaftaran Berjaya!</h2>
            <p className="text-muted mb-2">
              Terima kasih kerana mendaftar sebagai ahli kariah Surau De Bayu.
            </p>
            <p className="text-muted small">
              Anda akan dialihkan kembali ke borang pendaftaran dalam 5 saat...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
