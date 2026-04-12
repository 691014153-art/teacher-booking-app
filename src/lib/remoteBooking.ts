import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Booking } from '@/types'

const TABLE = 'bookings'

interface BookingRow {
  id: string
  teacher_id: string
  slot_id: string
  booked_date: string | null
  booked_start_time: string | null
  booked_end_time: string | null
  course_type_id: string | null
  parent_name: string
  parent_phone: string
  student_name: string
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    slotId: row.slot_id,
    bookedDate: row.booked_date ?? undefined,
    bookedStartTime: row.booked_start_time ?? undefined,
    bookedEndTime: row.booked_end_time ?? undefined,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    studentName: row.student_name,
    courseTypeId: row.course_type_id ?? '',
    notes: row.notes ?? undefined,
    status: row.status as Booking['status'],
    createdAt: new Date(row.created_at),
  }
}

function bookingToRow(teacherId: string, b: Booking) {
  return {
    id: b.id,
    teacher_id: teacherId,
    slot_id: b.slotId,
    booked_date: b.bookedDate || null,
    booked_start_time: b.bookedStartTime || null,
    booked_end_time: b.bookedEndTime || null,
    course_type_id: b.courseTypeId || null,
    parent_name: b.parentName,
    parent_phone: b.parentPhone,
    student_name: b.studentName,
    notes: b.notes || '',
    status: b.status,
    created_at: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  }
}

export async function createBookingsRemote(
  teacherId: string,
  bookings: Booking[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: '未配置 Supabase' }

  const rows = bookings.map(b => bookingToRow(teacherId, b))

  const { error } = await supabase.from(TABLE).insert(rows)
  if (error) {
    console.warn('[Supabase] 创建预约失败:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function fetchBookingsRemote(teacherId: string): Promise<Booking[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[Supabase] 获取预约失败:', error)
    return []
  }
  return (data ?? []).map((row: BookingRow) => rowToBooking(row))
}

export async function updateBookingStatusRemote(
  bookingId: string,
  status: Booking['status']
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: '未配置 Supabase' }

  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) {
    console.warn('[Supabase] 更新预约状态失败:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deleteBookingRemote(
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: '未配置 Supabase' }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', bookingId)

  if (error) {
    console.warn('[Supabase] 删除预约失败:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function fetchBookingsByIdsRemote(ids: string[]): Promise<Booking[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('id', ids)

  if (error) {
    console.warn('[Supabase] 按ID获取预约失败:', error)
    return []
  }
  return (data ?? []).map((row: BookingRow) => rowToBooking(row))
}
