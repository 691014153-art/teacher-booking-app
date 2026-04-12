import { createClient } from '@supabase/supabase-js'

function readSupabaseEnv() {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  return { url, key }
}

/** 未正确填写 .env.local 时视为未启用，避免空字符串仍走云端逻辑 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = readSupabaseEnv()
  if (!url.startsWith('https://')) return false
  if (key.length < 80) return false
  if (url.includes('你的项目') || url.includes('xxxx')) return false
  return true
}

const { url: envUrl, key: envKey } = readSupabaseEnv()
// 未配置时用占位 URL，避免 createClient 收到空字符串；请求前仍会经 isSupabaseConfigured 拦截
export const supabase = createClient(
  isSupabaseConfigured() ? envUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? envKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
)
