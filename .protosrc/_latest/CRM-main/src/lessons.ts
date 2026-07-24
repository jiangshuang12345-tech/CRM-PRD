import type { LessonRecord, Student, UserStatus } from './types'

// 试听课报告外链（点击「试听报告」跳转的原型页面）
export const TRIAL_REPORT_URL = 'https://jiangshuang12345-tech.github.io/CT-Trial-Report/'

// 回放示例视频（无真实录播时的占位视频）
export const REPLAY_SAMPLE_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

// 点击「回放」：打开新标签页，整屏只展示视频播放器
export function openReplayVideo(url?: string) {
  const src = url && /^https?:\/\//.test(url) ? url : REPLAY_SAMPLE_URL
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(
    '<!doctype html><html lang="zh"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"><title>课程回放</title>' +
      '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}' +
      'video{position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#000}</style>' +
      '</head><body><video src="' + src + '" controls autoplay playsinline></video></body></html>',
  )
  w.document.close()
}

// 某学生的全部课时
export function studentLessons(lessons: LessonRecord[], studentId: string): LessonRecord[] {
  return lessons.filter((l) => l.studentId === studentId)
}

// 某学生「已完课」的课时，按完课时间倒序（体验课 + 正式课）
export function completedLessons(lessons: LessonRecord[], studentId: string): LessonRecord[] {
  return studentLessons(lessons, studentId)
    .filter((l) => l.status === '已完课')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

// 某学生最近一次带报告的体验课（用于一期临时入口）
export function latestTrialReport(lessons: LessonRecord[], studentId: string): LessonRecord | null {
  const trials = completedLessons(lessons, studentId).filter((l) => l.lessonType === '体验课' && l.report)
  return trials[0] ?? null
}

// 报告类型：体验课 → Trial Report，正式课 → Lesson Report
export function reportKind(l: LessonRecord): 'Trial Report' | 'Lesson Report' {
  return l.lessonType === '体验课' ? 'Trial Report' : 'Lesson Report'
}

// 是否已体验：存在任意一节「已完课」的体验课
export function hasCompletedTrial(lessons: LessonRecord[], studentId: string): boolean {
  return lessons.some((l) => l.studentId === studentId && l.lessonType === '体验课' && l.status === '已完课')
}

// 是否体验中：存在「进行中」状态的体验课
export function hasInProgressTrial(lessons: LessonRecord[], studentId: string): boolean {
  return lessons.some((l) => l.studentId === studentId && l.lessonType === '体验课' && l.status === '进行中')
}

// 是否付费用户（付费 / 付费逾期）
export function isPaidStatus(s: Pick<Student, 'status'>): boolean {
  return s.status === '付费' || s.status === '付费逾期'
}

// 计算用户状态：
// - 有付费订单 → 保留「付费 / 付费逾期」
// - 无付费订单 + 体验课完课（任意一节）→ 未付费-已体验
// - 无付费订单 + 存在「进行中」体验课且无「已完课」体验课 → 未付费-体验中
// - 其余（无付费订单且无完课/进行中体验课）→ 未付费-未体验
export function resolveUserStatus(student: Student, lessons: LessonRecord[]): UserStatus {
  if (isPaidStatus(student)) return student.status
  if (hasCompletedTrial(lessons, student.studentId)) return '未付费-已体验'
  if (hasInProgressTrial(lessons, student.studentId)) return '未付费-体验中'
  return '未付费-未体验'
}
