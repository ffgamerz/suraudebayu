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
    } catch (err) {
      setError((err as any)?.message || 'Gagal memuatkan data')
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

  const handleDelete = async (id: number) => {
    if (!confirm('Padam rekod ini? Tindakan tidak boleh dibatalkan.')) return
    try {
      const { error: delError } = await supabase.from('kariah_registrations').delete().eq('id', id)
      if (delError) throw delError
      setRegistrations((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError((err as any)?.message || 'Gagal memadam rekod')
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
    } catch (err) {
      setError((err as any)?.message || 'Gagal mengemaskini rekod')
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

  const recentActivity = registrations.slice(0, 5)

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* ===== Mobile Header (visible on small screens) ===== */}
      <header className="d-lg-none d-flex justify-content-between align-items-center p-3 bg-white border-bottom">
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarOffcanvas"
        >
          ☰
        </button>
        <h1 className="h6 fw-semibold mb-0">Dashboard</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="position-relative">
            <span className="fs-5">🔔</span>
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              3
            </span>
          </span>
        </div>
      </header>

      {/* ===== Sidebar (desktop only) ===== */}
      <aside className="d-none d-lg-block d-flex flex-column flex-shrink-0 p-3 bg-dark text-white" style={{ width: '260px', minWidth: '260px' }}>
        <a href="/" className="d-flex align-items-center text-white text-decoration-none mb-4">
          <span className="fs-3 me-2">Surau</span>
          <span className="fs-5 fw-semibold">De Bayu</span>
        </a>
        <hr className="border-secondary" />
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-1">
            <a href="#" className="nav-link active" aria-current="page">
              Dashboard
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#" className="nav-link text-white">
              Ahli Kariah
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#" className="nav-link text-white">
              Pendaftaran
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#" className="nav-link text-white">
              Acara
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="#" className="nav-link text-white">
              Pengumuman
            </a>
          </li>
        </ul>
        <hr className="border-secondary" />
        <div className="dropdown">
          <a
            href="#"
            className="d-flex align-items-center text-white text-decoration-none"
            onClick={handleLogout}
            style={{ cursor: 'pointer' }}
          >
            <span className="fs-6">Log Keluar</span>
          </a>
        </div>
      </aside>

      {/* ===== Mobile Offcanvas Sidebar ===== */}
      <div className="offcanvas offcanvas-start d-lg-none" tabIndex={-1} id="sidebarOffcanvas">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title mb-0">Menu</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-0">
          <nav className="flex-column nav">
            <a href="#" className="nav-link active">Dashboard</a>
            <a href="#" className="nav-link text-dark">Ahli Kariah</a>
            <a href="#" className="nav-link text-dark">Pendaftaran</a>
            <a href="#" className="nav-link text-dark">Acara</a>
            <a href="#" className="nav-link text-dark">Pengumuman</a>
            <hr className="my-2" />
            <a href="#" className="nav-link text-danger" onClick={handleLogout} style={{ cursor: 'pointer' }}>Log Keluar</a>
          </nav>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <main className="flex-column flex-grow-1 overflow-hidden">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center p-4 bg-white border-bottom">
          <div>
            <h1 className="h3 fw-semibold mb-1">Dashboard Kariah</h1>
            <p className="text-muted mb-0">Selamat datang, {user?.email}</p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="position-relative">
              <span className="fs-5"></span>
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                3
              </span>
            </span>
            <img
              src="https://via.placeholder.com/36"
              alt="User"
              className="rounded-circle"
              width="36"
              height="36"
            />
          </div>
        </header>

        {/* Stats Cards */}
        <div className="container-fluid p-4">
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <p className="text-uppercase small text-muted mb-1">Jumlah Pendaftaran</p>
                  <h2 className="fw-bold mb-0">{stats.total}</h2>
                </div>
              </div>
            </div>
            {stats.blocks.map((b) => (
              <div className="col-12 col-sm-6 col-xl" key={b.label}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center">
                    <p className="text-uppercase small text-muted mb-1">{b.label}</p>
                    <h2 className="fw-bold mb-0">{b.count}</h2>
                  </div>
                </div>
              </div>
            ))}
            <div className="col-12 col-sm-6 col-xl">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <p className="text-uppercase small text-muted mb-1">Penyewa</p>
                  <h2 className="fw-bold text-danger mb-0">
                    {stats.owners.find((o) => o.label === 'Penyewa')?.count || 0}
                  </h2>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-xl">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <p className="text-uppercase small text-muted mb-1">Pemilik</p>
                  <h2 className="fw-bold text-success mb-0">
                    {stats.owners.find((o) => o.label === 'Pemilik')?.count || 0}
                  </h2>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-xl">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <p className="text-uppercase small text-muted mb-1">Aktiviti Hari Ini</p>
                  <h2 className="fw-bold mb-0">{stats.today}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-header bg-white border-0">
                  <h3 className="h6 fw-semibold mb-0">Aktiviti Terkini</h3>
                </div>
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush">
                    {recentActivity.length === 0 ? (
                      <li className="list-group-item text-center text-muted py-3">Tiada aktiviti</li>
                    ) : (
                      recentActivity.map((r) => (
                        <li key={r.id} className="list-group-item border-0 py-2">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 me-3">
                              <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                <span className="text-primary fw-bold">{r.nama_pemohon?.charAt(0) || '?'}</span>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <p className="mb-0 fw-medium small">
                                {r.nama_pemohon} mendaftar unit {r.no_unit}
                              </p>
                              <p className="mb-0 text-muted xsmall">
                                {new Date(r.created_at).toLocaleString('ms-MY', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <h3 className="h6 fw-semibold mb-0">Senarai Pendaftar</h3>
                <div className="d-flex gap-2 flex-wrap">
                  <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                    <span className="input-group-text bg-light border-0"></span>
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

            <div className="px-3 py-2 border-bottom d-flex align-items-center flex-column flex-sm-row gap-3">
              <div>
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
              <div>
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
              <div>
                <label className="form-label small text-muted mb-1">Dari</label>
                <input
                  type="date"
                  className="form-control form-control-sm" style={{ fontSize: "16px" }}
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div>
                <label className="form-label small text-muted mb-1">Sehingga</label>
                <input
                  type="date"
                  className="form-control form-control-sm" style={{ fontSize: "16px" }}
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div className="mt-auto">
                <button className="btn btn-outline-secondary btn-sm w-100" onClick={clearAllFilters}>
                  Reset
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">
                      <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => toggleSort('nama_pemohon')}
                      >
                        Nama Pemohon {sortKey === 'nama_pemohon' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th scope="col">No. Kad Pengenalan</th>
                    <th scope="col">
                      <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => toggleSort('no_unit')}
                      >
                        No Unit {sortKey === 'no_unit' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">No H/P</th>
                    <th scope="col">Email</th>
                    <th scope="col">Isi Rumah</th>
                    <th scope="col">Tarikh</th>
                    <th scope="col" className="text-end">Tindakan</th>
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
                          <span className={`badge ${r.status_pemilikan === 'Pemilik' ? 'bg-success' : 'bg-warning'} text-dark`}>
                            {r.status_pemilikan}
                          </span>
                        </td>
                        <td>{r.no_hp}</td>
                        <td>{r.email || <span className="text-muted small">—</span>}</td>
                        <td>{r.bilangan_isi_rumah}</td>
                        <td>{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-outline-primary btn-sm py-1"
                              title="Edit"
                              onClick={() => setEditingRow(r)}
                            >
                              
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm py-1"
                              title="Padam"
                              onClick={() => handleDelete(r.id)}
                            >
                              
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
              <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
                <small className="text-muted">
                  Halaman {currentPage} daripada {totalPages}
                </small>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Sebelumnya</button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Seterusnya</button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== Edit Modal ===== */}
      {editingRow && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
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
