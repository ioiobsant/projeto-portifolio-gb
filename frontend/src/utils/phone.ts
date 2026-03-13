/**
 * Formata uma string de dígitos no padrão brasileiro de telefone enquanto o usuário digita.
 * Celular (11 dígitos, 3º dígito = 9): (XX) 9XXXX-XXXX
 * Fixo (10 dígitos): (XX) XXXX-XXXX
 */
export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  const isMobile = digits[2] === '9'
  // Só coloca o hífen quando houver dígito depois, para o backspace conseguir "remover" o hífen
  if (isMobile) return digits.length > 7 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return digits.length > 6 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` : `(${digits.slice(0, 2)}) ${digits.slice(2)}`
}
