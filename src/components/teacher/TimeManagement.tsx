import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, DayView } from '@/components/Calendar'
import { useApp } from '@/context/AppContext'
import { TimeSlot } from '@/types'
import { getDayName } from '@/lib/data'
import { Plus, Trash2, Repeat, Clock, CalendarDays, BookOpen, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'calendar' | 'manual' | 'course'

// 解析时间字符串（如 "9:00" 或 "9:30"）
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number)
  return { hour: hour || 0, minute: minute || 0 }
}

// 格式化时间显示
function formatTimeDisplay(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export function TimeManagement() {
  const { timeSlots, addTimeSlot, removeTimeSlot, bookings, courseTypes } = useApp()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  
  // 手动添加时段
  const [manualDate, setManualDate] = useState('')
  const [manualStartTime, setManualStartTime] = useState('09:00')
  const [manualEndTime, setManualEndTime] = useState('11:00')
  const [manualIsRecurring, setManualIsRecurring] = useState(false)
  const [manualRecurringDay, setManualRecurringDay] = useState('1')

  // 课程安排
  const [courseDate, setCourseDate] = useState('')
  const [courseStartTime, setCourseStartTime] = useState('09:00')
  const [courseEndTime, setCourseEndTime] = useState('11:00')
  const [courseIsRecurring, setCourseIsRecurring] = useState(false)
  const [courseRecurringDay, setCourseRecurringDay] = useState('1')
  const [courseType, setCourseType] = useState('')
  const [studentName, setStudentName] = useState('')
  const [courseNotes, setCourseNotes] = useState('')

  // 计算循环时段对应的日期显示
  const getRecurringDayName = (dayOfWeek: number) => {
    return getDayName(dayOfWeek)
  }

  const handleAddManualSlot = () => {
    if (!manualIsRecurring && !manualDate) {
      alert('请选择日期')
      return
    }
    
    const { hour: startHour, minute: startMinute } = parseTime(manualStartTime)
    const { hour: endHour, minute: endMinute } = parseTime(manualEndTime)
    
    let startTime: Date
    let endTime: Date
    let dayOfWeek: number | undefined

    if (manualIsRecurring) {
      // 循环时段
      dayOfWeek = parseInt(manualRecurringDay)
      const today = new Date()
      const daysUntilNext = (dayOfWeek - today.getDay() + 7) % 7
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext))
      
      startTime = new Date(nextDate)
      startTime.setHours(startHour, startMinute, 0, 0)
      endTime = new Date(nextDate)
      endTime.setHours(endHour, endMinute, 0, 0)
    } else {
      // 单次时段
      const date = new Date(manualDate)
      startTime = new Date(date)
      startTime.setHours(startHour, startMinute, 0, 0)
      endTime = new Date(date)
      endTime.setHours(endHour, endMinute, 0, 0)
    }
    
    if (startTime >= endTime) {
      alert('结束时间必须晚于开始时间')
      return
    }

    addTimeSlot({
      startTime,
      endTime,
      isRecurring: manualIsRecurring,
      recurringPattern: manualIsRecurring ? 'weekly' : undefined,
      dayOfWeek
    })

    // 重置部分表单
    setManualStartTime('09:00')
    setManualEndTime('11:00')
  }

  const getBookedDate = (booking: { createdAt: Date }, slot: { dayOfWeek?: number }) => {
    const created = new Date(booking.createdAt)
    created.setHours(0, 0, 0, 0)
    const targetDay = slot.dayOfWeek ?? 0
    const diff = (targetDay - created.getDay() + 7) % 7
    const result = new Date(created)
    result.setDate(result.getDate() + diff)
    return result
  }

  // 获取某日期的所有时段（具体日期 + 该日有预约的循环时段）
  const getSlotsForSelectedDate = () => {
    const nonRecurring = timeSlots.filter(slot => {
      if (slot.isRecurring) return false
      return new Date(slot.startTime).toDateString() === selectedDate.toDateString()
    })
    const bookedRecurring = timeSlots.filter(slot => {
      if (!slot.isRecurring || slot.dayOfWeek !== selectedDate.getDay()) return false
      return bookings.some(b => {
        if (b.slotId !== slot.id || b.status === 'rejected') return false
        return getBookedDate(b, slot).toDateString() === selectedDate.toDateString()
      })
    })
    return [...nonRecurring, ...bookedRecurring]
  }

  // 获取某日期的已确认预约
  const getBookingsForSelectedDate = () => {
    return bookings.filter(booking => {
      const slot = timeSlots.find(s => s.id === booking.slotId)
      if (!slot) return false
      if (slot.isRecurring) {
        return getBookedDate(booking, slot).toDateString() === selectedDate.toDateString() && booking.status === 'confirmed'
      }
      return new Date(slot.startTime).toDateString() === selectedDate.toDateString() && booking.status === 'confirmed'
    })
  }

  // 获取所有循环时段
  const getRecurringSlots = () => {
    return timeSlots.filter(slot => slot.isRecurring)
  }

  // 获取已预约的时间段ID集合
  const getBookedSlotIds = () => {
    return new Set(bookings.filter(b => b.status === 'confirmed').map(b => b.slotId))
  }

  // 生成时间选项（包含半小时）
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? '00' : '30'
    const value = `${hour.toString().padStart(2, '0')}:${minute}`
    return <option key={i} value={value}>{value}</option>
  })

  // 生成星期选项
  const dayOptions = [
    { value: '0', label: '周日' },
    { value: '1', label: '周一' },
    { value: '2', label: '周二' },
    { value: '3', label: '周三' },
    { value: '4', label: '周四' },
    { value: '5', label: '周五' },
    { value: '6', label: '周六' },
  ]

  return (
    <div className="space-y-6">
      {/* 视图切换 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('calendar')}
          className="flex items-center gap-1.5"
        >
          <CalendarDays className="w-4 h-4" />
          日历视图
        </Button>
        <Button
          variant={viewMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('manual')}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          添加空闲时间
        </Button>
        <Button
          variant={viewMode === 'course' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('course')}
          className="flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          安排课程
        </Button>
      </div>

      {viewMode === 'calendar' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 日历 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                时间安排总览
              </CardTitle>
              <CardDescription>蓝色=空闲时间，绿色=已预约课程</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                timeSlots={timeSlots}
                bookings={bookings}
                courseTypes={courseTypes}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                mode="teacher"
              />
            </CardContent>
          </Card>

          {/* 选中日期的时段列表 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 - {getDayName(selectedDate.getDay())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 已预约课程 */}
              {getBookingsForSelectedDate().length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-success" />
                    已预约课程
                  </h4>
                  <div className="space-y-2">
                    {getBookingsForSelectedDate().map(booking => {
                      const slot = timeSlots.find(s => s.id === booking.slotId)
                      const course = courseTypes.find(c => c.id === booking.courseTypeId)
                      if (!slot) return null
                      return (
                        <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                          <div>
                            <div className="font-medium text-success">
                              {formatTimeDisplay(new Date(slot.startTime))} - 
                              {formatTimeDisplay(new Date(slot.endTime))}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="mr-2">学生: {booking.studentName}</span>
                              <span>课程: {course?.name || '未知'}</span>
                            </div>
                          </div>
                          <Badge variant="success">已确认</Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 空闲时段 */}
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                空闲时段
              </h4>
              <DayView
                date={selectedDate}
                slots={getSlotsForSelectedDate().filter(s => !getBookedSlotIds().has(s.id))}
                mode="teacher"
              />
              {getSlotsForSelectedDate().filter(s => !getBookedSlotIds().has(s.id)).length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {getSlotsForSelectedDate().filter(s => !getBookedSlotIds().has(s.id)).map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <div className="text-sm">
                        <span className="font-medium">
                          {formatTimeDisplay(new Date(slot.startTime))} - 
                          {formatTimeDisplay(new Date(slot.endTime))}
                        </span>
                        {slot.isRecurring && (
                          <Badge variant="accent" className="ml-2">每周循环</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeTimeSlot(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'manual' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                添加空闲时段
              </CardTitle>
              <CardDescription>添加家长可以预约的空闲时间</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 循环开关 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  id="manualRecurring"
                  checked={manualIsRecurring}
                  onChange={e => setManualIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="manualRecurring" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="w-4 h-4 text-primary" />
                  <span className="font-medium">每周循环</span>
                </label>
              </div>

              {/* 日期/星期选择 */}
              <div className="space-y-2">
                <Label>{manualIsRecurring ? '选择星期' : '日期'}</Label>
                {manualIsRecurring ? (
                  <Select value={manualRecurringDay} onChange={e => setManualRecurringDay(e.target.value)}>
                    {dayOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type="date"
                    lang="zh-CN"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>

              {/* 时间选择 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Select value={manualStartTime} onChange={e => setManualStartTime(e.target.value)}>
                    {timeOptions}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Select value={manualEndTime} onChange={e => setManualEndTime(e.target.value)}>
                    {timeOptions}
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddManualSlot} className="w-full">
                {manualIsRecurring ? '添加循环时段' : '添加时段'}
              </Button>
            </CardContent>
          </Card>

          {/* 显示已设置的循环时段 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-primary" />
                已设置的循环时段
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getRecurringSlots().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  暂无循环时段，勾选"每周循环"可添加
                </p>
              ) : (
                <div className="space-y-2">
                  {getRecurringSlots().map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border">
                      <div>
                        <div className="font-medium">每周{getDayName(slot.dayOfWeek ?? 0)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimeDisplay(new Date(slot.startTime))} - 
                          {formatTimeDisplay(new Date(slot.endTime))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeTimeSlot(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'course' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              安排课程
            </CardTitle>
            <CardDescription>直接为学生安排课程时间（会自动创建对应的时间段）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 循环开关 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="courseRecurring"
                checked={courseIsRecurring}
                onChange={e => setCourseIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="courseRecurring" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="w-4 h-4 text-primary" />
                <span className="font-medium">每周循环</span>
              </label>
            </div>

            {/* 日期/星期选择 */}
            <div className="space-y-2">
              <Label>{courseIsRecurring ? '选择星期' : '日期'}</Label>
              {courseIsRecurring ? (
                <Select value={courseRecurringDay} onChange={e => setCourseRecurringDay(e.target.value)}>
                  {dayOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="date"
                  lang="zh-CN"
                  value={courseDate}
                  onChange={e => setCourseDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>

            {/* 时间选择 */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Select value={courseStartTime} onChange={e => setCourseStartTime(e.target.value)}>
                  {timeOptions}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Select value={courseEndTime} onChange={e => setCourseEndTime(e.target.value)}>
                  {timeOptions}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>学生姓名</Label>
                <Input
                  placeholder="输入学生姓名"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>课程类型</Label>
                <Select value={courseType} onChange={e => setCourseType(e.target.value)}>
                  <option value="">选择课程</option>
                  {courseTypes.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="课程相关备注信息..."
                value={courseNotes}
                onChange={e => setCourseNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button 
              onClick={() => {
                if (!studentName || !courseType) {
                  alert('请填写学生姓名和课程类型')
                  return
                }
                if (!courseIsRecurring && !courseDate) {
                  alert('请选择日期')
                  return
                }

                const { hour: startHour, minute: startMinute } = parseTime(courseStartTime)
                const { hour: endHour, minute: endMinute } = parseTime(courseEndTime)

                let startTime: Date
                let endTime: Date
                let dayOfWeek: number | undefined

                if (courseIsRecurring) {
                  dayOfWeek = parseInt(courseRecurringDay)
                  const today = new Date()
                  const daysUntilNext = (dayOfWeek - today.getDay() + 7) % 7
                  const nextDate = new Date(today)
                  nextDate.setDate(today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext))
                  
                  startTime = new Date(nextDate)
                  startTime.setHours(startHour, startMinute, 0, 0)
                  endTime = new Date(nextDate)
                  endTime.setHours(endHour, endMinute, 0, 0)
                } else {
                  const date = new Date(courseDate)
                  startTime = new Date(date)
                  startTime.setHours(startHour, startMinute, 0, 0)
                  endTime = new Date(date)
                  endTime.setHours(endHour, endMinute, 0, 0)
                }

                if (startTime >= endTime) {
                  alert('结束时间必须晚于开始时间')
                  return
                }

                // 添加时间段
                addTimeSlot({
                  startTime,
                  endTime,
                  isRecurring: courseIsRecurring,
                  recurringPattern: courseIsRecurring ? 'weekly' : undefined,
                  dayOfWeek
                })

                alert(courseIsRecurring ? '循环课程已添加！' : '课程安排已添加！请在预约管理中查看。')
                setStudentName('')
                setCourseNotes('')
                setCourseType('')
              }} 
              className="w-full md:w-auto"
            >
              确认安排课程
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
