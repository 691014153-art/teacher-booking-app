import type { DataPackage } from '@/lib/dataExport'
import type { CourseType, Teacher, TimeSlot } from '@/types'

/** 家长选完文件后暂存，跳转到 ?teacher= 后由 AppContext 读取并清除 */
export const SCHEDULE_FILE_IMPORT_KEY = 'teacher_booking_file_import_v1'

export function normalizeDataPackage(o: unknown): DataPackage | null {
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const teacher = r.teacher as Teacher
  if (!teacher?.id || typeof teacher.id !== 'string') return null
  const rawSlots = r.timeSlots
  if (!Array.isArray(rawSlots)) return null
  const timeSlots: TimeSlot[] = rawSlots.map((s: TimeSlot) => ({
    ...s,
    startTime: new Date(s.startTime as unknown as string),
    endTime: new Date(s.endTime as unknown as string)
  }))
  const courseTypes = Array.isArray(r.courseTypes) ? (r.courseTypes as CourseType[]) : []

  return {
    teacher,
    timeSlots,
    courseTypes,
    exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : new Date().toISOString()
  }
}

/** 校验并把原始 JSON 文本写入 sessionStorage，随后应跳转到 ?teacher=教师ID */
export function storeScheduleFileImportFromText(text: string): { ok: true; teacherId: string } | { ok: false; reason: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: '不是有效的 JSON 文件' }
  }
  const pkg = normalizeDataPackage(parsed)
  if (!pkg) {
    return { ok: false, reason: '文件内容不是课表格式（需含 teacher、timeSlots）' }
  }
  try {
    sessionStorage.setItem(SCHEDULE_FILE_IMPORT_KEY, text)
  } catch {
    return { ok: false, reason: '浏览器无法暂存文件（请关闭无痕模式重试）' }
  }
  return { ok: true, teacherId: pkg.teacher.id }
}

/** 与当前 URL 中的教师 ID 匹配则取出并删除缓存；不匹配则丢弃缓存避免串台 */
export function tryConsumeScheduleFileImportForTeacher(teacherId: string): DataPackage | null {
  const raw = sessionStorage.getItem(SCHEDULE_FILE_IMPORT_KEY)
  if (!raw) return null
  sessionStorage.removeItem(SCHEDULE_FILE_IMPORT_KEY)
  try {
    const pkg = normalizeDataPackage(JSON.parse(raw))
    if (!pkg || pkg.teacher.id !== teacherId) return null
    return pkg
  } catch {
    return null
  }
}

export function downloadSchedulePackageFile(pkg: DataPackage): void {
  const json = JSON.stringify(
    {
      teacher: pkg.teacher,
      timeSlots: pkg.timeSlots,
      courseTypes: pkg.courseTypes,
      exportedAt: pkg.exportedAt ?? new Date().toISOString()
    },
    null,
    2
  )
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  const safe = pkg.teacher.name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 24) || '教师'
  a.download = `课表-${safe}-${new Date().toISOString().slice(0, 10)}.json`
  a.href = URL.createObjectURL(blob)
  a.click()
  URL.revokeObjectURL(a.href)
}
