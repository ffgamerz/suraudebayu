import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import DashboardLayout from '../components/DashboardLayout'
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

const BLOCK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DB01: { bg: 'rgba(13, 110, 253, 0.12)', text: '#0d6efd', border: 'rgba(13, 110, 253, 0.2)' },
  DB02: { bg: 'rgba(255, 193, 7, 0.12)', text: '#ffc107', border: 'rgba(255, 193, 7, 0.2)' },
  DB03: { bg: 'rgba(40, 167, 69, 0.12)', text: '#28a745', border: 'rgba(40, 167, 69, 0.2)' },
}

const Dashboard = () => {
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
        key: k,
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

  const clearAllFilters = () => {
    setSearch('')
    setFilterBlock('')
    setFilterOwner('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  return (
    <DashboardLayout mobileTitle="Dashboard">
      <div className="container-fluid px-0">
        {/* Stats Cards — using native Bootstrap card + utility classes */}
        <div className="row g-4 mb-4">
          {/* Total Registrations — soft blue background */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 stat-card-primary">
              <div className="card-body text-center">
                <i className="bi bi-speedometer2 fs-1 mb-3 stat-icon"></i>
                <p className="text-uppercase small text-muted mb-1 fw-semibold">Jumlah Pendaftaran</p>
                <h2 className={`fw-bold mb-0 ${stats.total === 0 ? 'text-muted' : 'text-dark'} fs-2`}>{stats.total}</h2>
              </div>
            </div>
          </div>

          {/* Block Breakdown — single card with small horizontal bars */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 stat-card-block">
              <div className="card-body">
                <i className="bi bi-building fs-1 mb-3 stat-icon"></i>
                <p className="text-uppercase small text-muted mb-2 fw-semibold">Pendaftaran Mengikut Blok</p>
                {stats.blocks.map((b) => {
                  const color = BLOCK_COLORS[b.key] || BLOCK_COLORS.DB01
                  const max = Math.max(...stats.blocks.map(x => x.count), 1)
                  const pct = (b.count / max) * 100
                  return (
                    <div key={b.key} className="mb-2">
                      <div className="d-flex justify-content-between small text-muted">
                        <span>{b.label}</span>
                        <span className="fw-medium text-dark">{b.count}</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${pct}%`, backgroundColor: color.text, boxShadow: `0 0 6px ${color.bg}` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Pemilik & Penyewa — combined card with mini bars */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 stat-card-pemilik">
              <div className="card-body">
                {(() => {
                  const pemilikCount = stats.owners.find((o) => o.label === 'Pemilik')?.count || 0
                  const penyewaCount = stats.owners.find((o) => o.label === 'Penyewa')?.count || 0
                  return (
                    <>
                      <i className="bi bi-people fs-1 mb-3 stat-icon"></i>
                      <p className="text-uppercase small text-muted mb-2 fw-semibold">Pemilik & Penyewa</p>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between small text-muted">
                          <span>Pemilik</span>
                          <span className="fw-medium text-dark">{pemilikCount}</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${pemilikCount > 0 ? 100 : 0}%`, backgroundColor: '#28a745' }}
                          ></div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between small text-muted">
                          <span>Penyewa</span>
                          <span className="fw-medium text-dark">{penyewaCount}</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${penyewaCount > 0 ? 100 : 0}%`, backgroundColor: penyewaCount > 0 ? '#ffc107' : '#6c757d' }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Aktiviti Hari Ini — soft purple background */}
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100 stat-card-activity">
              <div className="card-body text-center">
                <i className="bi bi-bell fs-1 mb-3 stat-icon"></i>
                <p className="text-uppercase small text-muted mb-1 fw-semibold">Aktiviti Hari Ini</p>
                <h2 className={`fw-bold mb-0 ${stats.today === 0 ? 'text-muted' : 'text-dark'} fs-2`}>{stats.today}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Registrations Table — native Bootstrap table + card */}
        <div className="card border bg-white table-card">
          <div className="card-header d-flex justify-content-between align-items-center bg-light border-bottom">
            <h3 className="h6 fw-semibold mb-0 text-dark">
              <i className="bi bi-journal-text me-2"></i> Senarai Pendaftar
            </h3>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-light text-muted border-secondary">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light text-dark border-secondary"
                  placeholder="Cari nama, IC, unit..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <button className="btn btn-sm btn-outline-success d-none d-sm-inline-block" onClick={exportCSV}>
                <i className="bi bi-download me-1"></i> Export CSV
              </button>
            </div>
          </div>

          {/* Card body — table directly in card-body for full-width border fit */}
          <div className="card-body p-0">
            <div className="px-3 py-2">
              {/* Filter row (responsive) */}
              <div className="row g-2 g-lg-3 align-items-end">
                <div className="col-6 col-lg-auto">
                  <label className="form-label small text-muted mb-1">Blok</label>
                  <select
                    className="form-select form-select-sm bg-light text-dark border-secondary"
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
                    className="form-select form-select-sm bg-light text-dark border-secondary"
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
                    className="form-control form-control-sm bg-light text-dark border-secondary"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <div className="col-6 col-lg-auto">
                  <label className="form-label small text-muted mb-1">Sehingga</label>
                  <input
                    type="date"
                    className="form-control form-control-sm bg-light text-dark border-secondary"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <div className="col-12 col-lg-auto">
                  <button className="btn btn-sm btn-outline-secondary w-100" onClick={clearAllFilters}>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* table-responsive for horizontal scroll on mobile */}
            <div className="table-responsive">
              <table className="table table-hover table-striped table-sm align-middle mb-0 small w-100 table-fit">
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
                        <td className="table-name">{r.nama_pemohon}</td>
                        <td>{r.no_unit}</td>
                        <td>
                          <span className={`badge ${r.status_pemilikan === 'Pemilik' ? 'badge-soft-success' : 'badge-soft-warning'}`}>
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

        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <nav aria-label="Page navigation" className="mt-3">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(1)}>
                  First
                </button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  aria-label="Previous"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              </li>
              {Array.from({ length: Math.ceil(filtered.length / itemsPerPage) }).map((_, idx) => {
                const pageNum = idx + 1
                const startPage = Math.max(1, Math.min(pageNum - 2, Math.ceil(filtered.length / itemsPerPage) - 4))
                const endPage = Math.min(Math.ceil(filtered.length / itemsPerPage), startPage + 4)
                if (pageNum < startPage || pageNum > endPage) return null
                return (
                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </button>
                  </li>
                )
              })}
              <li className={`page-item ${currentPage === Math.ceil(filtered.length / itemsPerPage) ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  aria-label="Next"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
              <li className={`page-item ${currentPage === Math.ceil(filtered.length / itemsPerPage) ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(Math.ceil(filtered.length / itemsPerPage))}
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {error && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div className="toast align-items-center text-bg-danger border-0" role="alert">
            <div className="d-flex">
              <div className="toast-body">
                {error}
              </div>
              <button type="button" className="btn-close btn-close-danger me-2 m-auto" onClick={() => setError('')}></button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default Dashboard
