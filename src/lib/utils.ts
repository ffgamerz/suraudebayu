/**
 * Censor IC (Malaysian ID card number)
 * Shows only first 6 digits and last 1 digit, with asterisks in between
 * Example: 84092312345678 -> 840923*****7
 */
export const censorIC = (noKad: string | undefined | null): string => {
  if (!noKad || typeof noKad !== 'string') return '-'
  const digits = noKad.replace(/\D/g, '')
  if (digits.length <= 7) return digits // tidak cukup untuk censored
  const first6 = digits.slice(0, 6)
  const last1 = digits.slice(-1)
  const maskedCount = digits.length - 7
  return `${first6}${'*'.repeat(maskedCount)}${last1}`
}