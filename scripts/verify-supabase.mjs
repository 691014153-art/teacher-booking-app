/**
 * 校验 .env.local 是否填写正确，并请求 Supabase 测试 teacher_schedules 表是否可读。
 * 用法：在项目根目录执行  npm run verify:supabase
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env.local')

function parseEnvLocal(file) {
  if (!fs.existsSync(file)) {
    return null
  }
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

function ok(msg) {
  console.log('\x1b[32m✓\x1b[0m', msg)
}
function bad(msg) {
  console.log('\x1b[31m✗\x1b[0m', msg)
}

const env = parseEnvLocal(envPath)
if (!env) {
  bad('未找到 .env.local')
  console.log('\n请执行：  cp .env.example .env.local')
  console.log('然后编辑 .env.local，填入 Supabase 的 Project URL 与 anon public 密钥。\n')
  process.exit(1)
}

const url = (env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const key = (env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!url.startsWith('https://')) {
  bad('VITE_SUPABASE_URL 必须以 https:// 开头（在 Supabase → Settings → API 复制 Project URL）')
  process.exit(1)
}
if (url.includes('你的项目') || url.includes('xxxx')) {
  bad('请把 VITE_SUPABASE_URL 换成真实的 Project URL，不要保留示例里的占位文字')
  process.exit(1)
}
if (key.length < 80) {
  bad('VITE_SUPABASE_ANON_KEY 看起来不完整（anon 公钥通常是很长的 JWT）')
  process.exit(1)
}

ok('已读取 .env.local')

const testUrl = `${url}/rest/v1/teacher_schedules?select=teacher_id&limit=1`
const res = await fetch(testUrl, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  }
})

const body = await res.text()
if (!res.ok) {
  bad(`请求失败 HTTP ${res.status}`)
  console.log(body.slice(0, 800))
  if (res.status === 404 || body.includes('relation') || body.includes('does not exist')) {
    console.log(
      '\n→ 请在 Supabase SQL Editor 执行：supabase/migrations/001_teacher_schedules.sql 全文\n'
    )
  }
  if (res.status === 401 || body.includes('JWT')) {
    console.log('\n→ 请检查 VITE_SUPABASE_ANON_KEY 是否为「anon public」密钥（不是 service_role）\n')
  }
  process.exit(1)
}

ok(`表 teacher_schedules 可访问（HTTP ${res.status}）`)
console.log('\n接下来请执行  npm run dev  ，在教师后台点「复制预约链接」再测家长端。\n')
