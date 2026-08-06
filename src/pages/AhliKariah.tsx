import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/Dashboard.css'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

const AhliKariah = () => {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingRow, setEditingRow] = useState<RegistrationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
    <DashboardLayout mobileTitle="Ahli Kariah">
      <div className="container-fluid px-0">
        {/* Search card */}
        <div className="card border bg-white mb-4">
          <div className="card-header d-flex justify-content-between align-items-center bg-light">
            <h3 className="h6 fw-semibold mb-0 text-dark">
              <i className="bi bi-person me-2"></i> Senarai Ahli Kariah
            </h3>
            <div className="d-flex gap-2 flex-wrap">
              <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-light text-muted border-secondary">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light text-dark border-secondary"
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

          {/* Card body — table directly for full-width border fit */}
          <div className="card-body p-0">
            {/* Pagination info */}
            <div className="px-3 py-2">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-2 border-bottom pb-2">
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

            {/* table-responsive for horizontal scroll on mobile */}
            <div className="table-responsive">
              <table className="table table-hover table-striped table-sm align-middle mb-0 small w-100 table-fit">
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
                      <td className="table-name">{r.nama_pemohon}</td>
                      <td>{r.no_kad_pengenalan}</td>
                      <td>{r.alamat_dalam_kad_pengenalan}</td>
                      <td>{r.no_unit}</td>
                      <td>
                        <span className={`badge ${r.status_pemilikan === 'Pemilik' ? 'badge-soft-success' : 'badge-soft-warning'}`}>
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
          </div>
      </div>
    </div>

      {/* ===== Edit Modal ===== */}
      {editingRow && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1050 }}
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
                    className="btn-close btn-close-danger"
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
                className="btn-close btn-close-danger me-2 m-auto"
                onClick={() => setError('')}
              ></button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default AhliKariah
