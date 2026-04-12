-- 在 Supabase 控制台 → SQL Editor 中执行本文件（或复制全部语句运行）
-- 用途：家长通过短链接 ?teacher=xxx 拉取教师已同步的空闲时间与课程类型

create table if not exists public.teacher_schedules (
  teacher_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists teacher_schedules_updated_at_idx
  on public.teacher_schedules (updated_at desc);

alter table public.teacher_schedules enable row level security;

-- MVP：匿名也可读写（知道 teacher_id 即可）。仅用于无登录的小工具；正式环境请改为登录教师 + RLS
create policy "teacher_schedules_select"
  on public.teacher_schedules for select
  to anon, authenticated
  using (true);

create policy "teacher_schedules_insert"
  on public.teacher_schedules for insert
  to anon, authenticated
  with check (true);

create policy "teacher_schedules_update"
  on public.teacher_schedules for update
  to anon, authenticated
  using (true)
  with check (true);
