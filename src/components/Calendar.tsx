import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeSlot, Booking, CourseType } from '@/types'
import { getDayName, formatDateShort } from '@/lib/data'
import { cn } from '@/lib/utils'

function getBookedDate(booking: Booking, slot: TimeSlot): Date {
  const created = new Date(booking.createdAt)
  created.setHours(0, 0, 0, 0)
  const targetDay = slot.dayOfWeek ?? 0
  const diff = (targetDay - created.getDay() + 7) % 7
  const result = new Date(created)
  result.setDate(result.getDate() + diff)
  return result
}

interface CalendarProps {
  timeSlots: TimeSlot[]
  bookings?: Booking[]
  courseTypes?: CourseType[]
  selectedDate?: Date
  onSelectDate: (date: Date) => void
  selectableSlots?: Set<string>
  selectedSlots?: Set<string>
  onToggleSlot?: (slotId: string) => void
  mode: 'teacher' | 'parent'
}

export function Calendar({
  timeSlots,
  bookings,
  courseTypes,
  selectedDate,
  onSelectDate,
  selectableSlots,
  selectedSlots,
  onToggleSlot,
  mode
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    return { daysInMonth, firstDayOfMonth }
  }

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentMonth)

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  const getSlotsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dayOfWeek = date.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nonRecurring = timeSlots.filter(slot => {
      if (slot.isRecurring) return false
      return new Date(slot.startTime).toDateString() === date.toDateString()
    })

    const bookedRecurring = timeSlots.filter(slot => {
      if (!slot.isRecurring || slot.dayOfWeek !== dayOfWeek) return false
      return bookings?.some(b => {
        if (b.slotId !== slot.id || b.status === 'rejected') return false
        return getBookedDate(b, slot).toDateString() === date.toDateString()
      })
    })

    if (mode === 'teacher') {
      return [...nonRecurring, ...bookedRecurring]
    }

    const bookedRecurringIds = new Set(bookedRecurring.map(s => s.id))
    const availableRecurring = timeSlots.filter(slot =>
      slot.isRecurring && slot.dayOfWeek === dayOfWeek && date >= today
      && !bookedRecurringIds.has(slot.id)
    )
    return [...nonRecurring, ...bookedRecurring, ...availableRecurring]
  }

  const renderMonthView = () => {
    const days = []
    
    // 填充月初空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />)
    }

    // 渲染每一天
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const slots = getSlotsForDay(day)
      const isToday = new Date().toDateString() === date.toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

      days.push(
        <div
          key={day}
          className={cn(
            "h-24 border border-border/50 rounded-lg p-1.5 cursor-pointer transition-all hover:border-primary/30",
            isToday && "bg-primary/5 border-primary/30",
            isSelected && "ring-2 ring-primary ring-offset-1",
            isPast && "opacity-40"
          )}
          onClick={() => !isPast && onSelectDate(date)}
        >
          <div className={cn(
            "text-sm font-medium mb-1",
            isToday && "text-primary"
          )}>
            {day}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {slots.slice(0, 3).map(slot => {
              const startTime = new Date(slot.startTime)
              const endTime = new Date(slot.endTime)
              const startStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
              const endStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
              
              const booking = bookings?.find(b => {
                if (b.slotId !== slot.id || b.status === 'rejected') return false
                if (slot.isRecurring) {
                  return getBookedDate(b, slot).toDateString() === date.toDateString()
                }
                return true
              })
              const course = booking && courseTypes?.find(c => c.id === booking.courseTypeId)
              const isBooked = !!booking

              return (
                <div
                  key={slot.id}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded truncate",
                    isBooked
                      ? "bg-success/15 text-success border border-success/30"
                      : slot.isRecurring 
                        ? "bg-accent/20 text-accent border border-accent/30" 
                        : "bg-primary/10 text-primary"
                  )}
                >
                  {isBooked
                    ? `${course?.name || '已预约'} ${booking.studentName}`
                    : `${startStr}-${endStr}${slot.isRecurring ? " ↻" : ""}`
                  }
                </div>
              )
            })}
            {slots.length > 3 && (
              <div className="text-[10px] text-muted-foreground px-1">
                +{slots.length - 3} 更多
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className="space-y-4">
      {/* 月份导航 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
          <div key={day} className={cn(
            "text-center text-sm font-medium py-2",
            i === 0 || i === 6 ? "text-accent" : "text-muted-foreground"
          )}>
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {renderMonthView()}
      </div>
    </div>
  )
}

// 日视图组件 - 显示某一天的所有时间段
interface DayViewProps {
  date: Date
  slots: TimeSlot[]
  selectableSlots?: Set<string>
  selectedSlots?: Set<string>
  onToggleSlot?: (slotId: string) => void
  mode: 'teacher' | 'parent'
}

export function DayView({ date, slots, selectableSlots, selectedSlots, onToggleSlot, mode }: DayViewProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-muted-foreground">
        {date.getMonth() + 1}月{date.getDate()}日 {getDayName(date.getDay())}
      </h4>
      
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          暂无空闲时段
        </p>
      ) : (
        <div className="space-y-2">
          {slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(slot => {
            const start = new Date(slot.startTime)
            const end = new Date(slot.endTime)
            const isSelectable = selectableSlots?.has(slot.id) ?? true
            const isSelected = selectedSlots?.has(slot.id) ?? false
            
            return (
              <div
                key={slot.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isSelected && "bg-primary/10 border-primary",
                  !isSelectable && "opacity-50",
                  mode === 'parent' && isSelectable && "cursor-pointer hover:border-primary/50"
                )}
                onClick={() => mode === 'parent' && isSelectable && onToggleSlot?.(slot.id)}
              >
                <div>
                  <div className="font-medium">
                    {start.getHours().toString().padStart(2, '0')}:{start.getMinutes().toString().padStart(2, '0')} - 
                    {end.getHours().toString().padStart(2, '0')}:{end.getMinutes().toString().padStart(2, '0')}
                  </div>
                  {slot.isRecurring && (
                    <div className="text-xs text-muted-foreground">
                      每周{getDayName(slot.dayOfWeek ?? 0)}循环
                    </div>
                  )}
                </div>
                {mode === 'parent' && isSelectable && (
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected && "bg-primary border-primary"
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
