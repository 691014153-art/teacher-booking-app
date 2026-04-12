import { useState, useRef } from 'react'
import { useApp, getAllTeachers, createNewTeacher, deleteTeacher, exportTeacherData } from '@/context/AppContext'
import { generateScheduleUrl, hasSchedulePayloadInUrl, type DataPackage } from '@/lib/dataExport'
import { getModeFromUrl, navigateTo } from '@/lib/urlParams'
import { isSupabaseConfigured } from '@/lib/supabase'
import { upsertTeacherScheduleRemote } from '@/lib/remoteSchedule'
import { storeScheduleFileImportFromText, downloadSchedulePackageFile } from '@/lib/scheduleFile'
import { TimeManagement } from '@/components/teacher/TimeManagement'
import { BookingManagement } from '@/components/teacher/BookingManagement'
import { CourseSettings } from '@/components/teacher/CourseSettings'
import { TeacherSettings } from '@/components/teacher/TeacherSettings'
import { ParentBooking } from '@/components/parent/ParentBooking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Clock, 
  CalendarCheck, 
  BookOpen, 
  User,
  ChevronRight,
  Plus,
  Copy,
  ArrowLeft,
  Trash2,
  Download,
  Upload
} from 'lucide-react'

type TeacherTab = 'time' | 'bookings' | 'courses' | 'settings'

/** 家长从教师发来的 .json 课表文件进入预约（无需 Supabase、无需长链接） */
function ScheduleFileImportControl(props: {
  buttonLabel: string
  expectedTeacherId?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        type="file"
        accept=".json,application/json"
        ref={ref}
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          const text = await file.text()
          const r = storeScheduleFileImportFromText(text)
          if (!r.ok) {
            alert(r.reason)
            return
          }
          if (props.expectedTeacherId && r.teacherId !== props.expectedTeacherId) {
            alert('这份课表不是当前页面这位老师的，请向老师索取对应文件。')
            return
          }
          navigateTo(`teacher=${r.teacherId}`)
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <Upload className="w-4 h-4 mr-1" />
        {props.buttonLabel}
      </Button>
    </>
  )
}

// 首页选择组件
function HomePage() {
  const [view, setView] = useState<'select' | 'teacher-list' | 'parent-list' | 'create-teacher'>('select')
  const [newTeacherName, setNewTeacherName] = useState(() => {
    return localStorage.getItem('pendingTeacherName') || ''
  })
  const [teachers, setTeachers] = useState(getAllTeachers())

  // 保存名字到 localStorage
  const handleNameChange = (name: string) => {
    setNewTeacherName(name)
    localStorage.setItem('pendingTeacherName', name)
  }

  const handleCreateTeacher = () => {
    if (!newTeacherName.trim()) {
      alert('请输入教师姓名')
      return
    }
    const teacher = createNewTeacher(newTeacherName.trim())
    localStorage.removeItem('pendingTeacherName')
    navigateTo(`teacher=${teacher.id}&mode=manage`)
  }

  const handleSelectTeacherForManage = (teacherId: string) => {
    navigateTo(`teacher=${teacherId}&mode=manage`)
  }

  const handleSelectTeacherForBooking = (teacherId: string) => {
    if (isSupabaseConfigured()) {
      navigateTo(`teacher=${teacherId}`)
      return
    }
    const pkg = exportTeacherData(teacherId)
    if (pkg) {
      window.location.href = generateScheduleUrl(pkg)
      return
    }
    navigateTo(`teacher=${teacherId}`)
  }

  const copyTeacherLink = async (teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const pkg = exportTeacherData(teacherId)
    if (!pkg) {
      alert('无法生成链接：未找到该教师的资料，请先在教师端保存过信息。')
      return
    }
    if (isSupabaseConfigured()) {
      const { ok, error } = await upsertTeacherScheduleRemote(teacherId, pkg)
      if (!ok) {
        alert(`同步到云端失败：${error ?? '未知错误'}。请检查 .env 中的 Supabase 配置与数据库表是否已创建。`)
        return
      }
      const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
      const link = `${base}?teacher=${teacherId}`
      navigator.clipboard.writeText(link)
      alert('已同步到云端并复制短链接！家长打开即可看到空闲时间。')
      return
    }
    const link = generateScheduleUrl(pkg)
    navigator.clipboard.writeText(link)
    alert('预约链接已复制！已包含当前时间安排，家长可在任意设备上打开。')
  }

  const handleDeleteTeacher = (teacherId: string, teacherName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`确定要删除教师"${teacherName}"吗？此操作不可恢复，所有相关数据将被清除。`)) {
      deleteTeacher(teacherId)
      setTeachers(getAllTeachers())
    }
  }

  // 选择角色页面
  if (view === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container max-w-4xl mx-auto px-4 py-16">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
              <CalendarCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              教师预约系统
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              简单、高效的课程预约管理工具
            </p>
          </div>

          {/* 角色选择卡片 */}
          <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto mb-8">
            {/* 教师端入口 */}
            <Card 
              className="cursor-pointer hover-lift border-2 hover:border-primary/50 transition-all group"
              onClick={() => {
                if (teachers.length === 0) {
                  setView('create-teacher')
                } else {
                  setView('teacher-list')
                }
              }}
            >
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">我是教师</h2>
                <p className="text-muted-foreground text-sm">
                  管理时间、查看预约、设置课程
                </p>
                <ChevronRight className="w-5 h-5 text-muted-foreground mx-auto mt-4 group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>

            {/* 家长端入口 */}
            <Card 
              className="cursor-pointer hover-lift border-2 hover:border-primary/50 transition-all group"
              onClick={() => setView('parent-list')}
            >
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <CalendarCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">我是家长</h2>
                <p className="text-muted-foreground text-sm">
                  查看教师时间、预约课程
                </p>
                <ChevronRight className="w-5 h-5 text-muted-foreground mx-auto mt-4 group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-2xl mx-auto mb-10 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">没有云端、不会用链接？</strong>
                请教师点管理后台「下载课表文件」，通过微信发您一个 <code className="text-xs bg-background px-1 rounded">.json</code> 文件；您再点右侧按钮选中该文件，即可预约。
              </p>
              <div className="shrink-0 self-center sm:self-auto">
                <ScheduleFileImportControl buttonLabel="选择课表文件" />
              </div>
            </CardContent>
          </Card>

          {/* 特点说明 */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">灵活时间管理</h3>
              <p className="text-sm text-muted-foreground">支持手动添加和周期循环设置</p>
            </div>
            <div>
              <CalendarCheck className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">便捷预约</h3>
              <p className="text-sm text-muted-foreground">家长一键预约，教师及时确认</p>
            </div>
            <div>
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">多教师支持</h3>
              <p className="text-sm text-muted-foreground">每位教师独立管理，专属链接分享</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 教师列表（管理用）
  if (view === 'teacher-list') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => setView('select')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <h1 className="text-2xl font-bold mb-6">选择教师账户</h1>

          <div className="grid gap-4 mb-6">
            {teachers.map(teacher => (
              <Card 
                key={teacher.id}
                className="cursor-pointer hover-lift border-2 hover:border-primary/50 transition-all"
                onClick={() => handleSelectTeacherForManage(teacher.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        {teacher.subjects.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {teacher.subjects.join('、')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteTeacher(teacher.id, teacher.name, e)}
                        title="删除教师"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 添加新教师 */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => setView('create-teacher')}
              >
                <Plus className="w-5 h-5" />
                添加新教师
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 家长选择教师
  if (view === 'parent-list') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => setView('select')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <h1 className="text-2xl font-bold mb-6">选择教师进行预约</h1>

          {teachers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无可预约的教师</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {teachers.map(teacher => (
                <Card 
                  key={teacher.id}
                  className="cursor-pointer hover-lift border-2 hover:border-primary/50 transition-all"
                  onClick={() => handleSelectTeacherForBooking(teacher.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{teacher.name}</div>
                          {teacher.subjects.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {teacher.subjects.join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 创建新教师
  if (view === 'create-teacher') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container max-w-md mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => {
              if (teachers.length > 0) {
                setView('teacher-list')
              } else {
                setView('select')
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                创建教师账户
              </CardTitle>
              <CardDescription>
                创建后自动进入管理后台，可设置个人信息和可用时间
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="输入教师姓名"
                  value={newTeacherName}
                  onChange={e => handleNameChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeacher()}
                />
                <Button onClick={handleCreateTeacher}>
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

// 教师端组件
function PendingBookingsBar() {
  const { pendingBookings, importBookings, clearPendingBookings } = useApp()
  if (!pendingBookings || pendingBookings.bookings.length === 0) return null

  return (
    <div className="border-b bg-amber-50">
      <div className="container max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-amber-950">
            <strong>收到 {pendingBookings.bookings.length} 条新预约</strong>
            <span className="ml-2 text-amber-800">
              来自家长 {pendingBookings.bookings[0]?.parentName}
              {pendingBookings.bookings.length > 1 && ` 等`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => importBookings(pendingBookings)}>
              导入预约
            </Button>
            <Button size="sm" variant="ghost" onClick={clearPendingBookings}>
              忽略
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeacherDashboard() {
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('bookings')
  const { teacher, teacherId, timeSlots, courseTypes } = useApp()

  const copyShareLink = async () => {
    if (!teacherId || !teacher.id) return
    const pkg: DataPackage = {
      teacher,
      timeSlots,
      courseTypes,
      exportedAt: new Date().toISOString()
    }
    if (isSupabaseConfigured()) {
      const { ok, error } = await upsertTeacherScheduleRemote(teacherId, pkg)
      if (!ok) {
        alert(`同步到云端失败：${error ?? '未知错误'}。请检查 Supabase 配置与表 teacher_schedules。`)
        return
      }
      const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
      const link = `${base}?teacher=${teacherId}`
      navigator.clipboard.writeText(link)
      alert('已同步到云端并复制短链接！家长用任意设备打开即可看到当前空闲时间。')
      return
    }
    const link = generateScheduleUrl(pkg)
    navigator.clipboard.writeText(link)
    alert('预约链接已复制！已包含当前空闲时间与课程类型，家长用任意设备打开即可预约。')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-6 h-6 text-primary" />
              <span className="font-semibold">{teacher.name} - 管理后台</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!teacherId || !teacher.id) return
                  downloadSchedulePackageFile({
                    teacher,
                    timeSlots,
                    courseTypes,
                    exportedAt: new Date().toISOString()
                  })
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                下载课表文件
              </Button>
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="w-4 h-4 mr-1" />
                复制预约链接
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigateTo()}>
                返回首页
              </Button>
            </div>
          </div>
        </div>
      </header>

      <PendingBookingsBar />

      {!isSupabaseConfigured() ? (
        <div className="border-b bg-amber-50">
          <div className="container max-w-6xl mx-auto px-4 py-2 text-sm text-amber-950">
            <strong>不要只把地址栏里的短链接发给家长</strong>（只有 <code className="rounded bg-amber-100 px-1 text-xs">?teacher=</code>）——换设备看不到时间。请点「复制预约链接」发长链接，或点「下载课表文件」发微信由家长首页导入；也可配置 Supabase 用短链。
          </div>
        </div>
      ) : (
        <div className="border-b bg-sky-50/90">
          <div className="container max-w-6xl mx-auto px-4 py-2 text-sm text-sky-950">
            已启用云端同步：请用「复制预约链接」发家长；勿只复制地址栏里去掉 <code className="rounded bg-sky-100 px-1 text-xs">mode=manage</code> 的链接，除非已确认同步成功。
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <div className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { key: 'bookings' as const, label: '预约管理', icon: CalendarCheck },
              { key: 'time' as const, label: '时间管理', icon: Clock },
              { key: 'courses' as const, label: '课程设置', icon: BookOpen },
              { key: 'settings' as const, label: '教师设置', icon: User }
            ].map(tab => (
              <Button
                key={tab.key}
                variant={teacherTab === tab.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTeacherTab(tab.key)}
                className="flex items-center gap-1.5 shrink-0"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        {teacherTab === 'time' && <TimeManagement />}
        {teacherTab === 'bookings' && <BookingManagement />}
        {teacherTab === 'courses' && <CourseSettings />}
        {teacherTab === 'settings' && <TeacherSettings />}
      </main>
    </div>
  )
}

// 家长端组件
function ParentView() {
  const { teacher, isFromUrl, timeSlots } = useApp()
  const scheduleInUrl = hasSchedulePayloadInUrl()

  if (!teacher.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <CalendarCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">链接无效</h2>
            <p className="text-muted-foreground mb-4">
              请使用教师提供的完整预约链接
            </p>
            <Button onClick={() => navigateTo()}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-6 h-6 text-primary" />
              <span className="font-semibold">预约 {teacher.name} 的课程</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigateTo()}>
              返回首页
            </Button>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {isFromUrl && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-3 text-sm text-amber-800">
              此页面显示的是教师分享时的课程安排快照。如需最新安排，请向教师索取新的链接。
            </CardContent>
          </Card>
        )}
        {teacher.id && timeSlots.length === 0 && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">
              {!scheduleInUrl && isSupabaseConfigured() ? (
                <>
                  云端还没有这位教师的课表，或尚未同步成功。请教师打开<strong>管理后台</strong>并点<strong>「复制预约链接」</strong>，或发您<strong>课表 .json 文件</strong>；您也可<strong>刷新本页</strong>重试。
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ScheduleFileImportControl buttonLabel="导入课表文件" expectedTeacherId={teacher.id} />
                  </div>
                </>
              ) : !scheduleInUrl ? (
                <>
                  当前链接<strong>只有教师 ID</strong>，<strong>不包含课表</strong>。请让教师发您<strong>「复制预约链接」</strong>里的长链接，或发<strong>课表 .json 文件</strong>后在下方导入；有 Supabase 时也可用教师复制的短链。
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ScheduleFileImportControl buttonLabel="导入课表文件" expectedTeacherId={teacher.id} />
                  </div>
                </>
              ) : (
                <>链接里的时间表为空或已损坏。请让教师重新发布空闲时间后再发链接。</>
              )}
            </CardContent>
          </Card>
        )}
        <ParentBooking />
      </main>
    </div>
  )
}

function App() {
  const { teacherId, teacher, isFromUrl, isLoading } = useApp()
  const mode = getModeFromUrl()

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  // 如果是从URL数据加载的（家长通过链接访问）
  if (isFromUrl && teacher.id) {
    return <ParentView />
  }

  // 如果URL中有teacherId且mode=manage，显示教师管理端
  if (teacherId && mode === 'manage' && teacher.id) {
    return <TeacherDashboard />
  }

  // 如果URL中有teacherId但不是管理模式，显示家长预约端
  if (teacherId && teacher.id) {
    return <ParentView />
  }

  // 否则显示首页选择
  return <HomePage />
}

export default App
