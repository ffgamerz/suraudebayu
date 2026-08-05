import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import '../styles/Dashboard.css'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

const BLOCK_LABELS: Record<string, string> = {
  DB01: 'Blok 1',
  DB02: 'Blok 2',
  DB03: 'Blok 3',
}

const Dashboard = () => {
  const { signOut } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [search, setSearch] = useState('')
  const [filterBlock, setFilterBlock] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const sortKey = 'created_at' as const
  const sortOrder: 'asc' | 'desc' = 'desc'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('kariah_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setRegistrations(data || [])
    } catch (err) {
      setError((err as any)?.message || 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const result = registrations.filter((r) => {
      if (search && !r.nama_pemohon?.toLowerCase().includes(search.toLowerCase())
                  && !r.no_kad_pengenalan?.includes(search)
                  && !r.no_unit?.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (filterBlock && !r.no_unit?.startsWith(filterBlock)) return false
      if (filterOwner && r.status_pemilikan !== filterOwner) return false
      const rowDate = new Date(r.created_at)
      if (dateFrom && rowDate < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setDate(to.getDate() + 1)
        if (rowDate >= to) return false
      }
      return true
    })

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return (sortOrder as 'asc' | 'desc') === 'asc' ? cmp : -cmp
    })

    return result
  }, [registrations, search, filterBlock, filterOwner, dateFrom, dateTo, sortKey, sortOrder])

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)

  const stats = useMemo(() => {
    const blockCounts: Record<string, number> = {}
    const ownerCounts: Record<string, number> = {}
    registrations.forEach((r) => {
      const block = r.no_unit?.split('-')[0] || 'Unknown'
      blockCounts[block] = (blockCounts[block] || 0) + 1
      const owner = r.status_pemilikan || 'Unknown'
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1
    })

    return {
      total: registrations.length,
      blocks: Object.entries(blockCounts).map(([k, v]) => ({
        label: BLOCK_LABELS[k] || k,
        count: v,
      })),
      owners: Object.entries(ownerCounts).map(([k, v]) => ({
        label: k,
        count: v,
      })),
      today: filtered.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
    }
  }, [registrations, filtered])

  const exportCSV = () => {
    const headers = ['No', 'Nama Pemohon', 'No. Kad Pengenalan', 'Alamat', 'No Unit',
      'Pemilik', 'No H/P', 'Email', 'Perkahwinan', 'Tempoh', 'Isi Rumah', 'Tarikh']
    const csvRows = [
      headers.join(','),
      ...filtered.map((r, i) => [
        startIndex + i + 1,
        `"${r.nama_pemohon}"`,
        r.no_kad_pengenalan,
        `"${r.alamat_dalam_kad_pengenalan}"`,
        r.no_unit,
        r.status_pemilikan,
        r.no_hp,
        r.email || '',
        r.status_perkahwinan,
        r.tempoh_masa_menetap,
        r.bilangan_isi_rumah,
        new Date(r.created_at).toLocaleDateString('ms-MY'),
      ].join(','))
    ]
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kariah_suraudebayu_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const clearAllFilters = () => {
    setSearch('')
    setFilterBlock('')
    setFilterOwner('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  return (
    <div className="dashboard-app d-flex min-vh-100">
      {/* ===== Sidebar ===== */}
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
        <div className="brand px-4 mb-3">
          <span className="fs-4 fw-bold text-white">Surau De Bayu</span>
        </div>
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-1">
            <a href="#dashboard" className="nav-link active" aria-current="page">
              <i className="me-2 bi bi-speedometer2"></i> Dashboard
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#ahli" className="nav-link text-white">
              <i className="me-2 bi bi-person"></i> Ahli Kariah
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#pendaftaran" className="nav-link text-white">
              <i className="me-2 bi bi-list-ul"></i> Pendaftaran
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#acara" className="nav-link text-white">
              <i className="me-2 bi bi-calendar-event"></i> Acara
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#pengumuman" className="nav-link text-white">
              <i className="me-2 bi bi-megaphone"></i> Pengumuman
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#laporan" className="nav-link text-white">
              <i className="me-2 bi bi-file-text"></i> Laporan
            </a>
          </li>
        </ul>
        <hr className="border-secondary" />
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

      {/* ===== Overlay (mobile) ===== */}
      <div
        className={`overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ===== Mobile Header (hamburger, <992px only) ===== */}
      <header className="mobile-header">
        <button
          className="btn btn-outline-secondary btn-sm menu-btn"
          type="button"
          onClick={() => setSidebarOpen(true)}
        >
          <i className="bi bi-list"></i>
        </button>
        <h1 className="h6 fw-semibold mb-0 text-white">Surau De Bayu</h1>
      </header>

      {/* ===== Main Content ===== */}
      <main className="main-content flex-grow-1" style={{ minWidth: 0 }}>
        {/* Stats Cards */}
        <div className="container-fluid px-0">
          <div className="stats-grid row g-4 mb-4">
            <div className="col-6 col-md-4 col-lg">
              <div className="stat-card total card h-100 border-0">
                <div className="card-body text-center">
                  <i className="stat-icon mb-3 bi bi-speedometer2"></i>
                  <p className="stat-label mb-1">Jumlah Pendaftaran</p>
                  <h2 className="stat-value fw-bold mb-0">{stats.total}</h2>
                </div>
              </div>
            </div>
            {stats.blocks.map((b, idx) => (
              <div className="col-6 col-md-4 col-lg" key={b.label}>
                <div className={`stat-card ${['b1', 'b2', 'b3'][idx] || ''} card h-100 border-0`}>
                  <div className="card-body text-center">
                    <i className="stat-icon mb-3 bi bi-building"></i>
                    <p className="stat-label mb-1">{b.label}</p>
                    <h2 className="stat-value fw-bold mb-0">{b.count}</h2>
                  </div>
                </div>
              </div>
            ))}
            <div className="col-6 col-md-4 col-lg">
              <div className="stat-card tenant card h-100 border-0">
                <div className="card-body text-center">
                  <i className="stat-icon mb-3 bi bi-person"></i>
                  <p className="stat-label mb-1">Penyewa</p>
                  <h2 className="stat-value fw-bold mb-0">
                    {stats.owners.find((o) => o.label === 'Penyewa')?.count || 0}
                  </h2>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg">
              <div className="stat-card owner card h-100 border-0">
                <div className="card-body text-center">
                  <i className="stat-icon mb-3 bi bi-person-check"></i>
                  <p className="stat-label mb-1">Pemilik</p>
                  <h2 className="stat-value fw-bold mb-0">
                    {stats.owners.find((o) => o.label === 'Pemilik')?.count || 0}
                  </h2>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg">
              <div className="stat-card today card h-100 border-0">
                <div className="card-body text-center">
                  <i className="stat-icon mb-3 bi bi-bell"></i>
                  <p className="stat-label mb-1">Aktiviti Hari Ini</p>
                  <h2 className="stat-value fw-bold mb-0">{stats.today}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="table-card card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="h6 fw-semibold mb-0 text-white"><i className="bi bi-journal-text me-2"></i> Senarai Pendaftar</h3>
              <div className="d-flex gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                  <span className="input-group-text bg-secondary bg-opacity-10 border-0 text-muted">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-0 bg-secondary bg-opacity-10 text-white"
                    placeholder="Cari nama, IC, unit..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <button className="btn btn-outline-success btn-sm d-none d-sm-inline-block" onClick={exportCSV}>
                  <i className="bi bi-download me-1"></i> Export CSV
                </button>
              </div>
            </div>

            {/* Filter row (responsive) */}
            <div className="row g-2 g-lg-3 px-3 py-2 border-bottom align-items-end">
              <div className="col-6 col-lg-auto">
                <label className="form-label small text-muted mb-1">Blok</label>
                <select
                  className="filter-select form-select form-select-sm bg-secondary bg-opacity-10 border-0 text-white"
                  value={filterBlock}
                  onChange={(e) => { setFilterBlock(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Semua</option>
                  <option value="DB01">Blok 1</option>
                  <option value="DB02">Blok 2</option>
                  <option value="DB03">Blok 3</option>
                </select>
              </div>
              <div className="col-6 col-lg-auto">
                <label className="form-label small text-muted mb-1">Pemilik</label>
                <select
                  className="filter-select form-select form-select-sm bg-secondary bg-opacity-10 border-0 text-white"
                  value={filterOwner}
                  onChange={(e) => { setFilterOwner(e.target.value); setCurrentPage(1) }}
                >
                  <option value="">Semua</option>
                  <option value="Pemilik">Pemilik</option>
                  <option value="Penyewa">Penyewa</option>
                </select>
              </div>
              <div className="col-6 col-lg-auto">
                <label className="form-label small text-muted mb-1">Dari</label>
                <input
                  type="date"
                  className="form-control form-control-sm bg-secondary bg-opacity-10 border-0 text-white"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div className="col-6 col-lg-auto">
                <label className="form-label small text-muted mb-1">Sehingga</label>
                <input
                  type="date"
                  className="form-control form-control-sm bg-secondary bg-opacity-10 border-0 text-white"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div className="col-12 col-lg-auto">
                <button className="btn btn-outline-secondary btn-sm w-100" onClick={clearAllFilters}>
                  Reset
                </button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="table-responsive">
              <table className="table table-dark-custom table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Nama Pemohon</th>
                    <th scope="col">No Unit</th>
                    <th scope="col">Status</th>
                    <th scope="col">Tarikh Daftar</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Tiada rekod dijumpai.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((r, i) => (
                      <tr key={r.id}>
                        <td>{startIndex + i + 1}</td>
                        <td>{r.nama_pemohon}</td>
                        <td>{r.no_unit}</td>
                        <td>
                          <span className={`badge ${r.status_pemilikan === 'Pemilik' ? 'badge-owner' : 'badge-tenant'}`}>
                            {r.status_pemilikan}
                          </span>
                        </td>
                        <td>{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {error && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div className="toast align-items-center text-bg-danger border-0" role="alert">
            <div className="d-flex">
              <div className="toast-body">
                {error}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setError('')}></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
