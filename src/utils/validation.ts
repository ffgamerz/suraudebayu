import type { RegistrationFormData } from '../lib/types'

// Format patterns based on Google Form specifications
// Malaysian IC: 12 digits, e.g., "470911101234" (YYMMDD-SS-####, no dashes)
// Malaysian HP: starts with 01X, 10-11 digits total, no dashes or spaces, e.g., "0123456789"
// De Bayu Unit: "DB##-##-##"
//   - Block: 01, 02, 03 (3 blocks total)
//   - Floor: maks 16 (Block 1 & 3 have 16 floors, Block 2 has 15 floors)
//   - Unit: 01-16

const IC_REGEX = /^\d{12}$/
// HP: 9-11 digits, starts with 01, 1-9, rest digits
// Covers all Malaysian mobile prefixes (011, 012, 013, 014, 017, 018, 019)
const HP_REGEX = /^01[1-9]\d{7,9}$/
const UNIT_REGEX = /^DB\d{2}-\d{2}-\d{2}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validate De Bayu unit number with block/floor/unit logic
export const validateUnit = (unit: string): string => {
  if (!unit) return 'Sila isi no. unit anda'

  if (!UNIT_REGEX.test(unit)) {
    return 'Format salah. Gunakan format: DB01-16-13 (DB-Blok-Tingkat-Unit)'
  }

  const parts = unit.split('-')
  const block = parseInt(parts[0].replace('DB', ''))
  const floor = parseInt(parts[1])
  const unitNum = parseInt(parts[2])

  // Validate block (1-3)
  if (block < 1 || block > 3) {
    return 'Blok tidak sah. Hanya ada blok 1, 2, dan 3'
  }

  // Validate floor per block
  const maxFloor = block === 2 ? 15 : 16
  if (floor < 1 || floor > maxFloor) {
    return `Tingkat tidak sah. Blok ${block} ada ${maxFloor} tingkat (1-${maxFloor})`
  }

  // Validate unit (1-16 max)
  if (unitNum < 1 || unitNum > 16) {
    return 'Unit tidak sah. Unit mesti antara 01-16'
  }

  return ''
}

export const validateForm = (data: RegistrationFormData): Record<string, string> => {
  const errors: Record<string, string> = {}

  // Nama Pemohon
  if (!data.nama_pemohon || !data.nama_pemohon.trim()) {
    errors.nama_pemohon = 'Sila isi nama penuh anda'
  }

  // No. Kad Pengenalan — 12 digits, no dashes
  if (!data.no_kad_pengenalan) {
    errors.no_kad_pengenalan = 'Sila isi no. kad pengenalan'
  } else if (!IC_REGEX.test(data.no_kad_pengenalan)) {
    errors.no_kad_pengenalan =
      'Format salah. Masukkan 12 angka tanpa tanda - (contoh: 470911101234)'
  }

  // Alamat Dalam Kad Pengenalan
  if (!data.alamat_dalam_kad_pengenalan || !data.alamat_dalam_kad_pengenalan.trim()) {
    errors.alamat_dalam_kad_pengenalan = 'Sila isi alamat anda'
  }

  // No Unit (De Bayu)
  if (!data.no_unit) {
    errors.no_unit = 'Sila isi no. unit anda'
  } else {
    const unitError = validateUnit(data.no_unit)
    if (unitError) errors.no_unit = unitError
  }

  // Status Pemilikan
  if (!data.status_pemilikan) {
    errors.status_pemilikan = 'Sila pilih status pemilikan'
  }

  // No H/P — Malaysian mobile, no dashes or spaces, 10-11 digits
  if (!data.no_hp) {
    errors.no_hp = 'Sila isi no. telefon bimbit anda'
  } else if (!HP_REGEX.test(data.no_hp)) {
    errors.no_hp = 'Format salah. Gunakan 10-11 digit tanpa tanda - atau spasi (contoh: 0123456789)'
  }

  // Email (optional but if filled, validate)
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.email = 'Format email tidak sah'
  }

  // Status Perkahwinan
  if (!data.status_perkahwinan) {
    errors.status_perkahwinan = 'Sila pilih status perkahwinan'
  }

  // Tempoh Masa Telah Menetap
  if (!data.tempoh_masa_menetap) {
    errors.tempoh_masa_menetap = 'Sila pilih tempoh masa menetap'
  }

  // Bilangan Isi Rumah
  if (!data.bilangan_isi_rumah) {
    errors.bilangan_isi_rumah = 'Sila pilih bilangan isi rumah'
  }

  // Pengakuan
  if (!data.pengakuan) {
    errors.pengakuan = 'Sila sahkan bahawa maklumat di atas benar'
  }

  return errors
}

// Field-specific validation for real-time (on blur) checking
export const validateField = (
  name: string,
  value: string | boolean | number
): string => {
  if (typeof value === 'string') {
    value = value.trim()
  }

  // Required check for fields that can't be empty
  const alwaysEmpty =
    value === '' ||
    value === null ||
    value === undefined ||
    (typeof value === 'boolean' && !value)

  const requiredFields = [
    'nama_pemohon',
    'no_kad_pengenalan',
    'alamat_dalam_kad_pengenalan',
    'no_unit',
    'status_pemilikan',
    'no_hp',
    'status_perkahwinan',
    'tempoh_masa_menetap',
    'bilangan_isi_rumah',
  ]

  if (requiredFields.includes(name) && alwaysEmpty) {
    const messages: Record<string, string> = {
      nama_pemohon: 'Sila isi nama penuh anda',
      no_kad_pengenalan: 'Sila isi no. kad pengenalan',
      alamat_dalam_kad_pengenalan: 'Sila isi alamat anda',
      no_unit: 'Sila isi no. unit anda',
      status_pemilikan: 'Sila pilih status pemilikan',
      no_hp: 'Sila isi no. telefon bimbit anda',
      status_perkahwinan: 'Sila pilih status perkahwinan',
      tempoh_masa_menetap: 'Sila pilih tempoh masa menetap',
      bilangan_isi_rumah: 'Sila pilih bilangan isi rumah',
    }
    return messages[name]
  }

  if (value === false && name === 'pengakuan') {
    return 'Sila sahkan bahawa maklumat di atas benar'
  }

  // Format-specific checks (only if value is non-empty)
  if (typeof value === 'string' && value && name === 'no_kad_pengenalan') {
    if (!IC_REGEX.test(value)) {
      return 'Format salah. Masukkan 12 angka tanpa tanda - (contoh: 470911101234)'
    }
  }

  if (typeof value === 'string' && value && name === 'no_unit') {
    const unitError = validateUnit(value)
    if (unitError) return unitError
  }

  if (typeof value === 'string' && value && name === 'no_hp') {
    if (!HP_REGEX.test(value)) {
      return 'Format salah. Gunakan 10-11 digit tanpa tanda - atau spasi (contoh: 0123456789)'
    }
  }

  if (typeof value === 'string' && value && name === 'email') {
    if (!EMAIL_REGEX.test(value)) {
      return 'Format email tidak sah'
    }
  }

  return ''
}
