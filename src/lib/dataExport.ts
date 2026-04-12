import { TimeSlot, CourseType, Teacher, Booking } from '@/types'
import pako from 'pako'

// 时间表数据包结构（教师发给家长）
export interface DataPackage {
  teacher: Teacher
  timeSlots: TimeSlot[]
  courseTypes: CourseType[]
  exportedAt: string
}

// 预约数据包结构（家长发给教师）
export interface BookingPackage {
  teacherId: string
  bookings: Booking[]
  exportedAt: string
}

// 避免 String.fromCharCode(...uint8) 参数过多导致编码失败
function uint8ToBinaryString(bytes: Uint8Array): string {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode.apply(null, sub as unknown as number[])
  }
  return binary
}

// 压缩并编码数据（通用）
function encodeData<T>(data: T): string {
  try {
    const jsonStr = JSON.stringify(data)
    const compressed = pako.deflate(jsonStr)
    let base64 = btoa(uint8ToBinaryString(compressed))
    // URL安全编码
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64
  } catch (error) {
    console.error('编码数据失败:', error)
    return ''
  }
}

// 解码并解压数据（通用）
function decodeData<T>(encoded: string): T | null {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const decompressed = pako.inflate(bytes, { to: 'string' })
    return JSON.parse(decompressed)
  } catch (error) {
    console.error('解码数据失败:', error)
    return null
  }
}

// 链接里是否带有时间表快照（查询参数优先：微信等常会丢弃 #hash）
export function hasSchedulePayloadInUrl(): boolean {
  if (new URLSearchParams(window.location.search).get('s')) return true
  const hash = window.location.hash.slice(1)
  return hash.startsWith('s=')
}

// 从 URL 读取时间表：?s=…（主）或 #s=…（兼容旧链接）
export function getDataFromUrl(): DataPackage | null {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('s')
  if (fromQuery) {
    const pkg = decodeData<DataPackage>(fromQuery)
    if (pkg?.teacher?.id) return pkg
  }
  const hash = window.location.hash.slice(1)
  if (hash.startsWith('s=')) {
    const pkg = decodeData<DataPackage>(hash.slice(2))
    if (pkg?.teacher?.id) return pkg
  }
  return null
}

// 从 URL 读取预约包：?b=… 或 #b=…
export function getBookingFromUrl(): BookingPackage | null {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('b')
  if (fromQuery) {
    const pkg = decodeData<BookingPackage>(fromQuery)
    if (pkg?.teacherId) return pkg
  }
  const hash = window.location.hash.slice(1)
  if (hash.startsWith('b=')) {
    const pkg = decodeData<BookingPackage>(hash.slice(2))
    if (pkg?.teacherId) return pkg
  }
  return null
}

// 导入预约后去掉 URL 里的 b，避免刷新重复导入
export function stripImportedBookingFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('b')
  if (/^b=/.test(url.hash.slice(1))) {
    url.hash = ''
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

// 生成时间表分享链接（快照放在 ?s=，避免微信等丢弃 hash 后家长看不到时间）
export function generateScheduleUrl(data: DataPackage): string {
  const encoded = encodeData(data)
  const p = new URLSearchParams()
  p.set('teacher', data.teacher.id)
  if (encoded) {
    p.set('s', encoded)
  }
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return `${base}?${p.toString()}`
}

// 生成预约分享链接（预约数据放在 ?b=）
export function generateBookingUrl(teacherId: string, bookings: Booking[]): string {
  const data: BookingPackage = {
    teacherId,
    bookings,
    exportedAt: new Date().toISOString()
  }
  const encoded = encodeData(data)
  const p = new URLSearchParams()
  p.set('teacher', teacherId)
  p.set('mode', 'manage')
  if (encoded) {
    p.set('b', encoded)
  }
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return `${base}?${p.toString()}`
}

// 计算数据大小
export function estimateDataSize(data: DataPackage | BookingPackage): number {
  const jsonStr = JSON.stringify(data)
  return new Blob([jsonStr]).size
}
