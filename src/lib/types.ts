// Form field types for Kariah Surau De Bayu registration
export type OwnershipStatus = 'Pemilik' | 'Penyewa' | ''
export type MaritalStatus = 'Bujang' | 'Berkahwin' | ''
export type YearsLived = 'bawah_1' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | ''
export type HouseholdSize = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | ''

export interface RegistrationFormData {
  nama_pemohon: string
  no_kad_pengenalan: string
  alamat_dalam_kad_pengenalan: string
  no_unit: string
  status_pemilikan: OwnershipStatus
  no_hp: string
  email: string
  status_perkahwinan: MaritalStatus
  tempoh_masa_menetap: YearsLived
  bilangan_isi_rumah: HouseholdSize
  pengakuan: boolean
}
