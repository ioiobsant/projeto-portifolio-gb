const STORAGE_KEY = 'gba-settings'

export type ThemeMode = 'light' | 'dark'

export interface AppSettings {
  businessName: string
  orderIdPrefix: string
  themeMode: ThemeMode
}

const MONTH_INITIALS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const

function getCurrentMonthInitials(): (typeof MONTH_INITIALS)[number] {
  const m = new Date().getMonth()
  return MONTH_INITIALS[m] ?? 'JAN'
}

const defaults: AppSettings = {
  businessName: 'Genice Brandão Atelier',
  orderIdPrefix: getCurrentMonthInitials(),
  themeMode: 'light',
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const themeMode = parsed.themeMode === 'dark' ? 'dark' : 'light'
    return {
      businessName: typeof parsed.businessName === 'string' ? parsed.businessName : defaults.businessName,
      orderIdPrefix:
        typeof parsed.orderIdPrefix === 'string' && MONTH_INITIALS.includes(parsed.orderIdPrefix.trim().toUpperCase() as (typeof MONTH_INITIALS)[number])
          ? parsed.orderIdPrefix.trim().toUpperCase()
          : defaults.orderIdPrefix,
      themeMode,
    }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}
