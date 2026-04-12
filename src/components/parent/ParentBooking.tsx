import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, DayView } from '@/components/Calendar'
import { useApp } from '@/context/AppContext'
import { TimeSlot, Booking } from '@/types'
import { getDayName, isSlotOnDate, getStatusLabel, getStatusVariant } from '@/lib/data'
import { generateBookingUrl } from '@/lib/dataExport'
import { isSupabaseConfigured } from '@/lib/supabase'
import { createBookingsRemote, fetchBookingsByIdsRemote } from '@/lib/remoteBooking'
import { navigateTo, getModeFromUrl } from '@/lib/urlParams'
import { CalendarDays, Clock, User, Phone, GraduationCap, BookOpen, CheckCircle, Copy, Link, RefreshCw, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

function getParentBookingIds(teacherId: string): string[] {
  try {
    const raw = localStorage.getItem(`parent_bookings_${teacherId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveParentBookingIds(teacherId: string, ids: string[]) {
  const existing = getParentBookingIds(teacherId)
  const merged = Array.from(new Set([...existing, ...ids]))
  localStorage.setItem(`parent_bookings_${teacherId}`, JSON.stringify(merged))
}

function MyBookingsStatus({ teacherId }: { teacherId: string }) {
  const [bookingIds] = useState(() => getParentBookingIds(teacherId))
  const [statuses, setStatuses] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const refresh = useCallback(async () => {
    if (bookingIds.length === 0) return
    const result = await fetchBookingsByIdsRemote(bookingIds)
    setStatuses(result)
    setLoading(false)
  }, [bookingIds])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  if (bookingIds.length === 0) return null

  const pendingCount = statuses.filter(b => b.status === 'pending').length
  const confirmedCount = statuses.filter(b => b.status === 'confirmed').length
  const rejectedCount = statuses.filter(b => b.status === 'rejected').length

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="w-5 h-5 text-primary" />
            我的预约
            {pendingCount > 0 && (
              <Badge variant="accent">{pendingCount} 待确认</Badge>
            )}
            {confirmedCount > 0 && (
              <Badge variant="success">{confirmedCount} 已确认</Badge>
            )}
            {rejectedCount > 0 && (
              <Badge variant="destructive">{rejectedCount} 已拒绝</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={refresh} title="刷新状态">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '展开' : '收起'}
            </Button>
          </div>
        </div>
        {pendingCount > 0 && (
          <p className="text-xs text-muted-foreground">等待教师确认中，状态每 5 秒自动更新</p>
        )}
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-2">加载中...</p>
          ) : statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">暂无预约记录</p>
          ) : (
            <div className="space-y-2">
              {statuses.map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background border">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="font-medium">{booking.studentName}</span>
                      <span className="text-muted-foreground mx-1">·</span>
                      <span className="text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString('zh-CN')} 提交
                      </span>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function BookingStatusPolling({ bookingIds, bookings: initialBookings }: { bookingIds: string[]; bookings: Booking[] }) {
  const [statuses, setStatuses] = useState<Booking[]>(initialBookings)
  const [refreshing, setRefreshing] = useState(false)

  const allResolved = statuses.length > 0 && statuses.every(b => b.status !== 'pending')

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const result = await fetchBookingsByIdsRemote(bookingIds)
    if (result.length > 0) setStatuses(result)
    setRefreshing(false)
  }, [bookingIds])

  useEffect(() => {
    if (allResolved) return
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh, allResolved])

  const pendingCount = statuses.filter(b => b.status === 'pending').length
  const confirmedCount = statuses.filter(b => b.status === 'confirmed').length
  const rejectedCount = statuses.filter(b => b.status === 'rejected').length

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">预约已提交！</h2>
          <p className="text-muted-foreground">
            已提交 {statuses.length} 个预约，等待教师确认
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              预约状态
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
          {!allResolved && (
            <CardDescription>
              状态每 5 秒自动更新，教师确认后会立即显示
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingCount > 0 && <Badge variant="accent">{pendingCount} 待确认</Badge>}
          {confirmedCount > 0 && <Badge variant="success" className="ml-2">{confirmedCount} 已确认</Badge>}
          {rejectedCount > 0 && <Badge variant="destructive" className="ml-2">{rejectedCount} 已拒绝</Badge>}

          <div className="space-y-2 mt-3">
            {statuses.map(booking => (
              <div key={booking.id} className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                booking.status === 'confirmed' && "bg-success/5 border-success/30",
                booking.status === 'rejected' && "bg-destructive/5 border-destructive/30",
                booking.status === 'pending' && "bg-muted/50"
              )}>
                <div className="text-sm">
                  <div className="font-medium">{booking.studentName}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(booking.createdAt).toLocaleDateString('zh-CN')} 提交
                  </div>
                </div>
                <Badge variant={getStatusVariant(booking.status)}>
                  {getStatusLabel(booking.status)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {allResolved && (
        <Card className="border-primary/20">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            所有预约已处理完毕
          </CardContent>
        </Card>
      )}

      {getModeFromUrl() !== 'parent' && (
        <Button variant="outline" onClick={() => navigateTo()} className="w-full">
          返回首页
        </Button>
      )}
    </div>
  )
}

export function ParentBooking() {
  const mode = getModeFromUrl()
  const isParentOnly = mode === 'parent'
  const { timeSlots, courseTypes, teacher, teacherId, addBooking, bookings, cancelBooking } = useApp()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingLink, setBookingLink] = useState('')
  const [newBookings, setNewBookings] = useState<Booking[]>([])
  const [newBookingIds, setNewBookingIds] = useState<string[]>([])

  const supabaseEnabled = isSupabaseConfigured()
  const effectiveTeacherId = teacherId ?? teacher.id

  const [formData, setFormData] = useState({
    parentName: '',
    parentPhone: '',
    studentName: '',
    courseTypeId: '',
    notes: ''
  })

  const getBookedDateForBooking = (b: Booking, slot: TimeSlot): Date => {
    if (b.bookedDate) return new Date(b.bookedDate + 'T00:00:00')
    const created = new Date(b.createdAt)
    created.setHours(0, 0, 0, 0)
    const targetDay = slot.dayOfWeek ?? 0
    const diff = (targetDay - created.getDay() + 7) % 7
    const result = new Date(created)
    result.setDate(result.getDate() + diff)
    return result
  }

  const fmtHM = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

  const formatTime = (d: Date) => fmtHM(d.getHours(), d.getMinutes())

  interface SubSlot {
    key: string       // composite selection key
    slotId: string
    startTime: string  // "HH:MM"
    endTime: string    // "HH:MM"
    booked: boolean
    bookingInfo?: Booking
  }

  const getSubSlotsForDate = (date: Date): SubSlot[] => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dayOfWeek = date.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bookingsForDate = bookings.filter(b => {
      if (b.status === 'rejected') return false
      const slot = timeSlots.find(s => s.id === b.slotId)
      if (!slot) return false
      if (slot.isRecurring) {
        return getBookedDateForBooking(b, slot).toDateString() === date.toDateString()
      }
      return new Date(slot.startTime).toDateString() === date.toDateString()
    })

    const slotsOnDate = timeSlots.filter(slot => {
      if (slot.isRecurring) return slot.dayOfWeek === dayOfWeek && date >= today
      return new Date(slot.startTime).toDateString() === date.toDateString() && new Date(slot.startTime) >= today
    })

    const subSlots: SubSlot[] = []
    for (const slot of slotsOnDate) {
      const start = new Date(slot.startTime)
      const end = new Date(slot.endTime)
      let h = start.getHours(), m = start.getMinutes()
      const endH = end.getHours(), endM = end.getMinutes()
      const endMinutes = endH * 60 + endM

      while (h * 60 + m < endMinutes) {
        const nextM = m + 30
        const nh = h + Math.floor(nextM / 60)
        const nm = nextM % 60
        const startStr = fmtHM(h, m)
        const endStr = fmtHM(nh, nm)
        const key = slot.isRecurring
          ? `${slot.id}__${dateStr}__${startStr}`
          : `${slot.id}__${startStr}`

        const matchingBooking = bookingsForDate.find(b => {
          if (b.slotId !== slot.id) return false
          if (b.bookedStartTime && b.bookedEndTime) {
            const bStartMin = parseInt(b.bookedStartTime.split(':')[0]) * 60 + parseInt(b.bookedStartTime.split(':')[1])
            const bEndMin = parseInt(b.bookedEndTime.split(':')[0]) * 60 + parseInt(b.bookedEndTime.split(':')[1])
            const subStartMin = h * 60 + m
            return subStartMin >= bStartMin && subStartMin < bEndMin
          }
          return true
        })

        subSlots.push({
          key,
          slotId: slot.id,
          startTime: startStr,
          endTime: endStr,
          booked: !!matchingBooking,
          bookingInfo: matchingBooking
        })
        h = nh; m = nm
      }
    }

    return subSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      if (booking.status === 'rejected') return false
      const slot = timeSlots.find(s => s.id === booking.slotId)
      if (!slot) return false
      if (slot.isRecurring) {
        return getBookedDateForBooking(booking, slot).toDateString() === date.toDateString()
      }
      return new Date(slot.startTime).toDateString() === date.toDateString()
    })
  }

  const handleToggleSlot = (slotId: string) => {
    setSelectedSlots(prev => {
      const next = new Set(prev)
      if (next.has(slotId)) {
        next.delete(slotId)
      } else {
        next.add(slotId)
      }
      return next
    })
  }

  const handleContinue = () => {
    if (selectedSlots.size === 0) return
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.parentName || !formData.parentPhone || !formData.studentName || !formData.courseTypeId) {
      alert('请填写所有必填项')
      return
    }

    setSubmitting(true)

    const generateId = () => crypto.randomUUID()

    const parsed = Array.from(selectedSlots).map(key => {
      const parts = key.split('__')
      if (parts.length === 3) {
        return { slotId: parts[0], bookedDate: parts[1], time: parts[2] }
      } else if (parts.length === 2) {
        return { slotId: parts[0], bookedDate: undefined, time: parts[1] }
      }
      return { slotId: parts[0], bookedDate: undefined, time: undefined }
    })

    const groups = new Map<string, { slotId: string; bookedDate?: string; times: string[] }>()
    for (const p of parsed) {
      const gKey = `${p.slotId}__${p.bookedDate ?? ''}`
      if (!groups.has(gKey)) groups.set(gKey, { slotId: p.slotId, bookedDate: p.bookedDate, times: [] })
      if (p.time) groups.get(gKey)!.times.push(p.time)
    }

    const createdBookings: Booking[] = Array.from(groups.values()).map(g => {
      g.times.sort()
      const startTime = g.times[0]
      const lastStart = g.times[g.times.length - 1]
      const [lh, lm] = lastStart.split(':').map(Number)
      const endTime = fmtHM(lh + Math.floor((lm + 30) / 60), (lm + 30) % 60)
      return {
        id: generateId(),
        slotId: g.slotId,
        bookedDate: g.bookedDate,
        bookedStartTime: startTime,
        bookedEndTime: endTime,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        studentName: formData.studentName,
        courseTypeId: formData.courseTypeId,
        notes: formData.notes,
        status: 'pending' as const,
        createdAt: new Date()
      }
    })

    if (supabaseEnabled && effectiveTeacherId) {
      const { ok, error } = await createBookingsRemote(effectiveTeacherId, createdBookings)
      if (!ok) {
        alert(`提交预约失败：${error ?? '未知错误'}。请重试。`)
        setSubmitting(false)
        return
      }
      const ids = createdBookings.map(b => b.id)
      saveParentBookingIds(effectiveTeacherId, ids)
      setNewBookingIds(ids)
      setNewBookings(createdBookings)
    } else {
      createdBookings.forEach(booking => addBooking(booking))
      if (effectiveTeacherId) {
        const link = generateBookingUrl(effectiveTeacherId, createdBookings)
        setBookingLink(link)
        setNewBookings(createdBookings)
      }
    }

    setSubmitting(false)
    setIsSuccess(true)
  }

  const copyBookingLink = () => {
    navigator.clipboard.writeText(bookingLink)
    alert('预约链接已复制！请发送给老师，老师点击后即可看到您的预约。')
  }

  const getSlotTime = (key: string) => {
    const parts = key.split('__')
    const slotId = parts[0]
    const slot = timeSlots.find(s => s.id === slotId)
    if (!slot) return ''

    if (parts.length === 3) {
      const dateStr = parts[1]
      const timeStart = parts[2]
      const [sh, sm] = timeStart.split(':').map(Number)
      const timeEnd = fmtHM(sh + Math.floor((sm + 30) / 60), (sm + 30) % 60)
      const d = new Date(dateStr + 'T00:00:00')
      return `${d.getMonth() + 1}月${d.getDate()}日 ${getDayName(d.getDay())} ${timeStart}-${timeEnd}`
    }
    if (parts.length === 2) {
      const timeStart = parts[1]
      const [sh, sm] = timeStart.split(':').map(Number)
      const timeEnd = fmtHM(sh + Math.floor((sm + 30) / 60), (sm + 30) % 60)
      const start = new Date(slot.startTime)
      return `${start.getMonth() + 1}月${start.getDate()}日 ${getDayName(start.getDay())} ${timeStart}-${timeEnd}`
    }
    const start = new Date(slot.startTime)
    const end = new Date(slot.endTime)
    return `${start.getMonth() + 1}月${start.getDate()}日 ${getDayName(start.getDay())} ${formatTime(start)}-${formatTime(end)}`
  }

  if (isSuccess) {
    if (supabaseEnabled && newBookingIds.length > 0) {
      return <BookingStatusPolling bookingIds={newBookingIds} bookings={newBookings} />
    }

    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">预约成功！</h2>
            <p className="text-muted-foreground mb-2">
              已预约 {newBookings.length} 个时段
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link className="w-5 h-5 text-primary" />
              发送预约给老师
            </CardTitle>
            <CardDescription>
              请将以下链接发送给老师，老师点击后即可看到您的预约信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg break-all text-xs">
              {bookingLink}
            </div>
            <Button onClick={copyBookingLink} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              复制链接发送给老师
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              可以通过微信、短信等方式发送给老师
            </p>
          </CardContent>
        </Card>

        {!isParentOnly && (
          <Button variant="outline" onClick={() => navigateTo()} className="w-full">
            返回首页
          </Button>
        )}
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setShowForm(false)}>
          ← 返回选择时间
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              填写预约信息
            </CardTitle>
            <CardDescription>
              请填写您和学生的基本信息，方便老师联系您
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">已选择时段</span>
              </div>
              <div className="space-y-1">
                {Array.from(selectedSlots).map(slotId => (
                  <div key={slotId} className="text-sm text-muted-foreground">
                    {getSlotTime(slotId)}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentName">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    家长姓名 *
                  </span>
                </Label>
                <Input
                  id="parentName"
                  placeholder="请输入您的姓名"
                  value={formData.parentName}
                  onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhone">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    联系电话 *
                  </span>
                </Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  placeholder="请输入手机号码"
                  value={formData.parentPhone}
                  onChange={e => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentName">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    学生姓名 *
                  </span>
                </Label>
                <Input
                  id="studentName"
                  placeholder="请输入学生姓名"
                  value={formData.studentName}
                  onChange={e => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseType">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    课程类型 *
                  </span>
                </Label>
                <Select
                  value={formData.courseTypeId}
                  onChange={e => setFormData(prev => ({ ...prev, courseTypeId: e.target.value }))}
                >
                  <option value="">请选择课程</option>
                  {courseTypes.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.duration}分钟)
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注信息（可选）</Label>
              <Textarea
                placeholder="如有特殊要求或需要说明的情况，请在此填写..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '提交预约'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{teacher.name}</h2>
              {teacher.bio && (
                <p className="text-sm text-muted-foreground mt-1">{teacher.bio}</p>
              )}
              {teacher.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {teacher.subjects.map((subject, i) => (
                    <Badge key={i} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-5 h-5" />
          <span>选择您方便的上课时间</span>
        </div>
        {selectedSlots.size > 0 && (
          <Badge variant="accent" className="text-sm">
            已选 {selectedSlots.size} 个时段
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>选择日期</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              timeSlots={timeSlots}
              bookings={bookings}
              courseTypes={courseTypes}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              mode="parent"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 - {getDayName(selectedDate.getDay())}
            </CardTitle>
            <CardDescription>点击选择可用时段</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const subSlots = getSubSlotsForDate(selectedDate)
              const bookedSubs = subSlots.filter(s => s.booked)
              const availableSubs = subSlots.filter(s => !s.booked)

              return (
                <>
                  {bookedSubs.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                        已预约时段
                      </h4>
                      <div className="space-y-1.5">
                        {bookedSubs.map(sub => {
                          const course = sub.bookingInfo && courseTypes.find(c => c.id === sub.bookingInfo!.courseTypeId)
                          const canCancel = (() => {
                            if (!sub.bookingInfo) return false
                            if (sub.bookingInfo.status === 'pending') return true
                            const bDate = sub.bookingInfo.bookedDate
                            const bStart = sub.bookingInfo.bookedStartTime
                            if (!bDate || !bStart) return true
                            const lessonTime = new Date(`${bDate}T${bStart}:00`)
                            return lessonTime.getTime() - Date.now() > 24 * 60 * 60 * 1000
                          })()
                          return (
                            <div key={sub.key} className="flex items-center justify-between p-2.5 rounded-lg bg-success/10 border border-success/20">
                              <div>
                                <span className="font-medium text-success">{sub.startTime} - {sub.endTime}</span>
                                {sub.bookingInfo && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {sub.bookingInfo.studentName} · {course?.name || ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge variant={sub.bookingInfo?.status === 'confirmed' ? 'success' : 'accent'} className="text-[10px]">
                                  {sub.bookingInfo?.status === 'confirmed' ? '已确认' : '待确认'}
                                </Badge>
                                {sub.bookingInfo && canCancel && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { if (confirm('确定要取消这个预约吗？')) cancelBooking(sub.bookingInfo!.id) }}
                                    className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    取消
                                  </Button>
                                )}
                                {sub.bookingInfo && !canCancel && (
                                  <span className="text-[10px] text-muted-foreground">24h内不可取消</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {availableSubs.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        可选时段（每段30分钟，可多选）
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableSubs.map(sub => {
                          const isSelected = selectedSlots.has(sub.key)
                          return (
                            <div
                              key={sub.key}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                                isSelected && "bg-primary/10 border-primary"
                              )}
                              onClick={() => handleToggleSlot(sub.key)}
                            >
                              <span className="text-sm font-medium">{sub.startTime} - {sub.endTime}</span>
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected && "bg-primary border-primary"
                              )}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : subSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">暂无空闲时段</p>
                  ) : null}
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {selectedSlots.size > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">已选择的时段：</h3>
            <div className="space-y-2 mb-4">
              {Array.from(selectedSlots).map(slotId => (
                <div key={slotId} className="flex items-center justify-between p-2 rounded bg-background">
                  <span className="text-sm">{getSlotTime(slotId)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleSlot(slotId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    取消
                  </Button>
                </div>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={handleContinue}>
              继续 - 填写信息
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="text-center text-[10px] text-muted-foreground/50 mt-4">v2.1</div>
    </div>
  )
}
