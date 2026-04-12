import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { DataPackage } from '@/lib/dataExport'
import type { CourseType, Teacher, TimeSlot } from '@/types'

const TABLE = 'teacher_schedules'

/** 拼成一段可复制的报错（弹窗 / 发给别人排查用） */
export function formatSupabaseError(error: {
  message: string
  code?: string
  details?: string
  hint?: string
}): string {
  const parts = [error.message]
  if (error.code) parts.push(`code=${error.code}`)
  if (error.details) parts.push(`details=${error.details}`)
  if (error.hint) parts.push(`hint=${error.hint}`)
  return parts.join(' | ')
}

function reviveDataPackage(raw: unknown): DataPackage | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const teacher = o.teacher as Teacher
  if (!teacher?.id) return null
  const rawSlots = o.timeSlots
  if (!Array.isArray(rawSlots)) return null

  const timeSlots: TimeSlot[] = rawSlots.map((s: TimeSlot) => ({
    ...s,
    startTime: new Date(s.startTime as unknown as string),
    endTime: new Date(s.endTime as unknown as string)
  }))

  const courseTypes = Array.isArray(o.courseTypes) ? (o.courseTypes as CourseType[]) : []

  return {
    teacher,
    timeSlots,
    courseTypes,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : new Date().toISOString()
  }
}

export async function fetchTeacherScheduleRemote(teacherId: string): Promise<DataPackage | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from(TABLE)
    .select('payload')
    .eq('teacher_id', teacherId)
    .maybeSingle()

  if (error) {
    const text = formatSupabaseError(error)
    console.warn('[Supabase] 读取课表失败:', text, error)
    return null
  }

  if (!data?.payload) return null
  return reviveDataPackage(data.payload)
}

export async function upsertTeacherScheduleRemote(
  teacherId: string,
  pkg: DataPackage
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: '未配置 Supabase' }
  }

  const payload = {
    teacher: pkg.teacher,
    timeSlots: pkg.timeSlots,
    courseTypes: pkg.courseTypes,
    exportedAt: pkg.exportedAt ?? new Date().toISOString()
  }

  const { error } = await supabase.from(TABLE).upsert(
    {
      teacher_id: teacherId,
      payload,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'teacher_id' }
  )

  if (error) {
    const text = formatSupabaseError(error)
    console.warn('[Supabase] 同步课表失败:', text, error)
    return { ok: false, error: text }
  }

  return { ok: true }
}
