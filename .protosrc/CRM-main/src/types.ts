export type BusinessLine = '韩国' | '沙特' | '马来' | '越南' | '其他'

export const BUSINESS_LINES: BusinessLine[] = ['韩国', '沙特', '马来', '越南', '其他']

// 业务线 -> 本地币种
export const LINE_CURRENCY: Record<BusinessLine, { code: string; label: string }> = {
  韩国: { code: 'KRW', label: '韩元 (KRW)' },
  沙特: { code: 'SAR', label: '沙特里亚尔 (SAR)' },
  马来: { code: 'MYR', label: '马来西亚林吉特 (MYR)' },
  越南: { code: 'VND', label: '越南盾 (VND)' },
  其他: { code: 'USD', label: '美元 (USD)' },
}

export const COUNTRY_CODE: Record<BusinessLine, string> = {
  韩国: '+82',
  沙特: '+966',
  马来: '+60',
  越南: '+84',
  其他: '+1',
}

export type ChannelLevelNode = {
  id: string
  name: string
  level: 1 | 2 | 3
  code?: string // 渠道 code（在该级渠道下生成）
  children: ChannelLevelNode[]
}

export type ChannelType = {
  id: string
  name: string // 自然流量 / landingpage / KOL ...
  children: ChannelLevelNode[]
}

// 业务线（最顶层）：韩国 / 沙特 / 泰国 / 越南 / 印尼 ...，下含渠道类型
export type ChannelLine = {
  id: string
  name: string
  children: ChannelType[]
}

export type UserStatus = '注册' | '体验' | '付费' | '流失'

export type LoginMethod = '谷歌邮箱' | 'Facebook' | 'kakao' | '手机号' | 'AppID'

export const LOGIN_METHODS: LoginMethod[] = ['谷歌邮箱', 'Facebook', 'kakao', '手机号', 'AppID']

// 是否带手机号（谷歌邮箱 / Facebook / AppID 无手机号）
export const METHOD_HAS_PHONE: Record<LoginMethod, boolean> = {
  谷歌邮箱: false,
  Facebook: false,
  kakao: true,
  手机号: true,
  AppID: false,
}

// 应用商店渠道（一期：无渠道体系，仅区分应用商店来源）
export type AppChannel = 'App Store' | 'Google Play'
export const APP_CHANNELS: AppChannel[] = ['App Store', 'Google Play']

export type Student = {
  studentId: string
  name: string
  localName?: string
  gender?: '男' | '女' | '其他'
  birthday?: string // YYYY-MM-DD
  loginMethod: LoginMethod
  account: string // 登录账号：邮箱 / FB / kakao ID / AppID / 手机号
  phone?: string // 仅 kakao / 手机号 方式有
  businessLine: BusinessLine
  registerChannel: string
  countryCode: string
  channelCode: string
  country?: string // 注册时 IP 对应的国家（一期用户中心）
  appChannel?: AppChannel // 注册渠道（一期：App Store / Google Play）
  registerTime: string // Beijing
  status: UserStatus
  expireTime?: string // 到期时间
  lastModifier?: string // 最近修改人
}

export type OrderStatus = '待支付' | '已支付' | '已退款' | '已取消'

export type Order = {
  orderId: string
  productName: string
  studentId: string
  userStatus: UserStatus
  orderStatus: OrderStatus
  originalPrice: number
  paidAmount: number
  payMethod: 'App Store' | 'Google Play' | 'Stripe' | 'PayPal'
  currency: string
  paidTime?: string
  validUntil?: string // 有效期到期时间
}

export type PackageStatus = '上架' | '下架'

export type CoursePackage = {
  id: string
  businessLine: BusinessLine
  name: string
  currency: string
  price: number
  validStart: string // 有效期开始时间 YYYY-MM-DD HH:mm:ss
  validEnd: string // 有效期结束时间 YYYY-MM-DD HH:mm:ss
  creator: string
  status: PackageStatus
  createdAt: string
}

// 落地页：一键生成投放链接，关联渠道、商品包、优惠券
export type LandingPage = {
  id: string
  businessLine: string
  channelCode: string
  channelName?: string
  packageId?: string
  packageName?: string
  couponId?: string
  couponCode?: string
  validFrom?: string
  validUntil?: string
  url: string
  creator: string
  createdAt: string
}

// ---------- 角色权限（RBAC） ----------
// 权限级别：无权限 / 只读 / 可操作
export type PermLevel = 'none' | 'view' | 'operate'

// 数据权限：全部业务线 / 指定业务线
export type DataScope = 'all' | 'line'

// 受权限管控的功能模块
export type ModuleKey =
  | 'channels'
  | 'landing'
  | 'packages'
  | 'coupons'
  | 'users'
  | 'orders'
  | 'system'

export const PERMISSION_MODULES: ModuleKey[] = [
  'channels',
  'landing',
  'packages',
  'coupons',
  'users',
  'orders',
  'system',
]

export type Role = {
  id: string
  name: string
  desc: string
  builtin: boolean // 内置角色（不可删除）
  planned?: boolean // 后期随服务节点引入
  dataScope: DataScope
  perms: Record<ModuleKey, PermLevel>
}

export type AccountStatus = '启用' | '停用'

export type Account = {
  id: string
  email: string
  name: string
  roleId: string
  businessLines: string[] // 数据权限范围（dataScope='line' 时生效）
  status: AccountStatus
  lastLogin?: string
}

// 操作日志（审计）
export type AuditLog = {
  id: string
  time: string
  actor: string // 操作人邮箱
  module: ModuleKey
  action: string // 动作描述
  target?: string // 操作对象
}

export type CouponStatus = '已生效' | '已结束'

export type CouponProduct = {
  id: string
  name: string
  price: number
}

// 一张优惠券可包含多个优惠码（如分发给不同 KOL），分别统计领取/使用量用于结算
export type CouponCode = {
  id: string
  code: string
  kol: string // 使用方 / KOL 名称
  used: number // 该码已使用张数
}

export type Coupon = {
  id: string
  name: string
  codes: CouponCode[]
  businessLine: BusinessLine
  couponType: '满减券'
  currency: string
  creator: string
  total: number
  remaining: number
  // 发放及领取规则
  claimStart: string
  claimEnd: string
  // 使用规则
  useStart: string
  useEnd: string
  products: CouponProduct[]
  // 权益规则（满减）
  thresholdAmount: number
  deductAmount: number
  status: CouponStatus
  createdAt: string
}
