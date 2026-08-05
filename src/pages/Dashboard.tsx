import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'

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
  const { user, signOut } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const [search, setSearch] = useState('')
  const [filterBlock, setFilterBlock] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editingRow, setEditingRow] = useState<RegistrationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState<'nama_pemohon' | 'created_at' | 'no_unit'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
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
    } catch (err: any) {
      setError(err.message || 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = (key: 'nama_pemohon' | 'no_unit') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
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
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [registrations, search, filterBlock, filterOwner, dateFrom, dateTo, sortKey, sortOrder])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
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
    }
  }, [registrations])

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

  const handleDelete = async (id: number) => {
    if (!confirm('Padam rekod ini? Tindakan tidak boleh dibuang kerja semula.')) return
    try {
      const { error: delError } = await supabase.from('kariah_registrations').delete().eq('id', id)
      if (delError) throw delError
      setRegistrations((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setError(err.message || 'Gagal memadam rekod')
    }
  }

  const handleSave = async (updated: RegistrationRow) => {
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('kariah_registrations')
        .update({
          nama_pemohon: updated.nama_pemohon,
          no_kad_pengenalan: updated.no_kad_pengenalan,
          alamat_dalam_kad_pengenalan: updated.alamat_dalam_kad_pengenalan,
          no_unit: updated.no_unit,
          status_pemilikan: updated.status_pemilikan,
          no_hp: updated.no_hp,
          email: updated.email,
          status_perkahwinan: updated.status_perkahwinan,
          tempoh_masa_menetap: updated.tempoh_masa_menetap,
          bilangan_isi_rumah: updated.bilangan_isi_rumah,
          pengakuan: updated.pengakuan,
        })
        .eq('id', updated.id)

      if (updateError) throw updateError
      setRegistrations((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...updated } : r))
      )
      setEditingRow(null)
    } catch (err: any) {
      setError(err.message || 'Gagal mengemaskini rekod')
    } finally {
      setSaving(false)
    }
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

  // Activity feed (last 5 registrations)
  const recentActivity = registrations.slice(0, 5)

  return (
    <div className="dashboard-page min-vh-100">
      {/* ===== Sidebar ===== */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="d-flex align-items-center">
            <div className="sidebar-logo me-3">🕌</div>
            <span className="sidebar-title">Surau De Bayu</span>
          </div>
        </div>
        <div className="sidebar-divider" />
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item active">
            <span className="nav-icon me-3">📊</span>
            <span>Dashboard</span>
          </div>
          <div className="sidebar-nav-item">
            <span className="nav-icon me-3">👥</span>
            <span>Ahli Kariah</span>
          </div>
          <div className="sidebar-nav-item">
            <span className="nav-icon me-3">✅</span>
            <span>Pendaftaran</span>
          </div>
          <div className="sidebar-nav-item">
            <span className="nav-icon me-3">📅</span>
            <span>Acara</span>
          </div>
          <div className="sidebar-nav-item">
            <span className="nav-icon me-3">📢</span>
            <span>Pengumuman</span>
          </div>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-nav-item text-white" onClick={handleLogout} style={{ cursor: 'pointer', marginTop: 'auto' }}>
          <span className="nav-icon me-3">🚪</span>
          <span>Log Keluar</span>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard Kariah</h1>
            <p className="dashboard-subtitle">Selamat datang, {user?.email}</p>
          </div>
          <div className="header-actions">
            <div className="notification-bell">
              🔔
              <span className="badge bg-danger rounded-pill">3</span>
            </div>
            <img
              src="https://via.placeholder.com/36"
              alt="User"
              className="user-avatar"
            />
          </div>
        </header>

        {error && <div className="alert alert-danger small">{error}</div>}

        {/* Stats Cards */}
        <div className="container-fluid px-4 py-3">
          <div className="row g-3 mb-4">
            <div className="col-xxl-2 col-md-4">
              <div className="dashboard-card stats-card-primary h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-uppercase fw-semibold small mb-2 text-muted">Jumlah Pendaftaran</p>
                      <h2 className="mb-0 fw-bold text-gradient-primary">{stats.total}</h2>
                    </div>
                    <div className="stats-icon-wrapper">
                      <span>📊</span>
                    </div>
                  </div>
                  <p className="small text-muted mb-0 mt-2">Semua masa</p>
                </div>
              </div>
            </div>
            {stats.blocks.map((b) => (
              <div className="col-xxl-2 col-md-4" key={b.label}>
                <div className="dashboard-card stats-card-teal h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-uppercase fw-semibold small mb-2 text-muted">{b.label}</p>
                        <h2 className="mb-0 fw-bold text-gradient-teal">{b.count}</h2>
                      </div>
                      <div className="stats-icon-wrapper">
                        <span>🏢</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="col-xxl-2 col-md-4">
              <div className="dashboard-card stats-card-red h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-uppercase fw-semibold small mb-2 text-muted">Penyewa</p>
                      <h2 className="mb-0 fw-bold text-gradient-red">
                        {stats.owners.find((o) => o.label === 'Penyewa')?.count || 0}
                      </h2>
                    </div>
                    <div className="stats-icon-wrapper">
                      <span>👨‍👩‍👧‍👦</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-2 col-md-4">
              <div className="dashboard-card stats-card-purple h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-uppercase fw-semibold small mb-2 text-muted">Pemilik</p>
                      <h2 className="mb-0 fw-bold text-gradient-purple">
                        {stats.owners.find((o) => o.label === 'Pemilik')?.count || 0}
                      </h2>
                    </div>
                    <div className="stats-icon-wrapper">
                      <span>🔑</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-2 col-md-4">
              <div className="dashboard-card stats-card-amber h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-uppercase fw-semibold small mb-2 text-muted">Aktiviti Hari Ini</p>
                      <h2 className="mb-0 fw-bold text-gradient-amber">
                        {filtered.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length}
                      </h2>
                    </div>
                    <div className="stats-icon-wrapper">
                      <span>📅</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed (last 5) */}
          <div className="dashboard-card h-100 mb-4">
            <div className="card-body">
              <h3 className="text-uppercase fw-semibold small mb-3 text-muted">Aktiviti Terkini</h3>
              <div className="list-group list-group-flush">
                {recentActivity.map((r) => (
                  <div key={r.id} className="list-group-item border-0 py-2 px-0">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar-placeholder d-flex align-items-center justify-content-center">
                          {r.nama_pemohon?.charAt(0) || '?'}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-0 fw-medium small">{r.nama_pemohon} mendaftar unit {r.no_unit}</p>
                        <p className="mb-0 text-muted xsmall">
                          {new Date(r.created_at).toLocaleString('ms-MY', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Card (placeholder) */}
          <div className="dashboard-card mb-4 h-100">
            <div className="card-body">
              <h3 className="text-uppercase fw-semibold small mb-3 text-muted">Statistik Pendaftaran</h3>
              <div className="chart-placeholder">
                <div className="d-flex align-items-end h-100 gap-1">
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayData = filtered.filter(r => {
                      const d = new Date(r.created_at)
                      return d.getDay() === (new Date().getDay() - 6 + i + 7) % 7
                    })
                    const height = Math.max(10, (dayData.length / 7) * 100)
                    return (
                      <div key={i} className="flex-grow-1 d-flex flex-column align-items-center">
                        <div className="chart-bar" style={{ height: `${height}%` }}>
                          <span className="chart-value">{dayData.length}</span>
                        </div>
                        <small className="text-muted mt-1">{['Min','Sel','Rab','Khm','Jum','Sab','Min'][(new Date().getDay() - 6 + i + 7) % 7]}</small>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="dashboard-card mb-4 h-100">
            <div className="card-body p-0">
              <div className="card-header border-0 bg-transparent py-3 px-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <h3 className="mb-0 fw-semibold">Senarai Pendaftar</h3>
                  <div className="d-flex gap-2 flex-wrap">
                    <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                      <span className="input-group-text bg-light border-0">🔍</span>
                      <input
                        type="text"
                        className="form-control border-0"
                        placeholder="Cari nama, IC, unit..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                      />
                    </div>
                    <button className="btn btn-outline-success btn-sm" onClick={exportCSV}>
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-bottom d-flex align-items-center flex-wrap gap-3">
                <div className="col-md-2 p-0">
                  <label className="form-label small text-muted mb-1">Blok</label>
                  <select
                    className="form-select form-select-sm"
                    value={filterBlock}
                    onChange={(e) => { setFilterBlock(e.target.value); setCurrentPage(1) }}
                  >
                    <option value="">Semua</option>
                    <option value="DB01">Blok 1</option>
                    <option value="DB02">Blok 2</option>
                    <option value="DB03">Blok 3</option>
                  </select>
                </div>
                <div className="col-md-2 p-0">
                  <label className="form-label small text-muted mb-1">Pemilik</label>
                  <select
                    className="form-select form-select-sm"
                    value={filterOwner}
                    onChange={(e) => { setFilterOwner(e.target.value); setCurrentPage(1) }}
                  >
                    <option value="">Semua</option>
                    <option value="Pemilik">Pemilik</option>
                    <option value="Penyewa">Penyewa</option>
                  </select>
                </div>
                <div className="col-md-2 p-0">
                  <label className="form-label small text-muted mb-1">Dari</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <div className="col-md-2 p-0">
                  <label className="form-label small text-muted mb-1">Sehingga</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <div className="col-md-1 p-0">
                  <button className="btn btn-outline-secondary btn-sm w-100" onClick={clearAllFilters}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table admin-table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>
                        <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => toggleSort('nama_pemohon')}>
                          Nama Pemohon {sortKey === 'nama_pemohon' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th>No. Kad Pengenalan</th>
                      <th>
                        <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => toggleSort('no_unit')}>
                          No Unit {sortKey === 'no_unit' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th>Status</th>
                      <th>No H/P</th>
                      <th>Email</th>
                      <th>Isi Rumah</th>
                      <th>Tarikh</th>
                      <th className="text-end">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4 text-muted">
                          Tiada rekod dijumpai.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((r, i) => (
                        <tr key={r.id}>
                          <td>{startIndex + i + 1}</td>
                          <td>{r.nama_pemohon}</td>
                          <td>{r.no_kad_pengenalan}</td>
                          <td>{r.no_unit}</td>
                          <td>
                            <span className={`status-badge ${r.status_pemilikan === 'Pemilik' ? 'status-approved' : 'status-pending'}`}>
                              <span>●</span> {r.status_pemilikan}
                            </span>
                          </td>
                          <td>{r.no_hp}</td>
                          <td>{r.email || <span className="text-muted small">—</span>}</td>
                          <td>{r.bilangan_isi_rumah}</td>
                          <td>{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-primary"
                                title="Edit"
                                onClick={() => setEditingRow(r)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="Padam"
                                onClick={() => handleDelete(r.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-4 py-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <small className="text-muted">
                    Halaman {currentPage} daripada {totalPages}
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Sebelumnya</button>
                      </li>
                      {totalPages <= 5 ? (
                        Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="page-item active"><span className="page-link">{currentPage}</span></li>
                          <li className="page-item disabled"><span className="page-link">/</span></li>
                          <li className="page-item disabled"><span className="page-link">{totalPages}</span></li>
                        </>
                      )}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Seterusnya</button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>

          {/* Layout: Table + Activity (side by side on large screens) */}
          <div className="row g-4">
            <div className="col-12">
              {/* already have table above — this is the activity feed */}
            </div>
          </div>
        </div>
      </main>

      {/* ===== Edit Modal ===== */}
      {editingRow && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content dashboard-modal">
              <form onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingRow)
              }}>
                <div className="modal-header">
                  <h5 className="modal-title">Kemaskini Maklumat</h5>
                  <button type="button" className="btn-close" onClick={() => setEditingRow(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Nama Pemohon</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.nama_pemohon}
                        onChange={(e) => setEditingRow({ ...editingRow, nama_pemohon: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">No. Kad Pengenalan</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_kad_pengenalan}
                        onChange={(e) => setEditingRow({ ...editingRow, no_kad_pengenalan: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Alamat</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={editingRow.alamat_dalam_kad_pengenalan}
                        onChange={(e) => setEditingRow({ ...editingRow, alamat_dalam_kad_pengenalan: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-muted">No Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_unit}
                        onChange={(e) => setEditingRow({ ...editingRow, no_unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-muted">Status Pemilikan</label>
                      <select
                        className="form-select"
                        value={editingRow.status_pemilikan}
                        onChange={(e) => setEditingRow({ ...editingRow, status_pemilikan: e.target.value as 'Pemilik' | 'Penyewa' })}
                        required
                      >
                        <option value="Pemilik">Pemilik</option>
                        <option value="Penyewa">Penyewa</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-muted">No H/P</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_hp}
                        onChange={(e) => setEditingRow({ ...editingRow, no_hp: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editingRow.email || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Perkahwinan</label>
                      <select
                        className="form-select"
                        value={editingRow.status_perkahwinan}
                        onChange={(e) => setEditingRow({ ...editingRow, status_perkahwinan: e.target.value as 'Bujang' | 'Berkahwin' })}
                        required
                      >
                        <option value="Bujang">Bujang</option>
                        <option value="Berkahwin">Berkahwin</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Isi Rumah</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="10"
                        value={editingRow.bilangan_isi_rumah}
                        onChange={(e) => setEditingRow({ ...editingRow, bilangan_isi_rumah: (parseInt(e.target.value) || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingRow(null)}
                    disabled={saving}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={saving}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
