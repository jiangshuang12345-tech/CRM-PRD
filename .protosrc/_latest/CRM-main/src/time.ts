import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// 国家 / 业务线 -> IANA 时区（按注册国家计算当地时间）
export const COUNTRY_TZ: Record<string, string> = {
  中国: 'Asia/Shanghai',
  韩国: 'Asia/Seoul',
  沙特: 'Asia/Riyadh',
  越南: 'Asia/Ho_Chi_Minh',
  印尼: 'Asia/Jakarta',
  泰国: 'Asia/Bangkok',
  马来: 'Asia/Kuala_Lumpur',
  马来西亚: 'Asia/Kuala_Lumpur',
  其他: 'UTC',
}

const DEFAULT_TZ = 'UTC'
const FMT = 'YYYY-MM-DD HH:mm:ss'

export function tzOf(country?: string): string {
  if (!country) return DEFAULT_TZ
  return COUNTRY_TZ[country] || DEFAULT_TZ
}

// 将存储的 UTC 时间字符串，转换为对应国家的当地时间字符串
export function toLocalTime(utcStr?: string, country?: string): string {
  if (!utcStr) return ''
  const d = dayjs.utc(utcStr)
  if (!d.isValid()) return utcStr
  return d.tz(tzOf(country)).format(FMT)
}

// 当地时间的时区标注，如 UTC+09:00
export function tzLabel(country?: string): string {
  const d = dayjs.utc().tz(tzOf(country))
  return `UTC${d.format('Z')}`
}
