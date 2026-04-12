export interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  isRecurring: boolean
  recurringPattern?: 'weekly' | 'biweekly'
  dayOfWeek?: number // 0-6, Sunday to Saturday
}

export interface CourseType {
  id: string
  name: string
  duration: number // in minutes
  description?: string
  color: string
}

export interface Booking {
  id: string
  slotId: string
  parentName: string
  parentPhone: string
  studentName: string
  courseTypeId: string
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: Date
  notes?: string
}

export interface Teacher {
  id: string
  name: string
  avatar?: string
  bio?: string
  subjects: string[]
}
