import type { RegistrationFormData } from '../lib/types'

export const validateForm = (data: RegistrationFormData): Record<string, string> => {
  const errors: Record<string, string> = {}

  // Nama Pemohon
  if (!data.nama_pemohon.trim()) {
    errors.nama_pemohon = 'Nama Pemohon diperlukan'
  }

  // No. Kad Pengenalan — 12 digits, no dashes
  const icRegex = /^\d{12}$/
  if (!data.no_kad_pengenalan) {
    errors.no_kad_pengenalan = 'No. Kad Pengenalan diperlukan'
  } else if (!icRegex.test(data.no_kad_pengenalan)) {
    errors.no_kad_pengenalan = 'Format salah. Masukkan 12 angka tanpa tanda - (contoh: 470911101234)'
  }

  // Alamat
  if (!data.alamat_dalam_kad_pengenalan.trim()) {
    errors.alamat_dalam_kad_pengenalan = 'Alamat diperlukan'
  }

  // No Unit — format DB00-00-00
  const unitRegex = /^DB\d{2}-\d{2}-\d{2}$/
  if (!data.no_unit) {
    errors.no_unit = 'No Unit diperlukan'
  } else if (!unitRegex.test(data.no_unit)) {
    errors.no_unit = 'Format salah. Gunakan format DB00-00-00'
  }

  // Status Pemilikan
  if (!data.status_pemilikan) {
    errors.status_pemilikan = 'Sila pilih status pemilikan'
  }

  // No H/P — Malaysian format
  const hpRegex = /^01[2-9]\d{7,8}$/
  if (!data.no_hp) {
    errors.no_hp = 'No H/P diperlukan'
  } else if (!hpRegex.test(data.no_hp.replace(/[-\s]/g, ''))) {
    errors.no_hp = 'Format salah. Contoh: 012-3456789'
  }

  // Email (optional but if filled, validate)
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Format email tidak sah'
  }

  // Status Perkahwinan
  if (!data.status_perkahwinan) {
    errors.status_perkahwinan = 'Sila pilih status perkahwinan'
  }

  // Tempoh Masa
  if (!data.tempoh_masa_menetap) {
    errors.tempoh_masa_menetap = 'Sila pilih tempoh masa'
  }

  // Bilangan Isi Rumah
  if (!data.bilangan_isi_rumah) {
    errors.bilangan_isi_rumah = 'Sila pilih bilangan isi rumah'
  }

  // Pengakuan
  if (!data.pengakuan) {
    errors.pengakuan = 'Anda perlu mengaku bahawa maklumat adalah benar'
  }

  return errors
}
