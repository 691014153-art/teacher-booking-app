# 教师预约系统（Teacher Booking App）

## 项目简介

教师预约系统是一款面向教师和家长的**课程预约管理工具**，旨在帮助教师高效管理可用时间，让家长便捷地预约课程。

系统采用**浏览器优先**的架构，所有核心数据默认存储在浏览器 `localStorage` 中，无需后端服务器即可运行。可选配置 Supabase 实现云端同步，以便通过短链接跨设备共享课表。

## 核心功能

### 教师端

- **时间管理** — 手动添加可用时间段，支持每周/隔周循环模式
- **预约管理** — 查看、筛选、确认或拒绝家长提交的预约
- **课程设置** — 自定义课程类型（名称、时长、颜色、描述）
- **教师设置** — 编辑个人信息（姓名、科目、简介）
- **分享课表** — 通过长链接、短链接（Supabase）或 `.json` 文件将课表发给家长

### 家长端

- **查看课表** — 日历视图浏览教师的空闲时间
- **预约课程** — 选择时段，填写家长/学生信息，提交预约
- **多种访问方式** — 支持通过链接或导入 `.json` 文件查看教师课表

### 通用特性

- **多教师支持** — 可创建和管理多个教师账户
- **无需登录** — MVP 阶段无需用户注册，通过链接知识控制访问
- **离线可用** — 无 Supabase 时也可完整运行
- **中文界面** — 全中文 UI，面向中国用户

## 技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS 3 + tailwindcss-animate |
| UI 组件 | shadcn/ui 风格自定义组件（CVA + clsx + tailwind-merge） |
| 图标库 | Lucide React |
| 日期处理 | date-fns |
| 数据压缩 | pako（deflate） |
| 后端服务 | Supabase（可选） |
| 部署平台 | Netlify（已配置） |

## 项目结构

```
teacher-booking-app/
├── docs/                        # 项目文档
├── src/
│   ├── main.tsx                 # 入口文件
│   ├── App.tsx                  # 主应用（路由、页面组件）
│   ├── types/index.ts           # TypeScript 类型定义
│   ├── context/AppContext.tsx   # 全局状态管理（Context + localStorage）
│   ├── lib/
│   │   ├── supabase.ts          # Supabase 客户端初始化
│   │   ├── remoteSchedule.ts    # 云端课表读写
│   │   ├── dataExport.ts        # 数据压缩/编码（URL 分享）
│   │   ├── scheduleFile.ts      # .json 文件导入导出
│   │   ├── urlParams.ts         # URL 参数解析
│   │   ├── data.ts              # 日历/时间段工具函数
│   │   └── database.ts          # Supabase CRUD（预留，未启用）
│   └── components/
│       ├── ui/                  # 基础 UI 组件（Button, Card, Input 等）
│       ├── teacher/             # 教师端组件
│       │   ├── TimeManagement.tsx
│       │   ├── BookingManagement.tsx
│       │   ├── CourseSettings.tsx
│       │   └── TeacherSettings.tsx
│       ├── parent/
│       │   └── ParentBooking.tsx # 家长预约组件
│       └── Calendar.tsx         # 共享日历组件
├── supabase/
│   ├── schema.sql               # 完整数据库表结构（规划用）
│   └── migrations/
│       └── 001_teacher_schedules.sql  # 实际使用的云端表
├── scripts/
│   └── verify-supabase.mjs      # Supabase 连接验证脚本
├── .netlify/netlify.toml        # Netlify 部署配置
├── .env.example                 # 环境变量模板
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

如需启用云端同步（Supabase），请参考 [部署与配置指南](./setup-guide.md)。

## 文档索引

| 文档 | 说明 |
|------|------|
| [技术架构](./architecture.md) | 系统架构设计、数据流、路由机制 |
| [部署与配置指南](./setup-guide.md) | 本地开发、Supabase 配置、Netlify 部署 |
| [数据模型参考](./data-models.md) | TypeScript 类型、数据库表结构、存储键名 |
| [使用指南](./user-guide.md) | 教师端和家长端的操作说明 |
