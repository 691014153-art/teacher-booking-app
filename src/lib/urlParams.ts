export function getTeacherIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('teacher')
}

export function getModeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('mode')
}

export function getBaseUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function navigateTo(params?: string): void {
  const base = getBaseUrl().replace(/\/$/, '')
  window.location.href = params ? `${base}?${params}` : base
}
