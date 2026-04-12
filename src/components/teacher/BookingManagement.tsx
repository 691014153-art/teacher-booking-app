import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApp } from '@/context/AppContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getStatusLabel, getStatusVariant } from '@/lib/data'
import { formatDateTime } from '@/lib/utils'
import { Bell, Check, X, Clock, User, Phone, BookOpen, MessageSquare, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected'

export function BookingManagement() {
  const { bookings, timeSlots, courseTypes, updateBookingStatus, cancelBooking, refreshBookings } = useApp()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const supabaseEnabled = isSupabaseConfigured()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshBookings()
    setRefreshing(false)
  }, [refreshBookings])

  useEffect(() => {
    if (!supabaseEnabled) return
    const interval = setInterval(() => { void refreshBookings() }, 15000)
    return () => clearInterval(interval)
  }, [supabaseEnabled, refreshBookings])

  const filteredBookings = bookings
    .filter(booking => {
      if (filterStatus !== 'all' && booking.status !== filterStatus) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          booking.parentName.toLowerCase().includes(query) ||
          booking.studentName.toLowerCase().includes(query) ||
          booking.parentPhone.includes(query)
        )
      }
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getSlotTime = (slotId: string, booking?: { bookedDate?: string; bookedStartTime?: string; bookedEndTime?: string }) => {
    const slot = timeSlots.find(s => s.id === slotId)
    if (!slot) return '未知时段'
    const start = new Date(slot.startTime)
    const end = new Date(slot.endTime)
    const timeStr = booking?.bookedStartTime && booking?.bookedEndTime
      ? `${booking.bookedStartTime}-${booking.bookedEndTime}`
      : `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}-${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`
    if (booking?.bookedDate) {
      const d = new Date(booking.bookedDate + 'T00:00:00')
      return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`
    }
    return `${start.getMonth() + 1}/${start.getDate()} ${timeStr}`
  }

  const getCourseName = (courseId: string) => {
    const course = courseTypes.find(c => c.id === courseId)
    return course?.name || '未知课程'
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">待处理</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-xs text-muted-foreground">已确认</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'rejected').length}
                </div>
                <div className="text-xs text-muted-foreground">已拒绝</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{bookings.length}</div>
                <div className="text-xs text-muted-foreground">总预约</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap items-center">
          {(['all', 'pending', 'confirmed', 'rejected'] as FilterStatus[]).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? '全部' : getStatusLabel(status)}
              {status === 'pending' && pendingCount > 0 && (
                <Badge variant="accent" className="ml-2">{pendingCount}</Badge>
              )}
            </Button>
          ))}
          {supabaseEnabled && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} title="刷新预约列表">
              <RefreshCw className={cn("w-4 h-4 mr-1", refreshing && "animate-spin")} />
              刷新
            </Button>
          )}
        </div>
        
        <div className="flex-1">
          <Input
            placeholder="搜索家长姓名、学生姓名或手机号..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {supabaseEnabled && (
        <p className="text-xs text-muted-foreground">
          已启用云端同步，预约列表每 15 秒自动刷新
        </p>
      )}

      {/* 预约列表 */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">暂无预约记录</p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map(booking => (
            <Card key={booking.id} className={cn(
              "transition-all hover:shadow-md",
              booking.status === 'pending' && "border-l-4 border-l-accent"
            )}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 时间 */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{getSlotTime(booking.slotId, booking)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(booking.createdAt)} 提交
                        </div>
                      </div>
                    </div>
                    
                    {/* 家长信息 */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{booking.parentName}</div>
                        <div className="text-xs text-muted-foreground">{booking.parentPhone}</div>
                      </div>
                    </div>
                    
                    {/* 学生信息 */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">学生: {booking.studentName}</div>
                        <div className="text-xs text-muted-foreground">{getCourseName(booking.courseTypeId)}</div>
                      </div>
                    </div>
                    
                    {/* 状态 */}
                    <div>
                      <Badge variant={getStatusVariant(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* 备注和操作 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {booking.notes && (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground max-w-xs">
                        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{booking.notes}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            确认
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(booking.id, 'rejected')}
                            className="flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            拒绝
                          </Button>
                        </>
                      )}
                      {booking.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { if (confirm('确定要取消这个预约吗？')) cancelBooking(booking.id) }}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          取消预约
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
