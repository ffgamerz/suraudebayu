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

const AhliKariah = () => {
  const { signOut } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingRow, setEditingRow] = useState<RegistrationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
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

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (
        search &&
        !r.nama_pemohon?.toLowerCase().includes(search.toLowerCase()) &&
        !r.no_kad_pengenalan?.includes(search) &&
        !r.no_unit?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [registrations, search])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <a href="/dashboard" className="nav-link text-white">
              <i className="me-2 bi bi-speedometer2"></i> Dashboard
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="/ahli-kariah" className="nav-link active" aria-current="page">
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
        <h1 className="h6 fw-semibold mb-0 text-white">Ahli Kariah</h1>
      </header>

      {/* ===== Main Content ===== */}
      <main className="main-content flex-grow-1" style={{ minWidth: 0 }}>
        <div className="container-fluid px-0">
          {/* Search */}
          <div className="table-card card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="h6 fw-semibold mb-0 text-white">
                <i className="bi bi-person me-2"></i> Senarai Ahli Kariah
              </h3>
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
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-dark-custom table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Nama Pemohon</th>
                    <th scope="col">No. Kad Pengenalan</th>
                    <th scope="col">Alamat</th>
                    <th scope="col">No Unit</th>
                    <th scope="col">Status</th>
                    <th scope="col">No H/P</th>
                    <th scope="col">Email</th>
                    <th scope="col">Status Perkahwinan</th>
                    <th scope="col">Tempoh Tinggal</th>
                    <th scope="col">Isi Rumah</th>
                    <th scope="col">Tarikh Daftar</th>
                    <th scope="col" className="text-end">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-4 text-muted">
                        Tiada rekod dijumpai.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((r, i) => (
                      <tr key={r.id}>
                        <td>{startIndex + i + 1}</td>
                        <td>{r.nama_pemohon}</td>
                        <td>{r.no_kad_pengenalan}</td>
                        <td>{r.alamat_dalam_kad_pengenalan}</td>
                        <td>{r.no_unit}</td>
                        <td>
                          <span className={`badge ${r.status_pemilikan === 'Pemilik' ? 'badge-owner' : 'badge-tenant'}`}>
                            {r.status_pemilikan}
                          </span>
                        </td>
                        <td>{r.no_hp}</td>
                        <td>{r.email || <span className="text-muted small">—</span>}</td>
                        <td>{r.status_perkahwinan || '—'}</td>
                        <td>{r.tempoh_masa_menetap || '—'}</td>
                        <td>{r.bilangan_isi_rumah}</td>
                        <td>{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-outline-secondary text-primary"
                              title="Edit"
                              onClick={() => setEditingRow(r)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-outline-secondary text-danger ms-1"
                              title="Padam"
                              onClick={() => handleDelete(r.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
              <small className="text-muted">
                {filtered.length} ahli kariah · Halaman {currentPage} daripada {totalPages}
              </small>
              {totalPages > 1 && (
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage - 1)} aria-label="Sebelumnya">
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (totalPages <= 5 || Math.abs(page - currentPage) <= 2) {
                        return (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => handlePageChange(page)}>{page}</button>
                          </li>
                        )
                      }
                      return null
                    })}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage + 1)} aria-label="Seterusnya">
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== Edit Modal ===== */}
      {editingRow && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-lg-down">
            <div className="modal-content">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave(editingRow)
                }}
              >
                <div className="modal-header">
                  <h5 className="modal-title">Kemaskini Maklumat</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setEditingRow(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small text-muted">Nama Pemohon</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.nama_pemohon}
                        onChange={(e) =>
                          setEditingRow({ ...editingRow, nama_pemohon: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">No. Kad Pengenalan</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_kad_pengenalan}
                        onChange={(e) =>
                          setEditingRow({ ...editingRow, no_kad_pengenalan: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Alamat</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={editingRow.alamat_dalam_kad_pengenalan}
                        onChange={(e) =>
                          setEditingRow({
                            ...editingRow,
                            alamat_dalam_kad_pengenalan: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">No Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_unit}
                        onChange={(e) => setEditingRow({ ...editingRow, no_unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Status Pemilikan</label>
                      <select
                        className="form-select"
                        value={editingRow.status_pemilikan}
                        onChange={(e) =>
                          setEditingRow({
                            ...editingRow,
                            status_pemilikan: e.target.value as 'Pemilik' | 'Penyewa',
                          })
                        }
                        required
                      >
                        <option value="Pemilik">Pemilik</option>
                        <option value="Penyewa">Penyewa</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">No H/P</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingRow.no_hp}
                        onChange={(e) => setEditingRow({ ...editingRow, no_hp: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editingRow.email || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Status Perkahwinan</label>
                      <select
                        className="form-select"
                        value={editingRow.status_perkahwinan}
                        onChange={(e) =>
                          setEditingRow({
                            ...editingRow,
                            status_perkahwinan: e.target.value as 'Bujang' | 'Berkahwin',
                          })
                        }
                        required
                      >
                        <option value="Bujang">Bujang</option>
                        <option value="Berkahwin">Berkahwin</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Isi Rumah</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="10"
                        value={editingRow.bilangan_isi_rumah}
                        onChange={(e) =>
                          setEditingRow({
                            ...editingRow,
                            bilangan_isi_rumah: parseInt(e.target.value) as any,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
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

      {/* ===== Error Toast ===== */}
      {error && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div className="toast align-items-center text-bg-danger border-0" role="alert">
            <div className="d-flex">
              <div className="toast-body">{error}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setError('')}
              ></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AhliKariah
