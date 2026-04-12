# 数据模型参考

## TypeScript 类型定义

所有类型定义位于 `src/types/index.ts`。

### Teacher（教师）

```typescript
interface Teacher {
  id: string        // UUID，由 crypto.randomUUID() 生成
  name: string      // 教师姓名
  avatar?: string   // 头像 URL（可选）
  bio?: string      // 个人简介（可选）
  subjects: string[] // 教授科目列表
}
```

### TimeSlot（时间段）

```typescript
interface TimeSlot {
  id: string               // UUID
  startTime: Date          // 开始时间
  endTime: Date            // 结束时间
  isRecurring: boolean     // 是否为循环时间段
  recurringPattern?: 'weekly' | 'biweekly'  // 循环模式
  dayOfWeek?: number       // 星期几（0=周日, 1=周一, ..., 6=周六）
}
```

### CourseType（课程类型）

```typescript
interface CourseType {
  id: string          // UUID
  name: string        // 课程名称（如"数学辅导"）
  duration: number    // 课程时长（分钟）
  description?: string // 课程描述（可选）
  color: string       // 显示颜色（如 '#3B82F6'）
}
```

### Booking（预约）

```typescript
interface Booking {
  id: string                                // UUID
  slotId: string                           // 关联的时间段 ID
  parentName: string                       // 家长姓名
  parentPhone: string                      // 家长电话
  studentName: string                      // 学生姓名
  courseTypeId: string                     // 关联的课程类型 ID
  status: 'pending' | 'confirmed' | 'rejected'  // 预约状态
  createdAt: Date                          // 创建时间
  notes?: string                           // 备注信息（可选）
}
```

## 数据传输结构

### DataPackage（课表数据包）

教师发给家长的课表快照，用于 URL 编码或文件导出：

```typescript
interface DataPackage {
  teacher: Teacher       // 教师信息
  timeSlots: TimeSlot[]  // 可用时间段
  courseTypes: CourseType[] // 课程类型
  exportedAt: string     // 导出时间（ISO 8601）
}
```

### BookingPackage（预约数据包）

家长回传给教师的预约数据：

```typescript
interface BookingPackage {
  teacherId: string      // 教师 ID
  bookings: Booking[]    // 预约列表
  exportedAt: string     // 导出时间（ISO 8601）
}
```

## localStorage 存储结构

系统使用 `localStorage` 作为主要持久化层，键名遵循以下规则：

| 键名 | 类型 | 说明 |
|------|------|------|
| `all_teachers` | `Teacher[]` | 所有教师的列表 |
| `teacher_<id>_info` | `Teacher` | 单个教师的详细信息 |
| `teacher_<id>_timeSlots` | `TimeSlot[]` | 教师的可用时间段 |
| `teacher_<id>_bookings` | `Booking[]` | 教师的预约记录 |
| `teacher_<id>_courseTypes` | `CourseType[]` | 教师的课程类型 |
| `pendingTeacherName` | `string` | 创建教师表单中暂存的姓名 |

其中 `<id>` 为教师的 UUID。

### 示例

```json
// localStorage key: "all_teachers"
[
  { "id": "a1b2c3...", "name": "张老师", "subjects": ["数学", "物理"], "bio": "..." },
  { "id": "d4e5f6...", "name": "李老师", "subjects": ["英语"], "bio": "..." }
]

// localStorage key: "teacher_a1b2c3..._courseTypes"
[
  { "id": "x1y2...", "name": "数学辅导", "duration": 60, "color": "#3B82F6", "description": "..." },
  { "id": "z3w4...", "name": "物理辅导", "duration": 90, "color": "#10B981", "description": "..." }
]
```

## Supabase 数据库表

### teacher_schedules（实际使用）

课表云端同步表，存储教师课表的 JSONB 快照。

```sql
CREATE TABLE public.teacher_schedules (
  teacher_id  TEXT PRIMARY KEY,        -- 教师 UUID
  payload     JSONB NOT NULL DEFAULT '{}'::JSONB,  -- DataPackage JSON
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- 最后更新时间
);
```

**索引：**

```sql
CREATE INDEX teacher_schedules_updated_at_idx
  ON public.teacher_schedules (updated_at DESC);
```

**RLS 策略（MVP - 完全开放）：**

| 策略 | 操作 | 角色 | 条件 |
|------|------|------|------|
| `teacher_schedules_select` | SELECT | anon, authenticated | true |
| `teacher_schedules_insert` | INSERT | anon, authenticated | true |
| `teacher_schedules_update` | UPDATE | anon, authenticated | true |

**`payload` JSONB 结构：**

```json
{
  "teacher": {
    "id": "uuid-string",
    "name": "张老师",
    "subjects": ["数学"],
    "bio": "..."
  },
  "timeSlots": [
    {
      "id": "uuid-string",
      "startTime": "2025-01-15T09:00:00.000Z",
      "endTime": "2025-01-15T10:00:00.000Z",
      "isRecurring": false
    }
  ],
  "courseTypes": [
    {
      "id": "uuid-string",
      "name": "数学辅导",
      "duration": 60,
      "color": "#3B82F6",
      "description": "..."
    }
  ],
  "exportedAt": "2025-01-15T08:00:00.000Z"
}
```

### 规划中的关系表（schema.sql，未启用）

`supabase/schema.sql` 中定义了完整的关系型表结构，但 `src/lib/database.ts`（对应的 CRUD 代码）当前未被任何组件引用。

#### teachers

```sql
CREATE TABLE teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  bio        TEXT DEFAULT '',
  subjects   TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### time_slots

```sql
CREATE TABLE time_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  is_recurring      BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  day_of_week       INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
```

#### course_types

```sql
CREATE TABLE course_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  duration    INTEGER DEFAULT 60,
  color       TEXT DEFAULT '#3B82F6',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### bookings

```sql
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  slot_id        UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  course_type_id UUID REFERENCES course_types(id) ON DELETE SET NULL,
  student_name   TEXT NOT NULL,
  student_phone  TEXT,
  student_email  TEXT,
  notes          TEXT,
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

> **注意**：schema.sql 中 bookings 表的字段名（`student_name`, `student_phone`）与前端 TypeScript 类型（`parentName`, `parentPhone`, `studentName`）不一致，表明这是独立规划的数据库设计，未与当前前端集成。

## URL 编码格式

### 课表编码（`?s=` 参数）

```
原始 JSON → pako.deflate 压缩 → Base64 编码 → URL-safe 替换
```

URL-safe 替换规则：
- `+` → `-`
- `/` → `_`
- 移除末尾 `=`

解码为逆过程。

### 预约编码（`?b=` 参数）

与课表编码使用相同的压缩/编码方案，仅数据结构不同（`BookingPackage` vs `DataPackage`）。
