import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { TimeSlot, Booking, CourseType, Teacher } from '@/types'
import { getDataFromUrl, getBookingFromUrl, stripImportedBookingFromUrl, DataPackage, BookingPackage } from '@/lib/dataExport'
import { getTeacherIdFromUrl } from '@/lib/urlParams'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchTeacherScheduleRemote, upsertTeacherScheduleRemote } from '@/lib/remoteSchedule'
import { fetchBookingsRemote, updateBookingStatusRemote, createBookingsRemote, deleteBookingRemote } from '@/lib/remoteBooking'
import { tryConsumeScheduleFileImportForTeacher } from '@/lib/scheduleFile'

// 生成UUID
function generateId(): string {
  return crypto.randomUUID()
}

// 本地存储操作
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// 获取教师专属的存储key
function getTeacherStorageKey(teacherId: string, key: string): string {
  return `teacher_${teacherId}_${key}`
}

// 获取所有教师列表
export function getAllTeachers(): Teacher[] {
  return loadFromStorage<Teacher[]>('all_teachers', [])
}

// 保存教师到列表
function saveTeacherToList(teacher: Teacher): void {
  const teachers = getAllTeachers()
  const existingIndex = teachers.findIndex(t => t.id === teacher.id)
  if (existingIndex >= 0) {
    teachers[existingIndex] = teacher
  } else {
    teachers.push(teacher)
  }
  saveToStorage('all_teachers', teachers)
}

// 创建新教师
export function createNewTeacher(name: string): Teacher {
  const teacher: Teacher = {
    id: generateId(),
    name,
    subjects: [],
    bio: ''
  }
  saveTeacherToList(teacher)
  return teacher
}

// 删除教师及其所有数据
export function deleteTeacher(teacherId: string): void {
  const teachers = getAllTeachers()
  const filteredTeachers = teachers.filter(t => t.id !== teacherId)
  saveToStorage('all_teachers', filteredTeachers)
  
  localStorage.removeItem(getTeacherStorageKey(teacherId, 'timeSlots'))
  localStorage.removeItem(getTeacherStorageKey(teacherId, 'bookings'))
  localStorage.removeItem(getTeacherStorageKey(teacherId, 'courseTypes'))
  localStorage.removeItem(getTeacherStorageKey(teacherId, 'info'))
}

// 导出教师数据
export function exportTeacherData(teacherId: string): DataPackage | null {
  const teacher = loadFromStorage<Teacher | null>(getTeacherStorageKey(teacherId, 'info'), null)
  const timeSlots = loadFromStorage<TimeSlot[]>(getTeacherStorageKey(teacherId, 'timeSlots'), [])
  const courseTypes = loadFromStorage<CourseType[]>(getTeacherStorageKey(teacherId, 'courseTypes'), [])
  
  if (!teacher) return null
  
  return {
    teacher,
    timeSlots,
    courseTypes,
    exportedAt: new Date().toISOString()
  }
}

interface AppState {
  teacherId: string | null
  timeSlots: TimeSlot[]
  bookings: Booking[]
  courseTypes: CourseType[]
  teacher: Teacher
  isLoading: boolean
  isFromUrl: boolean  // 数据是否来自URL（家长端快照）
  pendingBookings: BookingPackage | null  // 待导入的预约
  addTimeSlot: (slot: Omit<TimeSlot, 'id'>) => void
  removeTimeSlot: (id: string) => void
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void
  updateBookingStatus: (id: string, status: Booking['status']) => void
  cancelBooking: (id: string) => void
  addCourseType: (courseType: Omit<CourseType, 'id'>) => void
  removeCourseType: (id: string) => void
  updateCourseType: (id: string, updates: Partial<CourseType>) => void
  updateTeacher: (updates: Partial<Teacher>) => void
  importBookings: (bookingPackage: BookingPackage) => void
  clearPendingBookings: () => void
  refreshBookings: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
  const [teacher, setTeacher] = useState<Teacher>({ id: '', name: '', subjects: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isFromUrl, setIsFromUrl] = useState(false)
  const [pendingBookings, setPendingBookings] = useState<BookingPackage | null>(null)

  // 初始化（家长端可经 Supabase 拉课表；教师管理端始终读本机含预约）
  useEffect(() => {
    let cancelled = false

    const applyScheduleSnapshot = (pkg: DataPackage) => {
      setTeacher(pkg.teacher)
      const slots = pkg.timeSlots.map(slot => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      }))
      setTimeSlots(slots)
      setCourseTypes(pkg.courseTypes)
      setBookings([])
    }

    async function init() {
      const tid = getTeacherIdFromUrl()
      const mode = new URLSearchParams(window.location.search).get('mode')
      const urlSchedule = getDataFromUrl()

      if (tid) {
        setTeacherId(tid)

        if (mode === 'manage') {
          loadTeacherData(tid)
          if (isSupabaseConfigured()) {
            const pkg = exportTeacherData(tid)
            if (pkg) void upsertTeacherScheduleRemote(tid, pkg)
            const remoteBookings = await fetchBookingsRemote(tid)
            if (!cancelled && remoteBookings.length > 0) {
              setBookings(autoCompleteBookings(remoteBookings))
            }
          }
          const bookingData = getBookingFromUrl()
          if (bookingData && bookingData.teacherId === tid) {
            setPendingBookings(bookingData)
          }
          if (!cancelled) setIsLoading(false)
          return
        }

        if (urlSchedule && urlSchedule.teacher.id === tid) {
          applyScheduleSnapshot(urlSchedule)
          setIsFromUrl(true)
          const bookingData = getBookingFromUrl()
          if (bookingData && bookingData.teacherId === tid) {
            setPendingBookings(bookingData)
          }
          if (!cancelled && isSupabaseConfigured()) {
            const remoteBookings = await fetchBookingsRemote(tid)
            if (!cancelled && remoteBookings.length > 0) setBookings(autoCompleteBookings(remoteBookings))
          }
          if (!cancelled) setIsLoading(false)
          return
        }

        const filePkg = tryConsumeScheduleFileImportForTeacher(tid)
        if (filePkg) {
          applyScheduleSnapshot(filePkg)
          setIsFromUrl(true)
          const bookingData = getBookingFromUrl()
          if (bookingData && bookingData.teacherId === tid) {
            setPendingBookings(bookingData)
          }
          if (!cancelled && isSupabaseConfigured()) {
            const remoteBookings = await fetchBookingsRemote(tid)
            if (!cancelled && remoteBookings.length > 0) setBookings(autoCompleteBookings(remoteBookings))
          }
          if (!cancelled) setIsLoading(false)
          return
        }

        if (isSupabaseConfigured()) {
          const remote = await fetchTeacherScheduleRemote(tid)
          if (!cancelled && remote && remote.teacher.id === tid) {
            applyScheduleSnapshot(remote)
            setIsFromUrl(false)
            const bookingData = getBookingFromUrl()
            if (bookingData && bookingData.teacherId === tid) {
              setPendingBookings(bookingData)
            }
            const remoteBookings = await fetchBookingsRemote(tid)
            if (!cancelled && remoteBookings.length > 0) setBookings(autoCompleteBookings(remoteBookings))
            if (!cancelled) setIsLoading(false)
            return
          }
        }

        loadTeacherData(tid)
        const bookingData = getBookingFromUrl()
        if (bookingData && bookingData.teacherId === tid) {
          setPendingBookings(bookingData)
        }
        if (!cancelled) setIsLoading(false)
        return
      }

      if (urlSchedule) {
        if (!cancelled) {
          setTeacherId(urlSchedule.teacher.id)
          applyScheduleSnapshot(urlSchedule)
          setIsFromUrl(true)
        }
        if (!cancelled) setIsLoading(false)
        return
      }

      if (!cancelled) setIsLoading(false)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  // 加载教师数据
  function loadTeacherData(tid: string) {
    const keys = {
      TIME_SLOTS: getTeacherStorageKey(tid, 'timeSlots'),
      BOOKINGS: getTeacherStorageKey(tid, 'bookings'),
      COURSE_TYPES: getTeacherStorageKey(tid, 'courseTypes'),
      TEACHER: getTeacherStorageKey(tid, 'info')
    }

    const storedTeacher = loadFromStorage<Teacher | null>(keys.TEACHER, null)
    
    if (storedTeacher) {
      setTeacher(storedTeacher)
      const rawSlots = loadFromStorage<TimeSlot[]>(keys.TIME_SLOTS, [])
      setTimeSlots(
        rawSlots.map(s => ({
          ...s,
          startTime: new Date(s.startTime as unknown as string),
          endTime: new Date(s.endTime as unknown as string)
        }))
      )
      const rawBookings = loadFromStorage<Booking[]>(keys.BOOKINGS, [])
      setBookings(
        rawBookings.map(b => ({
          ...b,
          createdAt: new Date(b.createdAt as unknown as string)
        }))
      )
      setCourseTypes(loadFromStorage<CourseType[]>(keys.COURSE_TYPES, []))
    } else {
      const allTeachers = getAllTeachers()
      const existing = allTeachers.find(t => t.id === tid)
      const defaultCourses: CourseType[] = [
        { id: generateId(), name: '数学辅导', duration: 60, color: '#3B82F6', description: '小学至高中数学' },
        { id: generateId(), name: '英语辅导', duration: 60, color: '#10B981', description: '英语口语与语法' },
        { id: generateId(), name: '作文指导', duration: 90, color: '#F59E0B', description: '写作技巧' }
      ]
      setCourseTypes(defaultCourses)
      setTeacher({
        id: tid,
        name: existing?.name || '新教师',
        subjects: existing?.subjects || [],
        bio: existing?.bio || ''
      })
    }
  }

  // 数据变化时保存
  useEffect(() => {
    if (teacherId && !isLoading) {
      saveToStorage(getTeacherStorageKey(teacherId, 'timeSlots'), timeSlots)
    }
  }, [timeSlots, teacherId, isLoading])

  useEffect(() => {
    if (teacherId && !isLoading) {
      saveToStorage(getTeacherStorageKey(teacherId, 'bookings'), bookings)
    }
  }, [bookings, teacherId, isLoading])

  useEffect(() => {
    if (teacherId && !isLoading) {
      saveToStorage(getTeacherStorageKey(teacherId, 'courseTypes'), courseTypes)
    }
  }, [courseTypes, teacherId, isLoading])

  useEffect(() => {
    if (teacherId && !isLoading) {
      saveToStorage(getTeacherStorageKey(teacherId, 'info'), teacher)
      saveTeacherToList(teacher)
    }
  }, [teacher, teacherId, isLoading])

  // 教师管理后台：将课表同步到 Supabase，家长短链即可拉取
  useEffect(() => {
    if (!teacherId || isLoading || isFromUrl) return
    if (new URLSearchParams(window.location.search).get('mode') !== 'manage') return
    if (!isSupabaseConfigured()) return
    if (!teacher.id) return

    const pkg: DataPackage = {
      teacher,
      timeSlots,
      courseTypes,
      exportedAt: new Date().toISOString()
    }

    const timer = window.setTimeout(() => {
      void upsertTeacherScheduleRemote(teacherId, pkg)
    }, 800)

    return () => clearTimeout(timer)
  }, [timeSlots, courseTypes, teacher, teacherId, isLoading, isFromUrl])

  const addTimeSlot = (slot: Omit<TimeSlot, 'id'>) => {
    const newSlot: TimeSlot = { ...slot, id: generateId() }
    setTimeSlots(prev => [...prev, newSlot])
  }

  const removeTimeSlot = (id: string) => {
    setTimeSlots(prev => prev.filter(s => s.id !== id))
  }

  const addBooking = (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    const newBooking: Booking = {
      ...booking,
      id: generateId(),
      status: 'pending',
      createdAt: new Date()
    }
    setBookings(prev => [...prev, newBooking])
  }

  const updateBookingStatus = (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (isSupabaseConfigured()) {
      void updateBookingStatusRemote(id, status)
    }
  }

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id))
    if (isSupabaseConfigured()) {
      void deleteBookingRemote(id)
    }
  }

  const addCourseType = (courseType: Omit<CourseType, 'id'>) => {
    const newCourse: CourseType = { ...courseType, id: generateId() }
    setCourseTypes(prev => [...prev, newCourse])
  }

  const removeCourseType = (id: string) => {
    setCourseTypes(prev => prev.filter(c => c.id !== id))
  }

  const updateCourseType = (id: string, updates: Partial<CourseType>) => {
    setCourseTypes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const updateTeacher = (updates: Partial<Teacher>) => {
    setTeacher(prev => ({ ...prev, ...updates }))
  }

  // 导入预约数据
  const importBookings = (bookingPackage: BookingPackage) => {
    const newBookings = bookingPackage.bookings.map(b => ({
      ...b,
      id: generateId(),
      createdAt: new Date(b.createdAt)
    }))
    setBookings(prev => [...prev, ...newBookings])
    setPendingBookings(null)
    stripImportedBookingFromUrl()
    if (isSupabaseConfigured() && teacherId) {
      void createBookingsRemote(teacherId, newBookings)
    }
  }

  // 清除待导入的预约
  const clearPendingBookings = () => {
    setPendingBookings(null)
    stripImportedBookingFromUrl()
  }

  const autoCompleteBookings = (list: Booking[]): Booking[] => {
    const now = Date.now()
    let changed = false
    const updated = list.map(b => {
      if (b.status !== 'confirmed') return b
      const bDate = b.bookedDate
      const bStart = b.bookedStartTime
      if (!bDate || !bStart) return b
      const startTime = new Date(`${bDate}T${bStart}:00`).getTime()
      if (startTime <= now) {
        changed = true
        if (isSupabaseConfigured()) void updateBookingStatusRemote(b.id, 'completed')
        return { ...b, status: 'completed' as const }
      }
      return b
    })
    return changed ? updated : list
  }

  const refreshBookings = async () => {
    if (!isSupabaseConfigured() || !teacherId) return
    const remote = await fetchBookingsRemote(teacherId)
    setBookings(autoCompleteBookings(remote))
  }

  return (
    <AppContext.Provider value={{
      teacherId,
      timeSlots,
      bookings,
      courseTypes,
      teacher,
      isLoading,
      isFromUrl,
      pendingBookings,
      addTimeSlot,
      removeTimeSlot,
      addBooking,
      updateBookingStatus,
      cancelBooking,
      addCourseType,
      removeCourseType,
      updateCourseType,
      updateTeacher,
      importBookings,
      clearPendingBookings,
      refreshBookings
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
