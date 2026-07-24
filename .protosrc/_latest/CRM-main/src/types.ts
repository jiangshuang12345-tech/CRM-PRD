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

// 渠道自定义参数（暂支持两个）
export type ChannelParams = {
  param1?: string
  param2?: string
}

export type ChannelLevelNode = {
  id: string
  name: string
  level: 1 | 2 | 3
  code?: string // 渠道 code（在该级渠道下生成）
  params?: ChannelParams // 渠道参数（在末级渠道上填写）
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

export type UserStatus = '未付费-未体验' | '未付费-体验中' | '未付费-已体验' | '付费' | '付费逾期'

export const USER_STATUSES: UserStatus[] = ['未付费-未体验', '未付费-体验中', '未付费-已体验', '付费', '付费逾期']

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

export type AgeGroup = '3-5' | '6-8' | '9-12' | '13-17' | '18+'
export const AGE_GROUPS: AgeGroup[] = ['3-5', '6-8', '9-12', '13-17', '18+']

// 用户类型：正式用户 / 测试用户
export type UserType = '正式用户' | '测试用户'
export const USER_TYPES: UserType[] = ['正式用户', '测试用户']

// 单个字段的修改前后对比
export type StudentFieldChange = {
  field: string // 字段名（展示文案）
  before: string // 修改前
  after: string // 修改后
}

// 学生信息修改历史：每次操作的时间、行为（i18n key）、变更对比、修改人
export type StudentEditLog = {
  time: string
  action: string // i18n key，如 'user.hist.edit'
  detail?: string // 变更明细（旧数据兼容，纯文本）
  changes?: StudentFieldChange[] // 修改前后对比
  modifier: string
}

export type Student = {
  studentId: string
  name: string
  localName?: string
  userType: UserType
  gender?: '男' | '女' | '其他'
  birthday?: string // YYYY-MM-DD
  ageGroup?: AgeGroup
  loginMethod: LoginMethod
  account: string // 登录账号：邮箱 / FB / kakao ID / AppID / 手机号
  phone?: string // 仅 kakao / 手机号 方式有
  businessLine: BusinessLine
  registerChannel: string
  countryCode: string
  channelCode: string
  country?: string // 注册时 IP 对应的国家（一期用户中心）
  appChannel?: AppChannel // 注册渠道（一期：App Store / Google Play）
  // 渠道来源展示：
  // 1) 有渠道 code（落地页投放）：广告渠道名称
  // 2) 无渠道 code（直接投 App）：三方归因「投放渠道 / 子渠道」
  adChannel?: string // 广告渠道 / 投放渠道（如 Meta Ads、googleadwords_int、Facebook Ads）
  subChannel?: string // 子渠道（三方归因，如 Instagram、Facebook、ACI_Search）
  
  // 新增二期列表字段
  courseLevel?: string // 课程等级 (e.g. Level1)
  trialStatusStr?: string // 体验状况 (e.g. 已体验未完课)
  paymentStatusStr?: string // 付费状况 (e.g. 未付费)
  paymentPlatform?: string // 支付端 (e.g. app端支付)
  campaign?: string
  campaignId?: string
  registerTime: string // UTC
  status: UserStatus
  expireTime?: string // 到期时间
  lastModifier?: string // 最近修改人
  editHistory?: StudentEditLog[] // 修改历史（时间 / 行为 / 修改人）
  // ---- 销售中心（线索跟进）----
  channelSource?: string // 渠道来源（投放/KOL 归因标识）
  salesOwner?: string // 领取人（销售）
  salesProgress?: SalesProgress // 跟进进度（仅销售中心线索）
  salesLatestNote?: string // 最新备注
  salesUpdatedAt?: string // 最后更新时间
  salesHistory?: SalesFollowLog[] // 跟进记录
}

// 销售跟进进度（线索在销售中心的状态；转「已体验/已付费」时改写 status 并离开销售中心）
export type SalesProgress = '待领取' | '跟进中' | '暂不跟进'

export type SalesFollowLog = {
  progress: string
  note: string
  time: string
  owner: string
  audioUrl?: string
}

export type SalesSettings = {
  autoDropEnabled: boolean
  autoDropHours: number
  allocations: { email: string; weight: number }[]
}

// ---- 课程 / 课时报告 ----
export type LessonType = '体验课' | '正式课'
export const LESSON_TYPES: LessonType[] = ['体验课', '正式课']

export type LessonStatus = '进行中' | '已完课' | '已预约' | '已取消'

// 报告里的能力评估项（score：1-5）
export type LessonRating = { label: string; score: number }

export type LessonReport = {
  summary: string // 课堂小结
  ratings: LessonRating[] // 能力评估
  teacherComment: string // 老师评语
  homework?: string // 课后作业
}

// 课时记录（课标）：体验课/正式课，含报告与回放
export type LessonRecord = {
  id: string
  studentId: string
  courseLabel: string // 课标，如 TCELA-L1-U2-LC1-11
  lessonType: LessonType // 体验课 / 正式课
  status: LessonStatus
  teacher?: string // 授课老师
  completedAt?: string // 完课时间（已完课才有，UTC）
  replayUrl?: string // 回放链接
  report?: LessonReport // Trial Report / Lesson Report 内容
}

// 外呼通话结果
export type CallResult = '已接通' | '无人接听'
export const CALL_RESULTS: CallResult[] = ['已接通', '无人接听']

// 外呼通话记录（坐席点击号码发起外呼，挂断后填写通话小结，归档到客户档案与销售跟进记录）
export type CallRecord = {
  id: string
  studentId: string
  customer: string // 客户姓名
  phone: string
  businessLine: string
  result: CallResult // 通话结果
  duration: string // 时长（mm:ss，无人接听为 —）
  note: string // 本次跟进记录
  agent: string // 外呼坐席
  time: string // 起呼时间
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
  bestValue?: boolean // Best Value 标签（选中后在前端页面展示推荐标签）
}

// 落地页：一键生成投放链接，关联渠道、商品包、优惠券
export type LandingPage = {
  id: string
  name: string // 落地页名称
  businessLine: string
  channelCode: string
  channelName?: string
  param1?: string // 渠道参数1（生成时带入链接）
  param2?: string // 渠道参数2
  packageId?: string // 兼容旧数据：单个商品包
  packageName?: string
  packageIds?: string[] // 商品包（支持多选）
  packageNames?: string[]
  originalPrice?: string // 划线价（非必填，仅展示用）
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
  // 主模块
  | 'channels' | 'landing' | 'packages' | 'coupons' | 'users' | 'usersV2' | 'sales' | 'orders' | 'system'
  // 子权限 - channels
  | 'channels_create' | 'channels_edit' | 'channels_delete' | 'channels_gen_code' | 'channels_params'
  // 子权限 - landing
  | 'landing_create' | 'landing_delete'
  // 子权限 - packages
  | 'packages_create' | 'packages_edit' | 'packages_status'
  // 子权限 - coupons
  | 'coupons_create' | 'coupons_extend' | 'coupons_revoke' | 'coupons_edit'
  // 子权限 - users
  | 'users_edit'
  // 子权限 - sales
  | 'sales_claim' | 'sales_dial' | 'sales_update' | 'sales_reassign' | 'sales_config'
  // 子权限 - system
  | 'system_role_add' | 'system_role_edit' | 'system_role_delete' | 'system_acc_add' | 'system_acc_edit'

export const PERMISSION_MODULES: ModuleKey[] = [
  'channels', 'channels_create', 'channels_edit', 'channels_delete', 'channels_gen_code', 'channels_params',
  'landing', 'landing_create', 'landing_delete',
  'packages', 'packages_create', 'packages_edit', 'packages_status',
  'coupons', 'coupons_create', 'coupons_extend', 'coupons_revoke', 'coupons_edit',
  'users', 'users_edit', 'usersV2',
  'sales', 'sales_claim', 'sales_dial', 'sales_update', 'sales_reassign', 'sales_config',
  'orders',
  'system', 'system_role_add', 'system_role_edit', 'system_role_delete', 'system_acc_add', 'system_acc_edit',
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
  salesLead?: boolean // 销售组长：可查看并重新分配组内（业务线范围）全部销售的跟进线索
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
  couponType: '折扣券'
  currency: string
  creator: string
  total: number
  remaining: number
  // 发放及领取规则（领取有效期已下线，旧数据兼容保留）
  claimStart?: string
  claimEnd?: string
  // 使用规则
  useStart: string
  useEnd: string
  products: CouponProduct[]
  // 权益规则（折扣率：百分比，如 10 表示立减 10%）
  discountRate: number
  status: CouponStatus
  createdAt: string
}
