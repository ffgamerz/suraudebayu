import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'

type RegistrationRow = RegistrationFormData & {
  id: number
  created_at: string
}

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
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
      setError(err.message || 'Failed to fetch registrations')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const filtered = search
    ? registrations.filter((r) =>
        r.nama_pemohon?.toLowerCase().includes(search.toLowerCase()) ||
        r.no_kad_pengenalan?.includes(search) ||
        r.no_unit?.toLowerCase().includes(search.toLowerCase())
      )
    : registrations

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-gradient mb-1">Semua Pendaftaran</h2>
          <p className="text-secondary small mb-0">
            Jumlah: {registrations.length} • Pengguna: {user?.email}
          </p>
        </div>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={handleLogout}
        >
          Log Keluar
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Cari nama, IC, atau unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-secondary text-center py-4 mb-0">
              Tiada rekod dijumpai.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>IC</th>
                    <th>Unit</th>
                    <th>H/P</th>
                    <th>Pemilik</th>
                    <th>Isi Rumah</th>
                    <th>Tarikh</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.nama_pemohon}</td>
                      <td>{r.no_kad_pengenalan}</td>
                      <td>{r.no_unit}</td>
                      <td>{r.no_hp}</td>
                      <td>{r.status_pemilikan}</td>
                      <td>{r.bilangan_isi_rumah}</td>
                      <td>{new Date(r.created_at).toLocaleDateString('ms-MY')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
