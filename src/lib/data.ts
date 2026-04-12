import { TimeSlot, Booking, CourseType, Teacher } from '@/types'

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// 格式化时间段显示
export function formatSlotTime(slot: TimeSlot): string {
  const start = new Date(slot.startTime)
  const end = new Date(slot.endTime)
  const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}-${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
  return timeStr
}

// 获取星期几的中文名称
export function getDayName(dayOfWeek: number): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[dayOfWeek]
}

// 获取日期的简化显示
export function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 时段是否落在某日期的日历格上（与 Calendar 组件逻辑一致：循环按星期，单次按具体日期）
export function isSlotOnDate(slot: TimeSlot, date: Date): boolean {
  const calDate = new Date(date)
  calDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (slot.isRecurring && slot.dayOfWeek !== undefined) {
    return date.getDay() === slot.dayOfWeek && calDate >= today
  }

  const slotDate = new Date(slot.startTime)
  return slotDate.toDateString() === new Date(date).toDateString()
}

// 获取指定日期的所有时间段
export function getSlotsForDate(slots: TimeSlot[], date: Date): TimeSlot[] {
  return slots.filter(slot => isSlotOnDate(slot, date))
}

// 获取预约的状态标签
export function getStatusLabel(status: Booking['status']): string {
  const labels = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已拒绝'
  }
  return labels[status]
}

// 获取预约的状态颜色
export function getStatusVariant(status: Booking['status']): 'default' | 'success' | 'destructive' {
  const variants = {
    pending: 'default' as const,
    confirmed: 'success' as const,
    rejected: 'destructive' as const
  }
  return variants[status]
}

// 创建示例数据
export function createSampleData() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // 创建一些示例空闲时段
  const timeSlots: TimeSlot[] = [
    // 今天的时段
    {
      id: generateId(),
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
      isRecurring: false
    },
    {
      id: generateId(),
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 16 * 60 * 60 * 1000),
      isRecurring: false
    },
    // 明天的时段
    {
      id: generateId(),
      startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      isRecurring: false
    },
    // 后天的时段
    {
      id: generateId(),
      startTime: new Date(today.getTime() + 48 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 48 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      isRecurring: false
    },
    // 每周三循环时段
    {
      id: generateId(),
      startTime: (() => {
        const d = new Date(today)
        d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7))
        d.setHours(18, 0, 0, 0)
        return d
      })(),
      endTime: (() => {
        const d = new Date(today)
        d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7))
        d.setHours(20, 0, 0, 0)
        return d
      })(),
      isRecurring: true,
      recurringPattern: 'weekly',
      dayOfWeek: 3
    }
  ]

  // 课程类型
  const courseTypes: CourseType[] = [
    { id: '1', name: '数学辅导', duration: 60, color: '#3B82F6', description: '小学至高中数学' },
    { id: '2', name: '英语辅导', duration: 60, color: '#10B981', description: '英语口语与语法' },
    { id: '3', name: '作文指导', duration: 90, color: '#F59E0B', description: '写作技巧与范文分析' },
    { id: '4', name: '作业辅导', duration: 120, color: '#8B5CF6', description: '全科作业答疑' }
  ]

  // 示例预约
  const bookings: Booking[] = [
    {
      id: generateId(),
      slotId: timeSlots[0].id,
      parentName: '张女士',
      parentPhone: '138****1234',
      studentName: '小明',
      courseTypeId: '1',
      status: 'pending',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      notes: '希望重点讲解方程问题'
    },
    {
      id: generateId(),
      slotId: timeSlots[1].id,
      parentName: '李先生',
      parentPhone: '139****5678',
      studentName: '小红',
      courseTypeId: '2',
      status: 'confirmed',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  ]

  // 教师信息
  const teacher: Teacher = {
    id: '1',
    name: '王老师',
    bio: '资深教师，10年教学经验，擅长数学和英语教学',
    subjects: ['数学', '英语', '作文']
  }

  return { timeSlots, bookings, courseTypes, teacher }
}

// LocalStorage 操作
const STORAGE_KEYS = {
  TIME_SLOTS: 'teacher_timeSlots',
  BOOKINGS: 'teacher_bookings',
  COURSE_TYPES: 'teacher_courseTypes',
  TEACHER: 'teacher_info'
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 转换日期字符串为Date对象
      return reviveDates(parsed) as T
    }
  } catch (e) {
    console.error('Failed to load from storage:', e)
  }
  return defaultValue
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to storage:', e)
  }
}

// 递归转换对象中的日期字符串
function reviveDates(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(reviveDates)
  }
  
  const result: Record<string, unknown> = {}
  for (const key in obj as Record<string, unknown>) {
    const value = (obj as Record<string, unknown>)[key]
    if (typeof value === 'string' && isDateString(value)) {
      result[key] = new Date(value)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = reviveDates(value)
    } else {
      result[key] = value
    }
  }
  return result
}

function isDateString(value: string): boolean {
  const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
  return datePattern.test(value)
}

export { STORAGE_KEYS }
