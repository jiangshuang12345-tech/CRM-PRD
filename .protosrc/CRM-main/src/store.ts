import { useSyncExternalStore } from 'react'
import dayjs from 'dayjs'
import type {
  Account,
  AuditLog,
  ChannelLine,
  Coupon,
  CoursePackage,
  LandingPage,
  ModuleKey,
  Order,
  Role,
  Student,
} from './types'
import { LINE_CURRENCY } from './types'

const KEY = 'dinoai_crm_state_v19'

export type AppState = {
  channels: ChannelLine[]
  students: Student[]
  orders: Order[]
  packages: CoursePackage[]
  coupons: Coupon[]
  landingPages: LandingPage[]
  roles: Role[]
  accounts: Account[]
  logs: AuditLog[]
}

const listeners = new Set<() => void>()
// 注意：counter 必须在 load()/seed() 之前初始化，否则 seed 内调用 uid() 会触发 TDZ 报错
let counter = Date.now()
let state: AppState = load()

function emit() {
  save(state)
  listeners.forEach((l) => l())
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const seeded = seed()
  localStorage.setItem(KEY, JSON.stringify(seeded))
  return seeded
}

function save(s: AppState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function resetState() {
  state = seed()
  emit()
}

export function setState(updater: (prev: AppState) => AppState) {
  state = updater(state)
  emit()
}

export function getState() {
  return state
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => selector(state),
  )
}

// ---------- id helpers ----------
export function uid(prefix = '') {
  counter += 1
  return `${prefix}${counter.toString(36)}`
}

export function genCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function genChannelCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// ---------- seed ----------
function seed(): AppState {
  const channels: ChannelLine[] = [
    {
      id: 'bl_kr',
      name: '韩国',
      children: [
        {
          id: 'ct_kr_natural',
          name: '自然流量',
          children: [
            {
              id: 'c_kr_aso',
              name: 'ASO',
              level: 1,
              children: [
                { id: 'c_kr_aso_appstore', name: 'App Store 搜索', level: 2, code: 'K2000Gh', children: [] },
              ],
            },
          ],
        },
        {
          id: 'ct_kr_kol',
          name: 'KOL',
          children: [
            {
              id: 'c_kr_kol_ig',
              name: 'Instagram 达人',
              level: 1,
              children: [
                { id: 'c_kr_kol_ig_1', name: '@seoyeon_edu', level: 2, code: 'Ig58Kpq', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_sa',
      name: '沙特',
      children: [
        {
          id: 'ct_sa_landing',
          name: 'landingpage',
          children: [
            {
              id: 'c_sa_meta',
              name: 'Meta 信息流',
              level: 1,
              children: [
                { id: 'c_sa_meta_fb', name: 'Facebook 主页', level: 2, code: 'Fb73Mxa', children: [] },
                { id: 'c_sa_meta_ig', name: 'Instagram', level: 2, children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_th',
      name: '泰国',
      children: [
        {
          id: 'ct_th_natural',
          name: '自然流量',
          children: [
            { id: 'c_th_aso', name: 'ASO', level: 1, children: [] },
          ],
        },
      ],
    },
    {
      id: 'bl_vn',
      name: '越南',
      children: [
        {
          id: 'ct_vn_kol',
          name: 'KOL',
          children: [
            {
              id: 'c_vn_tiktok',
              name: 'TikTok 达人',
              level: 1,
              children: [
                { id: 'c_vn_tiktok_1', name: '@minh_edu', level: 2, code: 'Tk88Vzq', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_id',
      name: '印尼',
      children: [
        {
          id: 'ct_id_landing',
          name: 'landingpage',
          children: [
            { id: 'c_id_meta', name: 'Meta 信息流', level: 1, children: [] },
          ],
        },
      ],
    },
  ]

  const now = dayjs()
  const students: Student[] = [
    {
      studentId: '2060199610824355842', name: 'Ji-woo Kim', localName: '김지우', gender: '男',
      birthday: '2016-05-12', loginMethod: '谷歌邮箱', account: 'jiwoo.kim@gmail.com', businessLine: '韩国', registerChannel: '自然流量 / ASO',
      countryCode: '+82', channelCode: 'K2000Gh', registerTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费', expireTime: now.add(88, 'day').format('YYYY-MM-DD HH:mm:ss'), lastModifier: 'admin@dinoai.ai',
    },
    {
      studentId: '2060199610824355843', name: 'Abdullah Al-Saud', localName: 'عبدالله', gender: '男',
      birthday: '2015-09-03', loginMethod: 'Facebook', account: 'abdullah.alsaud@outlook.com', businessLine: '沙特', registerChannel: 'landingpage / Meta',
      countryCode: '+966', channelCode: 'Fb73Mxa', registerTime: now.subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '体验', expireTime: now.add(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      studentId: '2060199610824355844', name: 'Nguyen Thi Mai', localName: 'Nguyễn Thị Mai', gender: '女',
      birthday: '2017-01-20', loginMethod: '手机号', account: '+84 90-123-4567', phone: '+84 90-123-4567', businessLine: '越南', registerChannel: 'KOL / TikTok',
      countryCode: '+84', channelCode: 'Tk88Vzq', registerTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '注册',
    },
    {
      studentId: '2060199610824355845', name: 'Tan Wei Ming', localName: '陈伟明', gender: '男',
      birthday: '2016-11-08', loginMethod: 'AppID', account: 'weiming.tan@icloud.com', businessLine: '马来', registerChannel: '自然流量',
      countryCode: '+60', channelCode: 'As2K1d9', registerTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '流失', expireTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      studentId: '2060199610824355846', name: 'Seo-yeon Park', localName: '박서연', gender: '女',
      birthday: '2017-03-22', loginMethod: 'kakao', account: '+82 10-9876-5432', phone: '+82 10-9876-5432', businessLine: '韩国', registerChannel: 'KOL / Instagram',
      countryCode: '+82', channelCode: 'Ig58Kpq', registerTime: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费', expireTime: now.add(360, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const orders: Order[] = [
    {
      orderId: 'DN2026061800001', productName: 'Dino English 季度会员', studentId: '2060199610824355842', userStatus: '付费',
      orderStatus: '已支付', originalPrice: 119000, paidAmount: 99000, payMethod: 'App Store', currency: 'KRW',
      paidTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(88, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      orderId: 'DN2026061800002', productName: 'Dino English 月度会员', studentId: '2060199610824355843', userStatus: '体验',
      orderStatus: '待支付', originalPrice: 39, paidAmount: 0, payMethod: 'Google Play', currency: 'USD',
    },
    {
      orderId: 'DN2026061700015', productName: 'Dino English 年度会员', studentId: '2060199610824355845', userStatus: '流失',
      orderStatus: '已退款', originalPrice: 388, paidAmount: 388, payMethod: 'Stripe', currency: 'MYR',
      paidTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(357, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      orderId: 'DN2026061600008', productName: 'Dino English 年度会员', studentId: '2060199610824355846', userStatus: '流失',
      orderStatus: '已取消', originalPrice: 119000, paidAmount: 0, payMethod: 'App Store', currency: 'KRW',
    },
  ]

  const packages: CoursePackage[] = [
    {
      id: 'PKG1001', businessLine: '韩国', name: 'Dino English 启蒙季度商品包', currency: LINE_CURRENCY['韩国'].code,
      price: 99000, validStart: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(80, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1002', businessLine: '沙特', name: 'Dino English 月度体验商品包', currency: LINE_CURRENCY['沙特'].code,
      price: 149, validStart: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(23, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1003', businessLine: '越南', name: 'Dino English 年度畅学商品包', currency: LINE_CURRENCY['越南'].code,
      price: 2990000, validStart: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(350, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '下架', createdAt: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const coupons: Coupon[] = [
    {
      id: 'CP4017', name: '26年6月韩国新客满减券',
      codes: [
        { id: uid('cc_'), code: genCouponCode(), kol: '@seoyeon_edu', used: 412 },
        { id: uid('cc_'), code: genCouponCode(), kol: '@jiwoo_mom', used: 187 },
        { id: uid('cc_'), code: genCouponCode(), kol: '官方自投', used: 172 },
      ],
      businessLine: '韩国', couponType: '满减券',
      currency: 'KRW', creator: 'admin@dinoai.ai', total: 100000, remaining: 99229,
      claimStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.add(12, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(30, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1001', name: 'Dino English 启蒙季度商品包', price: 99000 }],
      thresholdAmount: 99000, deductAmount: 20000, status: '已生效',
      createdAt: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'CP4016', name: '26年6月沙特拉新满减券',
      codes: [
        { id: uid('cc_'), code: genCouponCode(), kol: '@sara.ksa', used: 1203 },
        { id: uid('cc_'), code: genCouponCode(), kol: '官方自投', used: 1016 },
      ],
      businessLine: '沙特', couponType: '满减券',
      currency: 'USD', creator: 'admin@dinoai.ai', total: 100000, remaining: 97781,
      claimStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1002', name: 'Dino English 月度体验商品包', price: 149 }],
      thresholdAmount: 149, deductAmount: 30, status: '已结束',
      createdAt: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const landingPages: LandingPage[] = [
    {
      id: uid('lp_'),
      businessLine: '韩国',
      channelCode: 'K2000Gh',
      channelName: '自然流量 / ASO / App Store 搜索',
      packageId: 'PKG1001',
      packageName: 'Dino English 启蒙季度商品包',
      couponId: 'CP4017',
      couponCode: '',
      validFrom: now.subtract(2, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(28, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      url: 'https://kr.dinoai.ai/website/signin/?backurl=%2Fwebsite%2Fpayment%2Fsku%2F%3Fid%3DPKG1001%26channel%3DK2000Gh',
      creator: 'admin@dinoai.ai',
      createdAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('lp_'),
      businessLine: '越南',
      channelCode: 'Tk88Vzq',
      channelName: 'KOL / TikTok 达人 / @minh_edu',
      packageId: 'PKG1003',
      packageName: 'Dino English 年度畅学商品包',
      validFrom: now.subtract(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(14, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      url: 'https://vn.dinoai.ai/website/landingpage/signin/?channel=Tk88Vzq',
      creator: 'admin@dinoai.ai',
      createdAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const roles: Role[] = [
    {
      id: 'role_growth',
      name: '市场投放 / 增长',
      desc: '渠道管理、落地页（生码 + 归因 + 投放链接）',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'operate',
        landing: 'operate',
        packages: 'view',
        coupons: 'view',
        users: 'none',
        orders: 'none',
        finance: 'none',
        system: 'none',
      },
    },
    {
      id: 'role_ops',
      name: '运营 / 商业化',
      desc: '商品包、优惠券、落地页，后期触达 / 服务编排',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'view',
        landing: 'operate',
        packages: 'operate',
        coupons: 'operate',
        users: 'view',
        orders: 'view',
        finance: 'none',
        system: 'none',
      },
    },
    {
      id: 'role_support',
      name: '客服 / 用户支持',
      desc: '用户中心、订单中心，后期单点触达答疑 / 关怀',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'none',
        landing: 'none',
        packages: 'none',
        coupons: 'none',
        users: 'operate',
        orders: 'view',
        finance: 'none',
        system: 'none',
      },
    },
    {
      id: 'role_finance',
      name: '财务 / 商业分析',
      desc: '订单对账、优惠码按 KOL 结算',
      builtin: true,
      dataScope: 'all',
      perms: {
        channels: 'none',
        landing: 'none',
        packages: 'view',
        coupons: 'view',
        users: 'view',
        orders: 'view',
        finance: 'operate',
        system: 'none',
      },
    },
    {
      id: 'role_admin',
      name: '管理员 / 系统配置',
      desc: '账号鉴权、业务线 / 模版，角色权限',
      builtin: true,
      dataScope: 'all',
      perms: {
        channels: 'operate',
        landing: 'operate',
        packages: 'operate',
        coupons: 'operate',
        users: 'operate',
        orders: 'operate',
        finance: 'operate',
        system: 'operate',
      },
    },
    {
      id: 'role_mentor',
      name: '学习服务 / 班主任',
      desc: '体验跟进、续费引导、流失挽回（后期随服务节点引入）',
      builtin: true,
      planned: true,
      dataScope: 'line',
      perms: {
        channels: 'none',
        landing: 'none',
        packages: 'none',
        coupons: 'none',
        users: 'view',
        orders: 'view',
        finance: 'none',
        system: 'none',
      },
    },
  ]

  const accounts: Account[] = [
    {
      id: uid('acc_'),
      email: 'admin@dinoai.ai',
      name: '系统管理员',
      roleId: 'role_admin',
      businessLines: [],
      status: '启用',
      lastLogin: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'growth.kr@dinoai.ai',
      name: '金敏修',
      roleId: 'role_growth',
      businessLines: ['韩国'],
      status: '启用',
      lastLogin: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'ops.vn@dinoai.ai',
      name: 'Trần Thị B',
      roleId: 'role_ops',
      businessLines: ['越南', '泰国'],
      status: '启用',
      lastLogin: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'cs.sa@dinoai.ai',
      name: 'Sara Al-Otaibi',
      roleId: 'role_support',
      businessLines: ['沙特'],
      status: '启用',
      lastLogin: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'finance@dinoai.ai',
      name: '李雪',
      roleId: 'role_finance',
      businessLines: [],
      status: '启用',
      lastLogin: now.subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'mentor.kr@dinoai.ai',
      name: '박지은',
      roleId: 'role_mentor',
      businessLines: ['韩国'],
      status: '停用',
    },
  ]

  const logs: AuditLog[] = [
    {
      id: uid('log_'),
      time: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      actor: 'admin@dinoai.ai',
      module: 'system',
      action: '更新角色权限',
      target: '客服 / 用户支持',
    },
    {
      id: uid('log_'),
      time: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      actor: 'admin@dinoai.ai',
      module: 'system',
      action: '新增成员',
      target: 'ops.vn@dinoai.ai',
    },
  ]

  return { channels, students, orders, packages, coupons, landingPages, roles, accounts, logs }
}

// ---------- 操作日志 ----------
export function addLog(entry: { actor: string; module: ModuleKey; action: string; target?: string }) {
  const log: AuditLog = {
    id: uid('log_'),
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...entry,
  }
  state = { ...state, logs: [log, ...state.logs].slice(0, 300) }
  emit()
}
