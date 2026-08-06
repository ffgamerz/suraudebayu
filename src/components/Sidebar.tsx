import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import '../styles/Dashboard.css'

const Sidebar = ({
  sidebarOpen,
}: {
  sidebarOpen?: boolean
}) => {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  /* Highlight the active link based on the current route */
  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* ===== Sidebar ===== */}
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
        <div className="brand px-4 mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="logo d-flex align-items-center justify-content-center">
              <i className="bi bi-mosque-fill fs-4 text-white"></i>
            </div>
            <span className="fs-5 fw-bold text-dark">Surau De Bayu</span>
          </div>
        </div>
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-1">
            <a
              href="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : 'text-dark'}`}
              aria-current={isActive('/dashboard') ? 'page' : undefined}
            >
              <i className="me-2 bi bi-speedometer2"></i> Dashboard
            </a>
          </li>
          <li className="nav-item mb-1">
            <a
              href="/ahli-kariah"
              className={`nav-link ${isActive('/ahli-kariah') ? 'active' : 'text-dark'}`}
              aria-current={isActive('/ahli-kariah') ? 'page' : undefined}
            >
              <i className="me-2 bi bi-person"></i> Ahli Kariah
            </a>
          </li>
          <li className="nav-item mb-1">
            <a
              href="/export"
              className={`nav-link ${isActive('/export') ? 'active' : 'text-dark'}`}
              aria-current={isActive('/export') ? 'page' : undefined}
            >
              <i className="me-2 bi bi-download"></i> Eksport Data
            </a>
          </li>
        </ul>
        <hr className="border-light" />
        <div className="dropdown" style={{ padding: '0 1.5rem 1.5rem' }}>
          <a
            href="#logout"
            className="d-flex align-items-center text-danger text-decoration-none"
            onClick={handleLogout}
            style={{ cursor: 'pointer' }}
          >
            <i className="me-2 bi bi-box-arrow-right"></i>
            <span>Log Keluar</span>
          </a>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
