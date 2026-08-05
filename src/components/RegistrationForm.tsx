import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { RegistrationFormData } from '../lib/types'
import { validateForm } from '../utils/validation'

const initialState: RegistrationFormData = {
  nama_pemohon: '',
  no_kad_pengenalan: '',
  alamat_dalam_kad_pengenalan: '',
  no_unit: '',
  status_pemilikan: '',
  no_hp: '',
  email: '',
  status_perkahwinan: '',
  tempoh_masa_menetap: '',
  bilangan_isi_rumah: '',
  pengakuan: false,
}

export default function RegistrationForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegistrationFormData>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({ ...prev, [name]: val }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (submitError) setSubmitError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const { error } = await supabase.from('kariah_registrations').insert([
        {
          nama_pemohon: formData.nama_pemohon,
          no_kad_pengenalan: formData.no_kad_pengenalan,
          alamat_dalam_kad_pengenalan: formData.alamat_dalam_kad_pengenalan,
          no_unit: formData.no_unit,
          status_pemilikan: formData.status_pemilikan,
          no_hp: formData.no_hp,
          email: formData.email || null,
          status_perkahwinan: formData.status_perkahwinan,
          tempoh_masa_menetap: formData.tempoh_masa_menetap,
          bilangan_isi_rumah: formData.bilangan_isi_rumah,
          pengakuan: formData.pengakuan,
        },
      ])

      if (error) throw error

      setSubmitError('')
      navigate('/success')
    } catch (err: any) {
      setSubmitError(err?.message || 'Ralat tidak diketahui. Sila cuba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const yearsOptions = ['1', '2', '3', '4', '5', '6', '7']
  const householdOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <div className="container">
      <div className="form-container mx-auto">
        <div className="form-card card">
          {/* Header */}
          <div className="card-header">
            <h2>BORANG PENDAFTARAN</h2>
            <h4 className="text-secondary mb-0">KARIah Surau De Bayu</h4>
          </div>

          {/* Body */}
          <div className="card-body">
            {submitError && (
              <div className="alert alert-danger" role="alert">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Row 1: Nama + IC */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="nama_pemohon" className="form-label">
                    Nama Pemohon <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nama_pemohon ? 'is-invalid' : ''}`}
                    id="nama_pemohon"
                    name="nama_pemohon"
                    value={formData.nama_pemohon}
                    onChange={handleChange}
                    placeholder="Masukkan nama penuh"
                  />
                  {errors.nama_pemohon && <div className="invalid-feedback">{errors.nama_pemohon}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="no_kad_pengenalan" className="form-label">
                    No. Kad Pengenalan <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.no_kad_pengenalan ? 'is-invalid' : ''}`}
                    id="no_kad_pengenalan"
                    name="no_kad_pengenalan"
                    value={formData.no_kad_pengenalan}
                    onChange={handleChange}
                    placeholder="470911101234 (tanpa -)"
                  />
                  {errors.no_kad_pengenalan && <div className="invalid-feedback">{errors.no_kad_pengenalan}</div>}
                </div>
              </div>

              {/* Alamat */}
              <div className="mt-3">
                <label htmlFor="alamat_dalam_kad_pengenalan" className="form-label">
                  Alamat Dalam Kad Pengenalan <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`form-control ${errors.alamat_dalam_kad_pengenalan ? 'is-invalid' : ''}`}
                  id="alamat_dalam_kad_pengenalan"
                  name="alamat_dalam_kad_pengenalan"
                  rows={2}
                  value={formData.alamat_dalam_kad_pengenalan}
                  onChange={handleChange}
                  placeholder="Alamat seperti di IC"
                />
                {errors.alamat_dalam_kad_pengenalan && (
                  <div className="invalid-feedback">{errors.alamat_dalam_kad_pengenalan}</div>
                )}
              </div>

              {/* Static address info */}
              <div className="mt-2 p-2 bg-light rounded border-start">
                <small className="text-muted">
                  Pangsapuri De Bayu, No2. Persiaran Setia Makmur,<br />
                  Seksyen U13 Setia Alam, 40170 Shah Alam, Selangor Darul Ehsan
                </small>
              </div>

              {/* Row 2: Unit + Status Pemilikan */}
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label htmlFor="no_unit" className="form-label">
                    No Unit (De Bayu) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.no_unit ? 'is-invalid' : ''}`}
                    id="no_unit"
                    name="no_unit"
                    value={formData.no_unit}
                    onChange={handleChange}
                    placeholder="DB00-00-00"
                  />
                  {errors.no_unit && <div className="invalid-feedback">{errors.no_unit}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="status_pemilikan" className="form-label">
                    Status Pemilikan <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.status_pemilikan ? 'is-invalid' : ''}`}
                    id="status_pemilikan"
                    name="status_pemilikan"
                    value={formData.status_pemilikan}
                    onChange={handleChange}
                  >
                    <option value="">Pilih</option>
                    <option value="Pemilik">Pemilik</option>
                    <option value="Penyewa">Penyewa</option>
                  </select>
                  {errors.status_pemilikan && <div className="invalid-feedback">{errors.status_pemilikan}</div>}
                </div>
              </div>

              {/* Row 3: HP + Email */}
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label htmlFor="no_hp" className="form-label">
                    No H/P <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.no_hp ? 'is-invalid' : ''}`}
                    id="no_hp"
                    name="no_hp"
                    value={formData.no_hp}
                    onChange={handleChange}
                    placeholder="012-3456789"
                  />
                  {errors.no_hp && <div className="invalid-feedback">{errors.no_hp}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nama@email.com (optional)"
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
              </div>

              {/* Row 4: Status Perkahwinan + Tempoh */}
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label htmlFor="status_perkahwinan" className="form-label">
                    Status Perkahwinan <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.status_perkahwinan ? 'is-invalid' : ''}`}
                    id="status_perkahwinan"
                    name="status_perkahwinan"
                    value={formData.status_perkahwinan}
                    onChange={handleChange}
                  >
                    <option value="">Pilih</option>
                    <option value="Bujang">Bujang</option>
                    <option value="Berkahwin">Berkahwin</option>
                  </select>
                  {errors.status_perkahwinan && <div className="invalid-feedback">{errors.status_perkahwinan}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="tempoh_masa_menetap" className="form-label">
                    Tempoh Masa Telah Menetap (Tahun) <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.tempoh_masa_menetap ? 'is-invalid' : ''}`}
                    id="tempoh_masa_menetap"
                    name="tempoh_masa_menetap"
                    value={formData.tempoh_masa_menetap}
                    onChange={handleChange}
                  >
                    <option value="">Pilih</option>
                    <option value="bawah_1">Bawah 1 tahun</option>
                    {yearsOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {errors.tempoh_masa_menetap && <div className="invalid-feedback">{errors.tempoh_masa_menetap}</div>}
                </div>
              </div>

              {/* Bilangan Isi Rumah */}
              <div className="mt-3">
                <label htmlFor="bilangan_isi_rumah" className="form-label">
                  Bilangan Isi Rumah <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.bilangan_isi_rumah ? 'is-invalid' : ''}`}
                  id="bilangan_isi_rumah"
                  name="bilangan_isi_rumah"
                  value={formData.bilangan_isi_rumah}
                  onChange={handleChange}
                >
                  <option value="">Pilih</option>
                  {householdOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {errors.bilangan_isi_rumah && <div className="invalid-feedback">{errors.bilangan_isi_rumah}</div>}
              </div>

              {/* Pengakuan */}
              <div className="mt-3">
                <div className="form-check">
                  <input
                    className={`form-check-input ${errors.pengakuan ? 'is-invalid' : ''}`}
                    type="checkbox"
                    id="pengakuan"
                    name="pengakuan"
                    checked={formData.pengakuan}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="pengakuan">
                    Saya mengaku bahawa segala maklumat yang terkandung diatas adalah benar.
                  </label>
                  {errors.pengakuan && <div className="text-danger small mt-1">{errors.pengakuan}</div>}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="card-footer">
            <button
              type="submit"
              className="btn btn-primary w-100"
              onClick={handleSubmit}
              disabled={isSubmitting}
              form="registration-form"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Menghantar...
                </>
              ) : (
                'Hantar Pendaftaran'
              )}
            </button>
            <small className="text-muted mt-2 d-block">
              Borang ini adalah khusus untuk ahli kariah De Bayu sahaja
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}
