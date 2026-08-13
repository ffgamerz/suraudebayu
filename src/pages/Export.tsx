import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/Dashboard.css'
import { censorIC } from '../lib/utils'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

type FieldDef = { key: string; label: string }

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
  { key: 'signature', label: 'Tanda Tangan Kehadiran' },
]

const ExportPage = () => {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFields, setSelectedFields] = useState<FieldDef[]>([])
  const [toast, setToast] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Sort registrations by selected column (used in both preview and print output)
  const sortedRegistrations = useMemo(() => {
    if (!sortBy) return registrations
    const sorted = [...registrations]
    sorted.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy]
      const bVal = (b as unknown as Record<string, unknown>)[sortBy]
      const aStr = aVal == null ? '' : String(aVal)
      const bStr = bVal == null ? '' : String(bVal)
      if (aStr < bStr) return sortDir === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [registrations, sortBy, sortDir])

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

  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  const [showLoadDropdown, setShowLoadDropdown] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const addColumnBtnRef = useRef<HTMLButtonElement>(null)
  const loadBtnRef = useRef<HTMLButtonElement>(null)

  const toggleColumnDropdown = () => {
    if (addColumnBtnRef.current) {
      const rect = addColumnBtnRef.current.getBoundingClientRect()
      // Use viewport-relative coordinates for position:fixed
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
      })
    }
    setShowColumnDropdown(!showColumnDropdown)
  }

  const toggleLoadDropdown = () => {
    if (loadBtnRef.current) {
      const rect = loadBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
      })
    }
    setShowLoadDropdown(!showLoadDropdown)
  }

  // Close dropdowns on outside click / scroll / resize
  useEffect(() => {
    if (!showColumnDropdown && !showLoadDropdown) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.dropdown-menu') && !target.closest('button.dropdown-toggle')) {
        setShowColumnDropdown(false)
        setShowLoadDropdown(false)
      }
    }
    const handleScrollResize = () => {
      setShowColumnDropdown(false)
      setShowLoadDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScrollResize)
    window.addEventListener('resize', handleScrollResize)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScrollResize)
      window.removeEventListener('resize', handleScrollResize)
    }
  }, [showColumnDropdown, showLoadDropdown])

  const addField = (field: FieldDef) => {
    if (!selectedFields.some((f) => f.key === field.key)) {
      setSelectedFields([...selectedFields, field])
    }
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

  const hasSavedConfig = () => {
    try {
      const raw = localStorage.getItem('kariahExportConfigs')
      return raw !== null && JSON.parse(raw).length > 0
    } catch {
      return false
    }
  }

  type SavedConfig = { name: string; fields: string[] }

  const saveColumnConfig = () => {
    const name = window.prompt('Nama config column (cth: Default Ahli):', 'config_' + new Date().toLocaleDateString('ms-MY'))
    if (!name) return
    const keys = selectedFields.map((f) => f.key)
    let configs: SavedConfig[] = []
    try {
      configs = JSON.parse(localStorage.getItem('kariahExportConfigs') || '[]')
    } catch {
      configs = []
    }
    const filtered = configs.filter((c) => c.name !== name)
    localStorage.setItem('kariahExportConfigs', JSON.stringify([...filtered, { name, fields: keys }]))
    showToast(`Column config disave: "${name}"`)
  }

  const applyConfig = (cfg: SavedConfig) => {
    const loaded = cfg.fields
      .map((key) => ALL_FIELDS.find((f) => f.key === key))
      .filter((f): f is FieldDef => Boolean(f))
    if (loaded.length > 0) {
      setSelectedFields(loaded)
      showToast(`Column config dimuat: "${cfg.name}"`)
    }
  }

  const deleteConfig = (name: string) => {
    let configs: SavedConfig[] = []
    try {
      configs = JSON.parse(localStorage.getItem('kariahExportConfigs') || '[]')
    } catch {
      configs = []
    }
    localStorage.setItem('kariahExportConfigs', JSON.stringify(configs.filter((c) => c.name !== name)))
    showToast(`Config dihapus: "${name}"`)
  }

  const getSavedConfigs = (): SavedConfig[] => {
    try {
      return JSON.parse(localStorage.getItem('kariahExportConfigs') || '[]') as SavedConfig[]
    } catch {
      return []
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const formatCell = (row: RegistrationRow, field: FieldDef) => {
    const val = (row as unknown as Record<string, unknown>)[field.key]
    if (field.key === 'created_at') {
      return new Date(val as string).toLocaleDateString('ms-MY')
    }
    if (field.key === 'pengakuan') return val ? 'Ya' : 'Tidak'
    if (field.key === 'signature') return ''
    if (field.key === 'no_kad_pengenalan') return censorIC(val as string)
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

  const handlePrint = () => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

    // Format today's date as dd-mm-yyyy for the title (so browser Save to PDF uses this as suggested filename)
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const pageTitle = `Senarai Ahli Kariah ${dd}-${mm}-${yyyy}`
    const today = now.toLocaleDateString('ms-MY')

    // Build bold column-title row — always start with "No" sequence column
    const thead =
      '<th>No</th>' +
      selectedFields
        .map((f) => `<th>${escapeHtml(f.label)}</th>`)
        .join('')

    // Build data rows — prepend sequential "No" for each row
    const tbody = sortedRegistrations
      .map(
        (r, i) =>
          '<tr>' +
          `<td>${i + 1}</td>` +
          selectedFields.map((f) => `<td>${escapeHtml(formatCell(r, f))}</td>`).join('') +
          '</tr>'
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    body {
      margin: 0;
      background: #f6f6f6;
      color: #111;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 10mm auto;
      background: #fff;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.08);
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; letter-spacing: -0.5px; }
    .meta { margin: 0 0 1rem; font-size: 0.75rem; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.7rem; }
    th, td {
      border: 1px solid #ccc;
      padding: 0.5rem 0.625rem;
      text-align: left;
      word-break: break-word;
      vertical-align: top;
    }
    th { font-weight: 700; background: #f3f4f6; }
    @page { size: A4 portrait; margin: 20mm; }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <h1>Senarai Ahli Kariah — Surau De Bayu</h1>
    <div class="meta">Tarikh: ${today} | Jumlah Rekod: ${registrations.length}</div>
    <table>
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) {
      showToast('Sila benarkan pop-up untuk laman ini.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  return (
    <DashboardLayout mobileTitle="Eksport Data">
      <div className="container-fluid px-0">
        {/* Toolbar: column selection */}
        <div className="card border bg-white mb-4 overflow-hidden">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light">
            <h3 className="h6 fw-semibold mb-0 text-dark">
              <i className="bi bi-download me-2"></i> Eksport Data Ahli Kariah
            </h3>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <small className="text-muted mb-0">{selectedFields.length} column dipilih</small>

              {/* Add Column — fixed-position dropdown (works with overflow-hidden parent) */}
              <div className="d-inline-block" style={{ position: 'relative' }}>
                <button
                  type="button"
                  ref={addColumnBtnRef}
                  className="btn btn-outline-secondary btn-sm text-nowrap dropdown-toggle"
                  onClick={toggleColumnDropdown}
                  aria-expanded={showColumnDropdown}
                >
                  <i className="bi bi-plus-lg me-1"></i> Add Column
                </button>
              </div>
              {showColumnDropdown && (
                <div
                  className="dropdown-menu show bg-white border-secondary text-dark"
                  style={{ maxHeight: '340px', overflowY: 'auto', position: 'fixed', zIndex: 9999, minWidth: '240px', display: 'block', top: dropdownPos.top, left: dropdownPos.left }}
                  onMouseLeave={() => setShowColumnDropdown(false)}
                >
                  {ALL_FIELDS.filter((f) => !selectedFields.some((sf) => sf.key === f.key)).length === 0 ? (
                    <span className="dropdown-item-text text-muted small">Semua column sudah aktif</span>
                  ) : (
                    ALL_FIELDS.filter((f) => !selectedFields.some((sf) => sf.key === f.key)).map((f) => (
                      <button
                        type="button"
                        key={f.key}
                        className="dropdown-item btn-sm text-start"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { addField(f); setShowColumnDropdown(false) }}
                      >
                        <i className="bi bi-plus me-1"></i> {f.label}
                      </button>
                    ))
                  )}
                </div>
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={saveColumnConfig} disabled={selectedFields.length === 0}>
                <i className="bi bi-save me-1"></i> Save
              </button>
              <div className="d-inline-block" style={{ position: 'relative' }}>
                <button
                  type="button"
                  ref={loadBtnRef}
                  className="btn btn-outline-secondary btn-sm dropdown-toggle"
                  onClick={toggleLoadDropdown}
                  disabled={!hasSavedConfig()}
                  aria-expanded={showLoadDropdown}
                >
                  <i className="bi bi-upload me-1"></i> Load
                </button>
                {showLoadDropdown && hasSavedConfig() && (
                  <div
                    className="dropdown-menu show bg-white border-secondary text-dark"
                    style={{ maxHeight: '340px', overflowY: 'auto', position: 'fixed', zIndex: 9999, minWidth: '240px', display: 'block', top: dropdownPos.top, left: dropdownPos.left }}
                    onMouseLeave={() => setShowLoadDropdown(false)}
                  >
                    {getSavedConfigs().map((cfg) => (
                      <div key={cfg.name} className="d-flex justify-content-between align-items-center px-2 py-1">
                        <button className="btn btn-sm btn-outline-secondary" style={{ cursor: 'pointer' }} onClick={() => { applyConfig(cfg); setShowLoadDropdown(false) }}>
                          {cfg.name}
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" style={{ minWidth: '32px', padding: '2px 6px' }} onClick={() => { deleteConfig(cfg.name); setShowLoadDropdown(false) }}>
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-outline-success btn-sm" onClick={exportCSV} disabled={selectedFields.length === 0 || registrations.length === 0}>
                <i className="bi bi-filetype-csv me-1"></i> CSV
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={handlePrint} disabled={selectedFields.length === 0 || registrations.length === 0}>
                <i className="bi bi-printer me-1"></i> Cetak
              </button>
            </div>
          </div>

          {/* Selected columns row */}
          <div className="px-3 py-2 border-bottom d-flex flex-wrap gap-2 align-items-center">
            {selectedFields.length === 0 ? (
              <span className="text-muted small fst-italic">Tiada column dipilih — klik "Add Column"</span>
            ) : (
              selectedFields.map((f, i) => (
                <span key={f.key} className="badge bg-secondary d-flex align-items-center gap-1" draggable onDragStart={(e) => { (e.dataTransfer as any).setData('text/plain', String(i)) }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const from = parseInt((e.dataTransfer as any).getData('text/plain'), 10); if (!isNaN(from) && from !== i) moveField(from, i) }} style={{ cursor: 'grab' }}>
                  <i className="bi bi-grip-vertical me-1 fs-6" style={{ cursor: 'grab' }}></i>
                  {f.label}
                  <i
                    className="bi bi-x-lg ms-1 fs-6"
                    style={{ cursor: 'pointer', opacity: 0.5 }}
                    onClick={() => removeField(f)}
                    title="Delete column"
                  ></i>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="card border bg-white export-preview" style={{ zIndex: 1 }}>
          <div className="card-header bg-light border-secondary">
            <h4 className="h6 fw-semibold mb-0 text-dark">
              <i className="bi bi-eye me-2"></i> Preview ({registrations.length} rekod)
            </h4>
          </div>
          {/* Card body — table directly for full-width border fit */}
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped table-sm align-middle mb-0 small w-100 table-fit">
              <thead>
                <tr>
                  {selectedFields.length > 0 && (
                    <th scope="col" className="text-center" style={{ width: '40px' }}>No</th>
                  )}
                  {selectedFields.length === 0 ? (
                    <th scope="col" className="text-muted fst-italic">Tiada column dipilih</th>
                  ) : (
                    selectedFields.map((f) => (
                      <th key={f.key} scope="col">
                        <span className="d-flex align-items-center gap-1">
                          {f.label}
                          <i
                            className={`bi bi-arrow-up ms-1 ${sortBy === f.key && sortDir === 'asc' ? 'text-primary' : 'text-muted'} fs-6`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setSortBy(f.key); setSortDir('asc') }}
                            title="Sort ascending"
                          ></i>
                          <i
                            className={`bi bi-arrow-down ms-1 ${sortBy === f.key && sortDir === 'desc' ? 'text-primary' : 'text-muted'} fs-6`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setSortBy(f.key); setSortDir('desc') }}
                            title="Sort descending"
                          ></i>
                          <i
                            className="bi bi-x-lg ms-1 fs-6"
                            style={{ cursor: 'pointer', opacity: 0.5 }}
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
                    <td colSpan={selectedFields.length + 1} className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={selectedFields.length + 1} className="text-center py-4 text-muted">
                      Tiada rekod dijumpai.
                    </td>
                  </tr>
                ) : (
                  sortedRegistrations.map((r, i) => (
                    <tr key={r.id}>
                      {selectedFields.length > 0 && (
                        <td className="text-center">{i + 1}</td>
                      )}
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

      </div>

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

      {/* ===== Success Toast (save/load) ===== */}
      {toast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3">
          <div className="toast align-items-center text-bg-success border-0" role="alert">
            <div className="d-flex">
              <div className="toast-body">{toast}</div>
              <button
                type="button"
                className="btn-close btn-close-success me-2 m-auto"
                onClick={() => setToast('')}
              ></button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default ExportPage
