# 部署与配置指南

## 环境要求

- **Node.js** >= 18
- **npm** >= 9
- **Supabase 账户**（可选，用于云端同步）

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

### 3. 构建生产版本

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 4. 预览生产版本

```bash
npm run preview
```

## 配置 Supabase（可选）

不配置 Supabase 时，系统完全运行在浏览器中，使用 `localStorage` 存储数据。配置后可实现：

- **短链接分享** — 家长通过 `?teacher=<id>` 即可查看课表，无需长 URL
- **跨设备同步** — 教师更新课表后，家长任意设备打开短链接即为最新数据

### 步骤

#### 1. 创建 Supabase 项目

1. 打开 [https://supabase.com](https://supabase.com) 注册并新建一个 Project
2. 等待项目初始化完成

#### 2. 创建数据库表

1. 进入 Supabase 控制台，点击左侧 **SQL Editor** → **New query**
2. 粘贴 `supabase/migrations/001_teacher_schedules.sql` 的全部内容
3. 点击 **Run** 执行

SQL 内容如下：

```sql
create table if not exists public.teacher_schedules (
  teacher_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists teacher_schedules_updated_at_idx
  on public.teacher_schedules (updated_at desc);

alter table public.teacher_schedules enable row level security;

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
```

#### 3. 获取 API 密钥

1. 左侧点击 **Project Settings**（齿轮图标）→ **API**
2. 复制以下两个值：
   - **Project URL**（如 `https://xxxxxx.supabase.co`）
   - **anon public** 密钥（以 `eyJ...` 开头的长字符串）

> **注意**：不要使用 `service_role` 密钥，该密钥可绕过 RLS 策略，不适合前端使用。

#### 4. 配置环境变量

将 `.env.example` 复制为 `.env.local`，填入上一步获取的值：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://你的项目编号.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....你的anon公钥
```

#### 5. 重启开发服务器

修改 `.env.local` 后必须重启开发服务器才能生效：

```bash
# 停止当前服务器（Ctrl+C），然后重新启动
npm run dev
```

#### 6. 验证连接

运行内置验证脚本：

```bash
npm run verify:supabase
```

该脚本会检查 `.env.local` 配置是否正确，并尝试访问 `teacher_schedules` 表。

## 部署到 Netlify

项目已预置 Netlify 配置（`.netlify/netlify.toml`），支持 SPA 路由重定向。

### 方式一：通过 Netlify 控制台

1. 将代码推送到 GitHub/GitLab 仓库
2. 在 [Netlify](https://app.netlify.com) 中关联仓库
3. 构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. 在 **Environment variables** 中添加（如需 Supabase）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 点击 Deploy

### 方式二：手动部署

```bash
npm run build
# 将 dist/ 目录上传到 Netlify
npx netlify-cli deploy --prod --dir=dist
```

### SPA 路由配置

`dist/_redirects` 文件确保所有路由都指向 `index.html`：

```
/*    /index.html   200
```

`netlify.toml` 中也有等效配置：

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 部署到其他平台

由于本项目是纯静态 SPA，可以部署到任何支持静态文件托管的平台：

### Vercel

```bash
npm run build
npx vercel --prod
```

### GitHub Pages

需要配置 `vite.config.ts` 的 `base` 路径，并处理 SPA 路由（添加 `404.html`）。

### 自建服务器（Nginx）

```nginx
server {
    listen 80;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## NPM 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（HMR） |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run preview` | 预览 `dist/` 构建产物 |
| `npm run verify:supabase` | 验证 Supabase 连接和表是否可用 |
