export function getTeacherIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('teacher')
}

export function getModeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('mode')
}
