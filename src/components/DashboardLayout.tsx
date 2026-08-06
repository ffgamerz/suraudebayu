import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import '../styles/Dashboard.css'

/**
 * Shared layout for all dashboard-style pages.
 * Provides the light sidebar, mobile hamburger header, overlay,
 * and main-content wrapper. The page-specific content goes in
 * `children`.
 *
 * The mobile title shown in the hamburger header is configurable
 * via the `mobileTitle` prop (defaults to "Surau De Bayu").
 */
const DashboardLayout = ({
  children,
  mobileTitle = 'Surau De Bayu',
}: {
  children: ReactNode
  mobileTitle?: string
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-app d-flex min-vh-100">
      {/* ===== Sidebar ===== */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* ===== Overlay (mobile) ===== */}
      <div
        className={`overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ===== Mobile Header (hamburger, <992px only) ===== */}
      <header className="mobile-header">
        <button
          className="btn btn-sm btn-outline-secondary menu-btn"
          type="button"
          onClick={() => setSidebarOpen(true)}
        >
          <i className="bi bi-list"></i>
        </button>
        <h1 className="h6 fw-semibold mb-0 text-dark">{mobileTitle}</h1>
      </header>

      {/* ===== Main Content ===== */}
      <main className="main-content flex-grow-1" style={{ minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout
