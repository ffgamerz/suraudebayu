import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import '../styles/Dashboard.css'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

type FieldDef = { key: keyof RegistrationRow; label: string }

const ALL_FIELDS: FieldDef[] = [
  { key: 'nama_pemohon', label: 'Nama Pemohon' },
  { key: 'no_kad_pengenalan', label: 'No. Kad Pengenalan' },
  { key: 'alamat_dalam_kad_pengenalan', label: 'Alamat' },
  { key: 'no_unit', label: 'No Unit' },
  { key: 'status_pemilikan', label: 'Status Pemilikan' },
  { key: 'no_hp', label: 'No H/P' },
  { key: 'email', label: 'Email' },
  { key: 'status_perkahwinan', label: 'Status Perkahwinan' },
  { key: 'tempoh_masa_menetap', label: 'Tempoh Tinggal' },
  { key: 'bilangan_isi_rumah', label: 'Isi Rumah' },
  { key: 'created_at', label: 'Tarikh Daftar' },
]

const ExportPage = () => {
  const { signOut } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFields, setSelectedFields] = useState<FieldDef[]>(ALL_FIELDS.slice(0, 5))
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRegistrations()
  }, [])

  // Click outside to close field dropdown (mousedown = fire before React toggle)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      // Ignore clicks inside the add-column button or its dropdown
      if (addMenuRef.current && addMenuRef.current.contains(target)) return
      setShowAddMenu(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
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

  const addField = (field: FieldDef) => {
    if (!selectedFields.some((f) => f.key === field.key)) {
      setSelectedFields([...selectedFields, field])
    }
    setShowAddMenu(false)
  }

  const removeField = (field: FieldDef) => {
    setSelectedFields(selectedFields.filter((f) => f.key !== field.key))
  }

  const moveField = (from: number, to: number) => {
    const reordered = [...selectedFields]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setSelectedFields(reordered)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const formatCell = (row: RegistrationRow, field: FieldDef) => {
    const val = row[field.key]
    if (field.key === 'created_at') {
      return new Date(val as string).toLocaleDateString('ms-MY')
    }
    if (field.key === 'pengakuan') return val ? 'Ya' : 'Tidak'
    return val == null || val === '' ? '—' : String(val)
  }

  const exportCSV = () => {
    const headers = selectedFields.map((f) => f.label)
    const rows = registrations.map((r) => selectedFields.map((f) => `"${formatCell(r, f)}"`))
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kariah_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const headers = selectedFields.map((f) => f.label)
    const body = registrations.map((r) => selectedFields.map((f) => formatCell(r, f)))

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Senarai Ahli Kariah', 15, 20)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Tarikh Eksport: ${new Date().toLocaleDateString('ms-MY')}`, 15, 27)
    doc.text(`Jumlah Rekod: ${registrations.length}`, 15, 32)

    ;(doc as any).autoTable({
      startY: 38,
      head: [headers],
      body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellWidth: 'wrap' },
      headStyles: { fillColor: [15, 23, 42], textColor: [226, 232, 240] },
    })
    doc.save(`kariah_export_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="dashboard-app d-flex min-vh-100">
      {/* ===== Sidebar ===== */}
      <aside className="sidebar" id="sidebar">
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
            <a href="/ahli-kariah" className="nav-link text-white">
              <i className="me-2 bi bi-person"></i> Ahli Kariah
            </a>
          </li>
          <li className="nav-item mb-1">
            <a href="/export" className="nav-link active" aria-current="page">
              <i className="me-2 bi bi-download"></i> Eksport Data
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

      <div className="overlay" />

      <main className="main-content flex-grow-1" style={{ minWidth: 0 }}>
        <div className="container-fluid px-0">
          {/* Toolbar: column selection */}
          <div className="table-card card mb-4" style={{ overflow: 'visible' }}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h3 className="h6 fw-semibold mb-0 text-white">
                <i className="bi bi-download me-2"></i> Eksport Data Ahli Kariah
              </h3>
              <div className="d-flex align-items-center gap-2 position-relative" ref={addMenuRef}>
                <small className="text-muted mb-0">{selectedFields.length} column dipilih</small>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm text-nowrap"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                >
                  <i className="bi bi-plus-lg me-1"></i> Add Column
                </button>
                <button className="btn btn-outline-success btn-sm" onClick={exportCSV} disabled={selectedFields.length === 0 || registrations.length === 0}>
                  <i className="bi bi-filetype-csv me-1"></i> CSV
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={exportPDF} disabled={selectedFields.length === 0 || registrations.length === 0}>
                  <i className="bi bi-file-pdf me-1"></i> PDF (Print)
                </button>
              </div>
            </div>

            {/* Add Column dropdown */}
            {showAddMenu && (
              <div
                className="position-absolute top-100 start-0 mt-2"
                style={{ width: '240px', maxHeight: '340px', overflowY: 'auto', zIndex: 1040 }}>
                <div className="dropdown-menu show p-2" style={{ width: '100%' }}>
                  <small className="text-muted d-block mb-1 px-1">Add column:</small>
                  {ALL_FIELDS.filter((f) => !selectedFields.some((sf) => sf.key === f.key)).length === 0 ? (
                    <span className="dropdown-item-text text-muted small">Semua column sudah aktif</span>
                  ) : (
                    ALL_FIELDS.filter((f) => !selectedFields.some((sf) => sf.key === f.key)).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className="dropdown-item btn-sm text-start"
                        style={{ cursor: 'pointer' }}
                        onClick={() => addField(f)}
                      >
                        <i className="bi bi-plus me-1"></i> {f.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected columns row */}
            <div className="px-3 py-2 border-bottom d-flex flex-wrap gap-2 align-items-center">
              {selectedFields.length === 0 ? (
                <span className="text-muted small fst-italic">Tiada column dipilih — klik "Add Column"</span>
              ) : (
                selectedFields.map((f, i) => (
                  <span key={f.key} className="badge bg-secondary d-flex align-items-center gap-1">
                    <span className="d-flex align-items-center">
                      <i
                        className="bi bi-grip-vertical me-1"
                        style={{ cursor: 'grab', fontSize: '0.8em' }}
                        draggable
                        onDragStart={(e) => {
                          (e.dataTransfer as any).setData('text/plain', String(i))
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const from = parseInt((e.dataTransfer as any).getData('text/plain'), 10)
                          if (!isNaN(from) && from !== i) moveField(from, i)
                        }}
                      ></i>
                      {f.label}
                    </span>
                    <i
                      className="bi bi-x-lg ms-1"
                      style={{ cursor: 'pointer', fontSize: '0.7em' }}
                      onClick={() => removeField(f)}
                      title="Delete column"
                    ></i>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="px-3 px-lg-4 pb-4">
            <h4 className="h6 fw-semibold text-white mb-3">
              <i className="bi bi-eye me-2"></i> Preview ({registrations.length} rekod)
            </h4>
            <div className="table-responsive">
              <table className="table table-dark-custom table-hover align-middle mb-0">
                <thead>
                  <tr>
                    {selectedFields.length === 0 ? (
                      <th scope="col" className="text-muted fst-italic">Tiada column dipilih</th>
                    ) : (
                      selectedFields.map((f) => (
                        <th key={f.key} scope="col">
                          <span className="d-flex align-items-center gap-1">
                            {f.label}
                            <i
                              className="bi bi-x-lg ms-1"
                              style={{ cursor: 'pointer', fontSize: '0.7em', opacity: 0.5 }}
                              onClick={() => removeField(f)}
                              title="Delete column"
                            ></i>
                          </span>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={Math.max(selectedFields.length, 1)} className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : registrations.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(selectedFields.length, 1)} className="text-center py-4 text-muted">
                        Tiada rekod dijumpai.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((r) => (
                      <tr key={r.id}>
                        {selectedFields.map((f) => (
                          <td key={f.key}>{formatCell(r, f)}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ===== Error Toast ===== */}
      {error && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div className="toast align-items-center text-bg-danger border-0" role="alert">
            <div className="d-flex">
              <div className="toast-body">{error}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setError('')}></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportPage
