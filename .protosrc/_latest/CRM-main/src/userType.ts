import type { Student, UserType } from './types'

// 测试用户判定规则：手机号（归一化去掉国家码后）以连续 5 个 0 开头
export const TEST_ZERO_PREFIX = '00000'

// 归一化手机号：去掉所有非数字字符，并尽量去掉前面的国家码
export function normalizePhone(phone?: string, countryCode?: string): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  const cc = (countryCode || '').replace(/\D/g, '')
  if (cc && digits.startsWith(cc)) digits = digits.slice(cc.length)
  return digits
}

// 手机号是否命中测试规则（前 5 位连续为 0）
export function isTestPhone(phone?: string, countryCode?: string): boolean {
  return normalizePhone(phone, countryCode).startsWith(TEST_ZERO_PREFIX)
}

// 是否为带手机号的登录方式（手机号 / kakao）——此类用户由规则自动判定
export function hasPhoneLogin(s: Student): boolean {
  return !!s.phone && (s.loginMethod === '手机号' || s.loginMethod === 'kakao')
}

// 计算用户的有效类型：
// - 带手机号的用户：按手机号规则自动判定
// - 其他第三方登录方式：使用后台可编辑的 userType
export function resolveUserType(s: Student): UserType {
  if (hasPhoneLogin(s)) return isTestPhone(s.phone, s.countryCode) ? '测试用户' : '正式用户'
  return s.userType
}
