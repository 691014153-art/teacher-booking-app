-- 在 Supabase 控制台 → SQL Editor 中执行本文件
-- 用途：家长提交预约、教师确认/拒绝、家长查看结果

create table if not exists public.bookings (
  id text primary key,
  teacher_id text not null,
  slot_id text not null,
  course_type_id text,
  parent_name text not null,
  parent_phone text not null,
  student_name text not null,
  notes text default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_teacher_id_idx
  on public.bookings (teacher_id);

create index if not exists bookings_status_idx
  on public.bookings (teacher_id, status);

alter table public.bookings enable row level security;

-- MVP：匿名可读写（与 teacher_schedules 相同策略）
create policy "bookings_select"
  on public.bookings for select
  to anon, authenticated
  using (true);

create policy "bookings_insert"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

create policy "bookings_update"
  on public.bookings for update
  to anon, authenticated
  using (true)
  with check (true);
