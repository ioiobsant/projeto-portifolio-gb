/**
 * Formata o valor enquanto o usuário digita no padrão brasileiro: R$ 1.234,56
 * (ponto para milhares, vírgula para decimais)
 */
export function formatBrazilianCurrency(value: string): string {
  const digitsAndComma = value.replace(/[^\d,]/g, '')
  const commaIndex = digitsAndComma.indexOf(',')
  let intPart: string
  let decPart: string
  if (commaIndex >= 0) {
    intPart = digitsAndComma.slice(0, commaIndex).replace(/,/g, '')
    decPart = digitsAndComma.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2)
  } else {
    intPart = digitsAndComma.replace(/,/g, '')
    decPart = ''
  }
  if (intPart.length === 0 && decPart.length === 0 && commaIndex < 0) return ''
  const intForFormat = intPart.length > 0 ? intPart : '0'
  const formattedInt = intForFormat.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  // Mostra a vírgula assim que o usuário digitar ",", para permitir adicionar centavos
  if (commaIndex >= 0) return `R$ ${formattedInt},${decPart}`
  return `R$ ${formattedInt}`
}

/**
 * Converte o valor formatado (ex.: "R$ 3.500,50") de volta para número.
 */
export function parseBrazilianCurrency(formatted: string): number {
  const normalized = formatted.replace(/\s/g, '').replace(/R\$/i, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Formata um número para exibição inicial no campo (ex.: 3500 -> "R$ 3.500,00").
 */
export function formatBrazilianCurrencyFromNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  return formatBrazilianCurrency(n.toFixed(2).replace('.', ','))
}
