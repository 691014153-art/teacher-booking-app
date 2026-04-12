-- 教师预约系统数据库表结构
-- 请在 Supabase SQL Editor 中运行此脚本

-- 1. 教师表
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  subjects TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 时间段表
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  day_of_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 3. 课程类型表
CREATE TABLE IF NOT EXISTS course_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  color TEXT DEFAULT '#3B82F6',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 预约表
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  course_type_id UUID REFERENCES course_types(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_phone TEXT,
  student_email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_time_slots_teacher ON time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_start ON time_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_course_types_teacher ON course_types(teacher_id);

-- 设置 RLS (Row Level Security) - 允许匿名访问（因为不需要登录）
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取和写入（适合无需登录的公开预约系统）
CREATE POLICY "Allow public read access" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON teachers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON teachers FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON time_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON time_slots FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON time_slots FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON course_types FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON course_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON course_types FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON course_types FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON bookings FOR DELETE USING (true);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 teachers 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
