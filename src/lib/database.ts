import { supabase, isSupabaseConfigured } from './supabase'
import { TimeSlot, Booking, CourseType, Teacher } from '@/types'

// 生成UUID
function generateId(): string {
  return crypto.randomUUID()
}

// ============ 教师相关操作 ============

export async function getAllTeachers(): Promise<Teacher[]> {
  if (!isSupabaseConfigured()) {
    // 降级到 localStorage
    const data = localStorage.getItem('all_teachers')
    return data ? JSON.parse(data) : []
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取教师列表失败:', error)
    return []
  }

  return data || []
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  if (!isSupabaseConfigured()) {
    const teachers = await getAllTeachers()
    return teachers.find(t => t.id === id) || null
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('获取教师信息失败:', error)
    return null
  }

  return data
}

export async function createTeacher(name: string): Promise<Teacher> {
  const teacher: Teacher = {
    id: isSupabaseConfigured() ? '' : generateId(), // Supabase 会自动生成
    name,
    subjects: [],
    bio: ''
  }

  if (!isSupabaseConfigured()) {
    const teachers = await getAllTeachers()
    teachers.push(teacher)
    localStorage.setItem('all_teachers', JSON.stringify(teachers))
    return teacher
  }

  const { data, error } = await supabase
    .from('teachers')
    .insert({ name, subjects: [], bio: '' })
    .select()
    .single()

  if (error) {
    console.error('创建教师失败:', error)
    throw error
  }

  return data
}

export async function updateTeacher(id: string, updates: Partial<Teacher>): Promise<void> {
  if (!isSupabaseConfigured()) {
    const teachers = await getAllTeachers()
    const index = teachers.findIndex(t => t.id === id)
    if (index >= 0) {
      teachers[index] = { ...teachers[index], ...updates }
      localStorage.setItem('all_teachers', JSON.stringify(teachers))
    }
    return
  }

  const { error } = await supabase
    .from('teachers')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('更新教师失败:', error)
    throw error
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const teachers = await getAllTeachers()
    const filtered = teachers.filter(t => t.id !== id)
    localStorage.setItem('all_teachers', JSON.stringify(filtered))
    // 清除关联数据
    localStorage.removeItem(`teacher_${id}_timeSlots`)
    localStorage.removeItem(`teacher_${id}_bookings`)
    localStorage.removeItem(`teacher_${id}_courseTypes`)
    localStorage.removeItem(`teacher_${id}_info`)
    return
  }

  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除教师失败:', error)
    throw error
  }
}

// ============ 时间段相关操作 ============

export async function getTimeSlots(teacherId: string): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured()) {
    const key = `teacher_${teacherId}_timeSlots`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('获取时间段失败:', error)
    return []
  }

  // 转换数据库字段到前端格式
  return (data || []).map(slot => ({
    id: slot.id,
    startTime: new Date(slot.start_time),
    endTime: new Date(slot.end_time),
    isRecurring: slot.is_recurring,
    recurringPattern: slot.recurring_pattern,
    dayOfWeek: slot.day_of_week
  }))
}

export async function addTimeSlot(teacherId: string, slot: Omit<TimeSlot, 'id'>): Promise<TimeSlot> {
  const newSlot: TimeSlot = {
    ...slot,
    id: isSupabaseConfigured() ? '' : generateId()
  }

  if (!isSupabaseConfigured()) {
    const slots = await getTimeSlots(teacherId)
    slots.push(newSlot)
    localStorage.setItem(`teacher_${teacherId}_timeSlots`, JSON.stringify(slots))
    return newSlot
  }

  const { data, error } = await supabase
    .from('time_slots')
    .insert({
      teacher_id: teacherId,
      start_time: slot.startTime.toISOString(),
      end_time: slot.endTime.toISOString(),
      is_recurring: slot.isRecurring,
      recurring_pattern: slot.recurringPattern,
      day_of_week: slot.dayOfWeek
    })
    .select()
    .single()

  if (error) {
    console.error('添加时间段失败:', error)
    throw error
  }

  return {
    id: data.id,
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    isRecurring: data.is_recurring,
    recurringPattern: data.recurring_pattern,
    dayOfWeek: data.day_of_week
  }
}

export async function removeTimeSlot(teacherId: string, slotId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const slots = await getTimeSlots(teacherId)
    const filtered = slots.filter(s => s.id !== slotId)
    localStorage.setItem(`teacher_${teacherId}_timeSlots`, JSON.stringify(filtered))
    return
  }

  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', slotId)

  if (error) {
    console.error('删除时间段失败:', error)
    throw error
  }
}

// ============ 课程类型相关操作 ============

export async function getCourseTypes(teacherId: string): Promise<CourseType[]> {
  if (!isSupabaseConfigured()) {
    const key = `teacher_${teacherId}_courseTypes`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  const { data, error } = await supabase
    .from('course_types')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('获取课程类型失败:', error)
    return []
  }

  return data || []
}

export async function addCourseType(teacherId: string, course: Omit<CourseType, 'id'>): Promise<CourseType> {
  const newCourse: CourseType = {
    ...course,
    id: isSupabaseConfigured() ? '' : generateId()
  }

  if (!isSupabaseConfigured()) {
    const courses = await getCourseTypes(teacherId)
    courses.push(newCourse)
    localStorage.setItem(`teacher_${teacherId}_courseTypes`, JSON.stringify(courses))
    return newCourse
  }

  const { data, error } = await supabase
    .from('course_types')
    .insert({
      teacher_id: teacherId,
      name: course.name,
      duration: course.duration,
      color: course.color,
      description: course.description
    })
    .select()
    .single()

  if (error) {
    console.error('添加课程类型失败:', error)
    throw error
  }

  return data
}

export async function updateCourseType(teacherId: string, id: string, updates: Partial<CourseType>): Promise<void> {
  if (!isSupabaseConfigured()) {
    const courses = await getCourseTypes(teacherId)
    const index = courses.findIndex(c => c.id === id)
    if (index >= 0) {
      courses[index] = { ...courses[index], ...updates }
      localStorage.setItem(`teacher_${teacherId}_courseTypes`, JSON.stringify(courses))
    }
    return
  }

  const { error } = await supabase
    .from('course_types')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('更新课程类型失败:', error)
    throw error
  }
}

export async function removeCourseType(teacherId: string, id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const courses = await getCourseTypes(teacherId)
    const filtered = courses.filter(c => c.id !== id)
    localStorage.setItem(`teacher_${teacherId}_courseTypes`, JSON.stringify(filtered))
    return
  }

  const { error } = await supabase
    .from('course_types')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除课程类型失败:', error)
    throw error
  }
}

// ============ 预约相关操作 ============

export async function getBookings(teacherId: string): Promise<Booking[]> {
  if (!isSupabaseConfigured()) {
    const key = `teacher_${teacherId}_bookings`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取预约失败:', error)
    return []
  }

  return (data || []).map(booking => ({
    id: booking.id,
    slotId: booking.slot_id,
    courseTypeId: booking.course_type_id,
    parentName: booking.parent_name,
    parentPhone: booking.parent_phone,
    studentName: booking.student_name,
    notes: booking.notes,
    status: booking.status,
    createdAt: new Date(booking.created_at)
  }))
}

export async function addBooking(teacherId: string, booking: Omit<Booking, 'id' | 'createdAt' | 'status'>): Promise<Booking> {
  const newBooking: Booking = {
    ...booking,
    id: isSupabaseConfigured() ? '' : generateId(),
    status: 'pending',
    createdAt: new Date()
  }

  if (!isSupabaseConfigured()) {
    const bookings = await getBookings(teacherId)
    bookings.push(newBooking)
    localStorage.setItem(`teacher_${teacherId}_bookings`, JSON.stringify(bookings))
    return newBooking
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      teacher_id: teacherId,
      slot_id: booking.slotId,
      course_type_id: booking.courseTypeId,
      parent_name: booking.parentName,
      parent_phone: booking.parentPhone,
      student_name: booking.studentName,
      notes: booking.notes,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('添加预约失败:', error)
    throw error
  }

  return {
    id: data.id,
    slotId: data.slot_id,
    courseTypeId: data.course_type_id,
    parentName: data.parent_name,
    parentPhone: data.parent_phone,
    studentName: data.student_name,
    notes: data.notes,
    status: data.status,
    createdAt: new Date(data.created_at)
  }
}

export async function updateBookingStatus(teacherId: string, id: string, status: Booking['status']): Promise<void> {
  if (!isSupabaseConfigured()) {
    const bookings = await getBookings(teacherId)
    const index = bookings.findIndex(b => b.id === id)
    if (index >= 0) {
      bookings[index].status = status
      localStorage.setItem(`teacher_${teacherId}_bookings`, JSON.stringify(bookings))
    }
    return
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('更新预约状态失败:', error)
    throw error
  }
}

// 获取默认课程类型
export function getDefaultCourseTypes(): CourseType[] {
  return [
    { id: generateId(), name: '数学辅导', duration: 60, color: '#3B82F6', description: '小学至高中数学' },
    { id: generateId(), name: '英语辅导', duration: 60, color: '#10B981', description: '英语口语与语法' },
    { id: generateId(), name: '作文指导', duration: 90, color: '#F59E0B', description: '写作技巧' }
  ]
}
