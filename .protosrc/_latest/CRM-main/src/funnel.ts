import type { LessonRecord, Student } from './types'
import { hasCompletedTrial, isPaidStatus } from './lessons'

// 是否能获取到用户手机号
export function hasContactPhone(s: Student): boolean {
  return !!(s.phone && s.phone.trim())
}

// 未付费-未体验：无付费订单，且体验课未完课（任意一节）
export function isRegisteredNotTried(s: Student, lessons: LessonRecord[]): boolean {
  return !isPaidStatus(s) && !hasCompletedTrial(lessons, s.studentId)
}

// 销售中心线索：未付费-未体验，且能拿到手机号 → 自动进入销售中心
// 一旦跟进为「已付费」，会改写 status 为「付费」，从而离开销售中心、进入用户中心
export function isSalesLead(s: Student, lessons: LessonRecord[]): boolean {
  return isRegisteredNotTried(s, lessons) && hasContactPhone(s)
}

// 待领取：线索且尚无领取人
export function isPoolLead(s: Student, lessons: LessonRecord[]): boolean {
  return isSalesLead(s, lessons) && !s.salesOwner
}

// 已领取（跟进中/暂不跟进）
export function isClaimedLead(s: Student, lessons: LessonRecord[]): boolean {
  return isSalesLead(s, lessons) && !!s.salesOwner
}

// 进入用户中心的用户：
// - 未付费-未体验但拿不到手机号 → 直接进用户中心
// - 已体验 / 已付费及后续状态 → 全部进用户中心
export function inUserCenter(s: Student, lessons: LessonRecord[]): boolean {
  return !isSalesLead(s, lessons)
}
