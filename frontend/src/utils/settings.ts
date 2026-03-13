const STORAGE_KEY = 'gba-settings'

export type ThemeMode = 'light' | 'dark'

export interface AppSettings {
  businessName: string
  orderIdPrefix: string
  themeMode: ThemeMode
}

const defaults: AppSettings = {
  businessName: 'Genice Brandão Atelier',
  orderIdPrefix: 'GBA',
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
      orderIdPrefix: typeof parsed.orderIdPrefix === 'string' ? parsed.orderIdPrefix.trim() || defaults.orderIdPrefix : defaults.orderIdPrefix,
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
