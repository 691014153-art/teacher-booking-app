# 技术架构

## 整体架构

教师预约系统是一个**纯前端单页应用（SPA）**，核心数据存储在浏览器 `localStorage` 中，可选通过 Supabase 实现云端同步。

```
┌─────────────────────────────────────────────────────┐
│                    浏览器（SPA）                      │
│                                                     │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React UI  │←→│  AppContext   │←→│ localStorage │  │
│  │ Components │  │ (全局状态)    │  │  (持久化)     │  │
│  └───────────┘  └──────┬───────┘  └──────────────┘  │
│                        │                             │
│                        ▼ (可选)                       │
│               ┌────────────────┐                     │
│               │ remoteSchedule │                     │
│               │  (云端同步)     │                     │
│               └────────┬───────┘                     │
└────────────────────────┼────────────────────────────┘
                         │ HTTPS (PostgREST)
                         ▼
              ┌─────────────────────┐
              │    Supabase 云端     │
              │  teacher_schedules  │
              │  (JSONB payload)    │
              └─────────────────────┘
```

## 路由机制

系统**未使用 React Router**（虽然 `package.json` 列有依赖但未引入），所有导航基于 URL 查询参数 (`URLSearchParams`) 和 `window.location` 跳转。

### URL 参数矩阵

| URL 模式 | 显示页面 | 说明 |
|----------|---------|------|
| `/` | 首页（角色选择） | 选择"我是教师"或"我是家长" |
| `/?teacher=<id>&mode=manage` | 教师管理后台 | 教师端四个 Tab 页 |
| `/?teacher=<id>` | 家长预约页 | 从 Supabase 拉取课表 |
| `/?teacher=<id>&s=<data>` | 家长预约页 | 课表数据内嵌在 URL 中 |
| `/?teacher=<id>&mode=manage&b=<data>` | 教师管理后台 | 携带待导入的预约数据 |

### 页面判断逻辑（`App.tsx`）

```
isLoading?          → 显示加载中
isFromUrl?          → ParentView（家长端，URL 快照）
teacher + manage?   → TeacherDashboard（教师管理后台）
teacher?            → ParentView（家长端）
其他                → HomePage（首页）
```

## 状态管理

### AppContext

系统使用 React Context（`AppContext.tsx`）管理全局状态，不依赖第三方状态管理库。

**核心状态：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `teacherId` | `string \| null` | 当前教师 ID |
| `teacher` | `Teacher` | 当前教师信息 |
| `timeSlots` | `TimeSlot[]` | 可用时间段 |
| `bookings` | `Booking[]` | 预约列表 |
| `courseTypes` | `CourseType[]` | 课程类型 |
| `isFromUrl` | `boolean` | 数据是否来自 URL 快照 |
| `isLoading` | `boolean` | 是否正在加载 |
| `pendingBookings` | `BookingPackage \| null` | 待导入的预约包 |

**自动持久化：** 通过 `useEffect` 监听状态变化，实时写入 `localStorage`。

### localStorage 键名规则

```
all_teachers                         → Teacher[] 教师列表
teacher_<id>_timeSlots              → TimeSlot[] 时间段
teacher_<id>_bookings               → Booking[] 预约
teacher_<id>_courseTypes             → CourseType[] 课程类型
teacher_<id>_info                   → Teacher 教师信息
```

## 数据分享机制

系统支持三种课表分享方式，适应不同网络环境：

### 方式一：长链接（离线可用）

```
教师端 → 压缩课表 (pako deflate) → Base64 URL-safe 编码 → ?s=<data>
家长端 → 从 ?s= 解码 → 解压 → 恢复 DataPackage → 显示课表
```

- 所有数据内嵌在 URL 中，无需后端
- 使用 `?s=` 查询参数而非 `#hash`，避免微信等平台丢弃 hash 部分
- 缺点：URL 可能很长

### 方式二：短链接（需 Supabase）

```
教师端 → upsert 课表 JSON 到 teacher_schedules → 复制 ?teacher=<id>
家长端 → fetch teacher_schedules → 恢复 DataPackage → 显示课表
```

- URL 简短，跨设备可用
- 教师端进入管理后台时自动同步
- 数据变更后 800ms 防抖自动推送

### 方式三：JSON 文件传输

```
教师端 → 下载 .json 文件 → 通过微信等发送
家长端 → 首页导入文件 → sessionStorage 暂存 → 跳转 ?teacher=<id> → 恢复课表
```

- 无需网络连接，适合微信直传
- `sessionStorage` 作为中转，页面跳转后消费并清除

### 预约数据回传

```
家长提交预约 → 压缩预约包 → 生成 ?teacher=<id>&mode=manage&b=<data>
教师打开链接 → 检测到 pendingBookings → 确认导入 → 合并到本地 bookings
```

## 云端同步（Supabase）

### 实际使用的表

目前仅使用 `teacher_schedules` 表，存储完整课表快照（JSONB）：

```sql
teacher_schedules
├── teacher_id  TEXT (PK)     — 教师 UUID
├── payload     JSONB         — 完整 DataPackage
└── updated_at  TIMESTAMPTZ   — 最后更新时间
```

### 同步时机

1. **教师进入管理后台** — 立即推送一次
2. **数据变更** — 防抖 800ms 后自动推送（仅 `mode=manage` 时）
3. **手动复制链接** — 点击"复制预约链接"时同步

### 未启用的模块

`src/lib/database.ts` 实现了对 `teachers`、`time_slots`、`course_types`、`bookings` 四张关系表的 CRUD 操作，但当前**未被任何组件引用**。`supabase/schema.sql` 定义了对应的完整表结构，属于未来计划。

## 安全与认证

- **当前无用户认证** — 不使用 Supabase Auth
- **访问控制基于 URL 知识** — 知道教师 ID 即可访问
- **RLS 策略完全开放** — `teacher_schedules` 允许 `anon` 和 `authenticated` 读写
- 适用于 MVP / 小范围使用场景，生产环境需加固

## 组件结构

```
App
├── HomePage
│   ├── 角色选择（教师 / 家长）
│   ├── 教师列表（管理用）
│   ├── 家长列表（预约用）
│   ├── 创建教师
│   └── ScheduleFileImportControl（课表文件导入）
├── TeacherDashboard
│   ├── TimeManagement      — 时间管理
│   ├── BookingManagement   — 预约管理
│   ├── CourseSettings      — 课程设置
│   └── TeacherSettings     — 教师设置
└── ParentView
    └── ParentBooking       — 家长预约流程
```
