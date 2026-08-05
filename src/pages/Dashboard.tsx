import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData, HouseholdSize } from '../lib/types'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

// Status badge helper
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`badge ${status === 'Pemilik' ? 'bg-success' : 'bg-info'}`}>
    {status}
  </span>
)

const BLOCK_LABELS: Record<string, string> = {
  DB01: 'Blok 1',
  DB02: 'Blok 2',
  DB03: 'Blok 3',
}

const Dashboard = () => {
  // Auth
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Data
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Filters
  const [search, setSearch] = useState('')
  const [filterBlock, setFilterBlock] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Edit modal
  const [editingRow, setEditingRow] = useState<RegistrationRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Sort
  const [sortKey, setSortKey] = useState<'nama_pemohon' | 'created_at' | 'no_unit'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: 'nama_pemohon' | 'no_unit') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

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

  // Derived: filtered + sorted + paginated data
  const filtered = useMemo(() => {
    const result = registrations.filter((r) => {
      // Search
      if (search && !r.nama_pemohon.toLowerCase().includes(search.toLowerCase())
                  && !r.no_kad_pengenalan.includes(search)
                  && !r.no_unit.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Filter by block
      if (filterBlock && !r.no_unit.startsWith(filterBlock)) return false

      // Filter by owner status
      if (filterOwner && r.status_pemilikan !== filterOwner) return false

      // Filter by date range
      const rowDate = new Date(r.created_at)
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (rowDate < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setDate(to.getDate() + 1)
        if (rowDate >= to) return false
      }

      return true
    })

    // Sort
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

  // Stats
  const stats = useMemo(() => {
    const blockCounts: Record<string, number> = {}
    const ownerCounts: Record<string, number> = {}

    registrations.forEach((r) => {
      const block = r.no_unit.split('-')[0] || 'Unknown'
      blockCounts[block] = (blockCounts[block] || 0) + 1

      const owner = r.status_pemilikan || 'Unknown'
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1
    })

    return {
      total: registrations.length,
      blocks: Object.entries(blockCounts).map(([k, v]) => ({
        block: BLOCK_LABELS[k] || k,
        count: v,
      })),
      owners: Object.entries(ownerCounts).map(([k, v]) => ({
        type: k,
        count: v,
      })),
    }
  }, [registrations])

  // Handle export CSV
  const exportCSV = () => {
    const headers = [
      'No', 'Nama Pemohon', 'No. Kad Pengenalan', 'Alamat', 'No Unit',
      'Pemilik', 'No H/P', 'Email', 'Perkahwinan', 'Tempoh', 'Isi Rumah', 'Tarikh'
    ]
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
      const { error: delError } = await supabase
        .from('kariah_registrations')
        .delete()
        .eq('id', id)

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

  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-gradient mb-1">Dashboard Kariah</h2>
          <p className="text-secondary small mb-0">
            Pengguna: {user?.email}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}>
            Borang Pendaftaran
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={exportCSV}>
            Export CSV
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
            Log Keluar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm text-center">
            <div className="card-body py-3">
              <h3 className="text-gradient mb-0">{stats.total}</h3>
              <p className="text-secondary small mb-0">Jumlah Pendaftaran</p>
            </div>
          </div>
        </div>
        {stats.blocks.map(({ block, count }) => (
          <div className="col-md-3" key={block}>
            <div className="card shadow-sm text-center">
              <div className="card-body py-3">
                <h4 className="text-gradient mb-0">{count}</h4>
                <p className="text-secondary small mb-0">{block}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger small mb-3">{error}</div>
      )}

      {/* Filters */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small text-secondary">Cari</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Nama, IC, unit..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-secondary">Blok</label>
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
            <div className="col-md-2">
              <label className="form-label small text-secondary">Pemilik</label>
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
            <div className="col-md-2">
              <label className="form-label small text-secondary">Dari</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-secondary">Sehingga</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearch('')
                  setFilterBlock('')
                  setFilterOwner('')
                  setDateFrom('')
                  setDateTo('')
                  setCurrentPage(1)
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="small text-secondary mb-2">
        Menunjukkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} daripada {filtered.length} rekod
      </p>

      {/* Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
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
                    <td colSpan={10} className="text-center py-4 text-secondary">
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
                      <td><StatusBadge status={r.status_pemilikan} /></td>
                      <td>{r.no_hp}</td>
                      <td>{r.email || <span className="text-secondary small">—</span>}</td>
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
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <p className="small text-secondary mb-0">
            Halaman {currentPage} daripada {totalPages}
          </p>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                  Sebelumnya
                </button>
              </li>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </button>
                  </li>
                )
              })}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                  Seterusnya
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={(e) => { e.preventDefault(); handleSave(editingRow) }}>
                <div className="modal-header">
                  <h5 className="modal-title">Kemaskini Maklumat</h5>
                  <button type="button" className="btn-close" onClick={() => setEditingRow(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small">Nama Pemohon</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editingRow.nama_pemohon}
                        onChange={(e) => setEditingRow({ ...editingRow, nama_pemohon: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">No. Kad Pengenalan</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editingRow.no_kad_pengenalan}
                        onChange={(e) => setEditingRow({ ...editingRow, no_kad_pengenalan: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small">Alamat</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={editingRow.alamat_dalam_kad_pengenalan}
                        onChange={(e) => setEditingRow({ ...editingRow, alamat_dalam_kad_pengenalan: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">No Unit</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editingRow.no_unit}
                        onChange={(e) => setEditingRow({ ...editingRow, no_unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">Status Pemilikan</label>
                      <select
                        className="form-select form-select-sm"
                        value={editingRow.status_pemilikan}
                        onChange={(e) => setEditingRow({ ...editingRow, status_pemilikan: e.target.value as 'Pemilik' | 'Penyewa' })}
                        required
                      >
                        <option value="Pemilik">Pemilik</option>
                        <option value="Penyewa">Penyewa</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">No H/P</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editingRow.no_hp}
                        onChange={(e) => setEditingRow({ ...editingRow, no_hp: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={editingRow.email || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Perkahwinan</label>
                      <select
                        className="form-select form-select-sm"
                        value={editingRow.status_perkahwinan}
                        onChange={(e) => setEditingRow({ ...editingRow, status_perkahwinan: e.target.value as 'Bujang' | 'Berkahwin' })}
                        required
                      >
                        <option value="Bujang">Bujang</option>
                        <option value="Berkahwin">Berkahwin</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Isi Rumah</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={editingRow.bilangan_isi_rumah}
                        onChange={(e) => setEditingRow({ ...editingRow, bilangan_isi_rumah: parseInt(e.target.value) as HouseholdSize || 1 })}
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
