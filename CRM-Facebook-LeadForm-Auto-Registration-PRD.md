# Dino English CRM · Facebook Lead Form 自动导入与自动注册需求文档（PRD）

> **版本**：V0.1  
> **日期**：2026-08-10  
> **需求定位**：Facebook Lead Ads → Dino English 自动注册 → CRM 销售线索  
> **适用范围**：支持 Facebook Lead Form 的业务线；首期建议选择单一国家/业务线灰度上线。

---

## 1. 需求概述

### 1.1 背景

Dino English 当前已经具备通过投放链接提交手机号后，**无需验证码即可自动注册**的能力。Facebook Lead Ads 用户可以直接在 Facebook 内填写 Lead Form，无需跳转至 Dino English 落地页，但其留资数据尚未实时进入 Dino English 和 CRM，导致：

1. Facebook 留资用户不能自动成为 Dino English 注册用户；
2. 业务需要人工下载、整理和导入 Lead，时效性差；
3. Facebook Campaign、Ad Set、Ad、Form 与 Dino 用户及后续付费数据无法稳定关联；
4. 销售无法在 CRM 中及时领取和跟进 Facebook 新线索；
5. 重复提交、同步失败、手机号格式差异可能产生重复用户或遗漏线索。

因此，需要通过 Meta 官方 Lead Ads Webhook 与 Graph API，将 Facebook Lead Form 数据实时同步至 Dino English。系统在手机号不存在时复用现有无验证注册服务自动创建用户，在手机号已存在时关联已有用户；随后将 Lead 写入 CRM 销售中心，进入自动分配与跟进流程。

### 1.2 产品目标

| 目标 | 说明 |
| --- | --- |
| 实时导入 | Facebook Lead Form 提交后自动同步，无需人工导表 |
| 自动注册 | 手机号未注册时，复用现有注册服务创建 Dino 用户并返回 UID |
| 避免重复 | 同一 Meta Lead 不重复处理，同一手机号不重复注册 |
| 完整归因 | 保存 Meta 平台、Page、广告账户、Campaign、Ad Set、Ad、Creative、Form、Lead 的 ID/名称及时间信息，并映射 CRM 业务线、渠道 code 和注册来源，支持从 Lead 追溯到具体广告与素材 |
| 销售承接 | 自动进入对应业务线的 CRM 销售中心并按现有规则分配 |
| 全链路可见 | 支持查看 Lead → 注册 → 跟进 → 体验 → 付费结果 |
| 稳定可追溯 | 支持失败重试、人工重试、补偿同步、对账和告警 |

### 1.3 非目标

本期不包含：

- 在 CRM 内创建或编辑 Facebook 广告；
- 在 CRM 内创建或编辑 Facebook Lead Form；
- 广告预算、出价和素材管理；
- AI Lead 评分；
- 跨平台多触点归因；
- Meta Conversions API 转化回传（建议后续单独立项）；
- 修改现有“手机号无验证注册”的产品规则。

### 1.4 目标用户

| 角色 | 核心诉求 | 主要动作 |
| --- | --- | --- |
| 市场投放 | 看清 Facebook 广告从 Lead 到付费的效果 | 配置来源映射、查看归因和漏斗 |
| 运营 | 确认表单字段、业务线和销售池配置正确 | 配置 Form、检查导入记录、处理异常 |
| 销售 | 第一时间获得 Facebook 新线索 | 领取/接收分配、外呼、记录跟进 |
| 销售组长 | 管理线索分配和处理效率 | 配置分配权重、查看团队线索 |
| 管理员 | 管理 Meta 连接、权限和异常 | 授权 Page、查看 Token/Webhook 状态、重试 |
| 数据/技术 | 保证链路完整与数据一致 | 监控、对账、排查失败事件 |

---

## 2. 核心业务规则

### 2.1 User 与 Lead 分开建模

- **User**：Dino English 产品账号，以 Dino UID 为主键；一个手机号原则上只对应一个有效用户。
- **Lead**：一次营销留资/销售机会，以 CRM Lead ID 为主键；同一个 User 可以因不同 Campaign 或不同时间提交多个 Lead。
- **Facebook Lead ID**：Meta 单次表单提交的唯一外部标识，用于同步幂等。

不得因为用户已经自动注册，就丢弃本次 Lead 的广告来源及销售机会信息。

### 2.2 注册规则

| 场景 | 处理规则 |
| --- | --- |
| 手机号合法且不存在 | 调用现有注册服务，创建 Dino User，返回 UID |
| 手机号合法且已存在唯一用户 | 不重复注册；关联已有 UID |
| 同一 Facebook Lead 重复推送 | 不重复注册、不重复创建 Lead，返回幂等成功 |
| 一个手机号匹配多个用户 | 不自动注册；进入“身份冲突”异常队列 |
| 手机号为空或非法 | 不自动注册；Lead 进入异常队列，保留原始数据 |
| 注册服务暂时失败 | 自动重试；最终失败后支持人工重试 |
| 业务线无法识别 | 不调用注册；进入“待识别业务线”异常队列 |

### 2.3 来源口径

用户的首次注册来源与每次 Lead 来源分开保存：

```text
first_registration_source：首次创建用户时写入，后续不得覆盖
latest_lead_source：最近一次留资来源，可更新
lead_source_history：每次 Lead 的来源明细，永久关联到对应 Lead
```

自动注册的新用户：

```text
first_registration_source = facebook_lead_form
registration_trigger = automatic
```

已存在用户再次提交 Facebook Form 时，只新增/关联 Lead，不覆盖其首次注册来源。

### 2.4 CRM 销售线索口径

Facebook Lead 自动注册成功后，满足以下条件时进入现有销售中心：

```text
用户类型 = 正式用户
AND 有有效手机号
AND 用户状态 = 未付费-未体验
AND 非测试/内部/黑名单用户
```

进入销售中心后复用现有业务线权重自动分配、超时掉库、重新分配、外呼和跟进能力。

---

## 3. 端到端业务流程

```text
用户提交 Facebook Lead Form
    ↓
Meta 发送 leadgen Webhook
    ↓
CRM 接入服务校验请求、保存原始事件并快速返回成功
    ↓
异步任务使用 Facebook Lead ID 调用 Graph API 获取完整表单数据
    ↓
识别 Page / Form 对应的业务线、国家、语言和销售池
    ↓
根据配置完成字段映射与手机号标准化
    ↓
按 Facebook Lead ID 做同步幂等
    ↓
按业务线 + 标准化手机号查询 Dino 用户
    ├─ 不存在 → 调用现有注册服务 → 返回 UID
    ├─ 唯一存在 → 关联已有 UID
    └─ 多个匹配 → 进入身份冲突队列
    ↓
创建或更新 CRM Lead，并关联 UID 与广告来源
    ↓
满足销售线索条件 → 按现有规则自动分配
    ↓
记录标准 registration_completed 事件（仅新注册用户）
    ↓
销售跟进 / 用户体验 / 用户付费 → CRM 更新转化结果
```

### 3.1 处理顺序要求

1. Webhook 原始事件必须先持久化，再异步处理；
2. 必须先确定业务线和手机号国家码，再查询用户；
3. 必须先查询是否已有用户，再调用注册服务；
4. 必须获得有效 UID 后再创建“已注册”的 CRM Lead；
5. 任一环节失败不得丢弃原始 Facebook Lead；
6. Webhook 重试和系统重试不得创建重复用户或重复 Lead。

---

## 4. 功能需求

### 4.1 Meta 账号与 Page 接入

| 功能 | 需求说明 | 优先级 |
| --- | --- | --- |
| Meta App 接入 | 支持配置公司自有 Meta App | P0 |
| Page 授权 | 展示已授权 Page 及连接状态 | P0 |
| Webhook 验证 | 提供 Meta Webhook 验证接口 | P0 |
| Leadgen 订阅 | 为指定 Page 订阅 Lead Ads 事件 | P0 |
| Token 管理 | Token 加密存储、状态检查和失效提醒 | P0 |
| 测试连接 | 管理员可验证 Page、权限和取数能力 | P1 |
| 重新授权 | 授权失效后支持管理员重新连接 | P1 |

### 4.2 Lead Form 配置

每个 Form 需配置：

| 字段 | 说明 |
| --- | --- |
| Page | Form 所属 Facebook Page |
| Form ID / 名称 | Meta 表单标识与名称 |
| 启用状态 | 是否接收并处理该 Form 的 Lead |
| 业务线 | 越南、马来、印尼等 |
| 国家/区号 | 用于手机号标准化 |
| 默认语言 | 用于注册和后续触达 |
| 默认销售池 | Lead 注册后进入的销售队列 |
| 字段映射 | Facebook 问题与 CRM/Dino 字段对应关系 |
| 最近同步时间 | 最近成功接收 Lead 的时间 |

未配置或已停用的 Form：保存 Webhook 事件，但不执行自动注册，状态标记为“Form 未启用”。

### 4.3 字段映射

系统支持按 Form 维护字段映射，不得依赖 Facebook 返回字段的排列顺序。

| Facebook 字段示例 | Dino/CRM 字段 | 处理规则 |
| --- | --- | --- |
| `full_name` | 客户姓名 | 去除首尾空格 |
| `phone_number` | 手机号 | 结合 Form 国家标准化为 E.164 |
| `email` | 邮箱 | 转小写、去除首尾空格 |
| `child_name` | 学生姓名 | 原值保存 |
| `child_age` | 年龄段 | 映射为 CRM 年龄枚举 |
| `language` | 沟通语言 | 映射为标准语言代码 |
| `preferred_time` | 期望联系时间 | 按业务线当地时区解析 |
| 自定义问题 | 扩展字段 | 保存问题、答案及原始字段名 |

#### 4.3.1 归因数据保存原则

1. **ID 与名称同时保存**：ID 用于稳定关联，名称供业务阅读；广告名称修改后，不得破坏历史 Lead 的来源追溯。
2. **按本次 Lead 保存来源快照**：同一用户可能多次填写不同 Form，每条 Lead 都需保留当次来源，不得只在 User 上保留一个“Facebook”标签。
3. **原始值与标准值同时保存**：Meta 原始字段保留，另存 CRM 标准业务线、渠道和注册来源。
4. **缺失字段不阻断主链路**：手机号、Facebook Lead ID、Form/业务线满足注册要求时可继续处理；广告名称或素材信息允许异步补充。
5. **区分获取方式**：Webhook 主要用于通知 Lead 产生；完整字段由 Graph API 和关联广告对象二次查询获得。最终可用字段以 Meta 当前 API 权限和实际响应为准。

#### 4.3.2 必须保存的归因字段（P0）

| 层级 | 字段 | 字段名建议 | 用途 |
| --- | --- | --- | --- |
| 来源平台 | 来源平台 | `source_platform` | 固定为 `meta_lead_ads`，区别落地页、App 自然注册等来源 |
| 发布平台 | Facebook / Instagram 等实际展示平台 | `publisher_platform` | 区分 Lead 来自 Facebook 还是 Instagram；Meta 无法提供时允许为空 |
| Page | Page ID | `page_id` | 识别 Lead 所属主页和业务线 |
| Page | Page 名称 | `page_name` | CRM 展示与运营识别 |
| 广告账户 | Ad Account ID | `ad_account_id` | 区分广告账户，支持多业务线或代理商账户 |
| 广告账户 | Ad Account 名称 | `ad_account_name` | 业务展示；允许异步补充 |
| Campaign | Campaign ID | `campaign_id` | 广告系列稳定关联键 |
| Campaign | Campaign 名称 | `campaign_name` | 判断所属投放项目 |
| Ad Set | Ad Set ID | `adset_id` | 广告组稳定关联键 |
| Ad Set | Ad Set 名称 | `adset_name` | 判断受众、地区或投放策略分组 |
| Ad | Ad ID | `ad_id` | 具体广告稳定关联键 |
| Ad | Ad 名称 | `ad_name` | 判断具体广告版本 |
| Form | Form ID | `form_id` | 表单稳定关联键、字段映射依据 |
| Form | Form 名称 | `form_name` | CRM 展示与运营识别 |
| Lead | Facebook Lead ID | `external_lead_id` | 每次留资的唯一外部标识，作为幂等和去重主键 |
| Lead | Facebook 留资时间 | `lead_created_at` | 判断线索产生时间和销售响应时长 |
| Lead | 是否自然 Lead | `is_organic` | 区分广告产生与非广告自然产生；Meta 无法提供时允许为空 |
| CRM 映射 | CRM 业务线 | `business_line` | 决定注册国家、默认语言和销售池 |
| CRM 映射 | CRM 渠道类型 | `channel_type` | 固定或映射为 Facebook Lead Ads |
| CRM 映射 | CRM 渠道 code | `channel_code` | 与现有渠道体系、用户和订单归因对齐 |
| CRM 映射 | 首次注册来源 | `first_registration_source` | 新用户写入 `facebook_lead_form`，已有用户不得覆盖 |
| CRM 映射 | 本次 Lead 来源 | `lead_source` | 本次留资来源，已有用户也需要新增记录 |

> **P0 最小可用集合**：`source_platform`、`page_id`、`form_id`、`external_lead_id`、`lead_created_at`、手机号、`business_line`。Campaign、Ad Set、Ad 的 ID/名称应尽量补齐；个别字段暂时获取失败时可异步回填，但不得丢弃 Lead。

#### 4.3.3 建议保存的广告与素材字段（P1）

| 层级 | 字段 | 字段名建议 | 用途/备注 |
| --- | --- | --- | --- |
| Campaign | Campaign 目标 | `campaign_objective` | 识别获客、转化等投放目的；需二次查询 |
| Campaign | Campaign 状态 | `campaign_status` | 诊断来源；保存同步时快照 |
| Ad Set | 优化目标 | `optimization_goal` | 判断广告组优化口径；需二次查询 |
| Ad Set | 计费事件 | `billing_event` | 投放分析；需二次查询 |
| Ad Set | 开始/结束时间 | `adset_start_time` / `adset_end_time` | 判断 Lead 所处投放周期 |
| Ad | Ad 状态 | `ad_status` | 诊断来源；保存同步时快照 |
| Creative | Creative ID | `creative_id` | 将 Lead 关联到具体素材 |
| Creative | Creative 名称 | `creative_name` | 业务识别素材版本 |
| Creative | 标题 | `creative_title` | 帮助销售理解用户看到的主卖点 |
| Creative | 正文摘要 | `creative_body` | 帮助销售匹配跟进话术；注意长度限制 |
| Creative | 图片/视频标识 | `image_hash` / `video_id` | 素材效果分析；不要求复制媒体文件 |
| Creative | 落地/跳转链接 | `creative_link_url` | 保存广告设置的目标链接（如存在） |
| Form | Form 状态 | `form_status` | 判断当前是否仍在使用 |
| Form | Form 语言/Locale | `form_locale` | 决定默认沟通语言 |
| Form | 表单版本快照 | `form_version` | Form 配置变更后仍能解释历史 Lead；可由系统内部生成版本号 |

P1 字段不应阻塞自动注册。建议先完成 P0 主链路，再异步查询 Creative 和广告配置并回填。

#### 4.3.4 表单与用户意向数据

除广告层级外，每条 Lead 还必须保存用户在 Form 中实际提交的内容：

| 分类 | 字段 |
| --- | --- |
| 联系信息 | 姓名、原始手机号、标准化手机号、邮箱 |
| 学生信息 | 学生姓名、年龄/年龄段、年级、当前英语水平（如 Form 有） |
| 用户意向 | 期望课程、学习目标、期望联系时间、购买意向（如 Form 有） |
| 授权信息 | Form 隐私政策/免责声明版本或链接、营销授权答案（如可取得） |
| 自定义问题 | Meta 原始字段名、问题文本、答案；不可只保存映射后的结果 |

#### 4.3.5 CRM 内部处理与同步审计字段

以下字段不属于广告归因本身，但必须与来源数据一起保存，保证链路可追溯：

| 分类 | 字段名建议 | 说明 |
| --- | --- | --- |
| 接入 | `webhook_received_at` | CRM 收到 Meta Webhook 的时间 |
| 接入 | `lead_fetched_at` | Graph API 获取完整 Lead 的时间 |
| 接入 | `processed_at` | 自动注册和 CRM 入库完成时间 |
| 接入 | `graph_api_version` | 本次请求使用的 Graph API 版本 |
| 接入 | `raw_payload_ref` | Webhook 与 Lead 原始响应的安全存储引用 |
| 处理 | `import_method` | `webhook`、`manual_csv` 或 `reconciliation` |
| 处理 | `mapping_version` | 使用的 Form 字段映射版本 |
| 处理 | `deduplication_result` | 新 Lead、重复事件、关联已有 Lead 等结果 |
| 注册 | `dino_uid` | 自动注册或匹配得到的用户 ID |
| 注册 | `is_new_user` | 本次是否实际新建用户 |
| 注册 | `registration_completed_at` | 注册完成时间；已有用户为空或保留原注册时间 |
| 销售 | `sales_pool_id` | 进入的销售池 |
| 销售 | `sales_owner_id` | 分配后的销售负责人 |
| 销售 | `assigned_at` | 分配时间，用于计算响应时长 |

#### 4.3.6 归因数据展示规则

- 用户中心展示：首次注册来源、最近一次 Lead 来源、最近 Campaign/Form；
- Lead 详情展示：本次完整 Page → Campaign → Ad Set → Ad → Creative → Form 链路；
- 同一个 User 的全部 Lead 按时间展示，不覆盖历史记录；
- 销售中心列表默认展示来源平台、Campaign、Form、留资时间，其他字段放入详情抽屉；
- 报表支持按 Page、广告账户、Campaign、Ad Set、Ad、Creative、Form、业务线聚合 Lead、注册、体验和付费结果；
- 报表中的名称使用当前名称或历史快照时，必须明确口径；底层聚合始终以 ID 为准。

### 4.4 手机号标准化

手机号处理规则：

1. 去除空格、括号、横线等格式字符；
2. 保留或补充国际区号；
3. 无国际区号时使用 Form 配置的国家/区号；
4. 转为 E.164 格式后再执行用户查询；
5. 同时保存 `phone_raw` 与 `phone_normalized`；
6. 无法解析时不得猜测注册，应进入异常队列。

例如越南 Form：

```text
0912 345 678 → +84912345678
84 912 345 678 → +84912345678
+84-912-345-678 → +84912345678
```

### 4.5 自动注册与关联

#### 4.5.1 查询已有用户

查询条件：

```text
business_line + phone_normalized
```

若现有账号体系为全局手机号唯一，则以 `phone_normalized` 查询；最终规则以注册服务现有唯一约束为准。

#### 4.5.2 调用现有注册服务

Meta 接入服务不得直接写用户数据库，必须调用现有注册领域服务。

注册请求建议包含：

```json
{
  "phone": "+84912345678",
  "registration_source": "facebook_lead_form",
  "registration_trigger": "automatic",
  "business_line": "越南",
  "country": "VN",
  "language": "vi",
  "facebook_lead_id": "123456789",
  "facebook_form_id": "form_001",
  "campaign_id": "campaign_001",
  "adset_id": "adset_001",
  "ad_id": "ad_001"
}
```

注册成功必须返回：

```text
uid
registration_status
created_at
is_new_user
```

#### 4.5.3 注册幂等

调用注册服务时携带：

```http
Idempotency-Key: facebook-lead:{facebook_lead_id}
```

注册服务还需依赖手机号唯一约束作为第二道防线。

### 4.6 CRM Lead 创建与更新

每次有效的 Facebook Form 提交都形成一条 Lead。CRM Lead 至少包含：

| 分类 | 字段 |
| --- | --- |
| 标识 | CRM Lead ID、Facebook Lead ID、Dino UID |
| 联系信息 | 客户姓名、学生姓名、原始手机号、标准化手机号、邮箱 |
| 用户状态 | 是否新注册、注册状态、体验状态、付费状态 |
| 归因 | Page、Form、Campaign、Ad Set、Ad ID 与名称 |
| 业务 | 业务线、国家、语言、年龄段、Form 自定义答案 |
| 销售 | 销售池、负责人、跟进进度、最新备注 |
| 时间 | Facebook 留资、CRM 接收、注册、分配、最近更新时间 |
| 技术 | 导入状态、重试次数、最后错误、原始数据快照引用 |

#### 重复留资处理

同一手机号通过不同 Campaign/Form 再次提交时：

- 不重复注册用户；
- 默认保留一条新的 Lead 机会；
- 关联同一 UID；
- 保留本次完整广告来源；
- 如已有负责人，默认继续归属原负责人；
- 在负责人侧产生“用户再次留资”提醒；
- 是否重新进入待跟进状态由业务规则配置。

### 4.7 销售分配

Facebook Lead 成功关联 UID 后：

1. 根据 Form 配置确定业务线和销售池；
2. 判断是否满足现有销售线索条件；
3. 复用业务线销售权重自动分配；
4. 分配成功后进度为“跟进中”；
5. 无有效分配配置时进入“待领取”；
6. 分配行为写入系统跟进记录；
7. 后续复用现有掉库、重分配、外呼与跟进规则。

### 4.8 事件记录

仅在系统实际新建 Dino 用户时产生：

```json
{
  "event_name": "registration_completed",
  "uid": "DINO-XXXXXX",
  "occurred_at": "2026-08-10T10:20:00+08:00",
  "source": "facebook_lead_form",
  "facebook_lead_id": "123456789",
  "campaign_id": "campaign_001",
  "form_id": "form_001"
}
```

关联已有用户时，不得再次产生 `registration_completed`，可以产生独立事件：

```text
facebook_lead_submitted
```

### 4.9 导入记录与异常处理

CRM 提供“Facebook Lead 导入记录”页面，支持：

- 按 Page、Form、业务线、Campaign、时间和状态筛选；
- 查看 Facebook Lead ID、手机号脱敏值、UID、CRM Lead ID；
- 查看处理阶段与失败原因；
- 查看重试次数与最近重试时间；
- 有权限的管理员执行人工重试；
- 查看原始事件和字段映射结果（敏感字段受权限控制）；
- 导出异常记录。

导入状态建议：

```text
已接收
获取详情中
待处理
注册中
已成功
已关联已有用户
重复事件
待识别业务线
手机号异常
身份冲突
注册失败
Meta 权限异常
最终失败
```

### 4.10 补偿同步与对账

为避免只依赖 Webhook 导致数据遗漏，系统需要：

- 每 15–30 分钟拉取近期 Lead，与导入记录进行增量补偿；
- 每日执行 Meta Lead 与 CRM 导入数量对账；
- 按 Facebook Lead ID 补回缺失数据；
- 对账结果展示成功、重复、失败、缺失及待处理数量；
- 差异超过阈值时通知技术/运营负责人。

建议重试节奏：立即、1 分钟、5 分钟、30 分钟、2 小时；达到上限后进入最终失败队列。

---

## 5. 页面需求

### 5.1 系统配置 · Facebook Lead 接入

页面包含：

- Meta App 信息；
- Page 列表及授权状态；
- Webhook 订阅状态；
- Token 状态及异常提醒；
- 最近成功同步时间；
- 测试连接；
- 重新授权；
- 启用/停用 Page。

### 5.2 Lead Form 管理

列表字段：Page、Form ID、Form 名称、业务线、国家、语言、默认销售池、启用状态、字段映射状态、最近收到 Lead 时间。

操作：编辑映射、测试取数、启用、停用、查看最近 Lead。

### 5.3 导入记录

列表字段：Facebook Lead ID、Form、Campaign、手机号、Dino UID、CRM Lead ID、留资时间、完成时间、处理状态、失败原因、重试次数。

操作：查看详情、人工重试、标记已处理。

### 5.4 销售中心调整

销售线索列表新增或支持查看：

- 来源平台：Facebook Lead Form；
- Campaign / Ad Set / Ad；
- Form 名称；
- Facebook 留资时间；
- 是否新注册；
- 自定义问题答案；
- 再次留资标识。

列表不要求全部默认展开，可在详情抽屉中展示完整来源。

---

## 6. 权限与审计

| 权限点 | 说明 |
| --- | --- |
| `meta_connection_view` | 查看 Meta 接入状态 |
| `meta_connection_manage` | 授权、重授权、启停 Page |
| `meta_form_view` | 查看 Form 配置 |
| `meta_form_manage` | 编辑业务线、字段映射和销售池 |
| `meta_import_view` | 查看导入记录 |
| `meta_import_retry` | 对失败任务执行人工重试 |
| `meta_raw_data_view` | 查看脱敏后的原始数据 |
| `meta_sensitive_data_view` | 查看完整手机号、邮箱等敏感信息 |

以下操作必须写入审计日志：

- Page 授权、重新授权、停用；
- Form 字段映射修改；
- 销售池修改；
- 人工重试；
- 异常记录人工处理；
- 原始敏感数据查看；
- 导入记录导出。

---

## 7. 接口需求

### 7.1 Meta Webhook

```http
GET  /api/integrations/meta/webhook
POST /api/integrations/meta/webhook
```

- GET 用于 Webhook 验证；
- POST 用于接收 Lead Ads `leadgen` 事件；
- POST 接口应在持久化原始事件后尽快返回成功；
- 完整 Lead 获取、注册和 CRM 写入必须异步执行。

### 7.2 CRM 管理接口

```http
GET  /api/crm/meta/pages
POST /api/crm/meta/pages/{pageId}/test
POST /api/crm/meta/pages/{pageId}/enable
POST /api/crm/meta/pages/{pageId}/disable

GET  /api/crm/meta/forms
GET  /api/crm/meta/forms/{formId}
PUT  /api/crm/meta/forms/{formId}/mapping

GET  /api/crm/meta/import-events
GET  /api/crm/meta/import-events/{eventId}
POST /api/crm/meta/import-events/{eventId}/retry
POST /api/crm/meta/reconcile
```

### 7.3 内部注册调用

```http
POST /internal/registration/facebook-lead
Idempotency-Key: facebook-lead:{facebook_lead_id}
```

具体接口可以复用现有注册 API；但必须支持来源参数、幂等键并返回 `is_new_user`。

---

## 8. 数据模型建议

### 8.1 `crm_lead`

```text
id
external_platform
external_lead_id
user_id
business_line
customer_name
student_name
phone_raw
phone_normalized
email
language
country
lead_status
sales_progress
sales_owner_id
created_at_source
imported_at
updated_at
```

唯一约束：

```text
UNIQUE(external_platform, external_lead_id)
```

### 8.2 `lead_source`

```text
lead_id
source_platform
publisher_platform
page_id
page_name
ad_account_id
ad_account_name
form_id
form_name
campaign_id
campaign_name
campaign_objective
adset_id
adset_name
optimization_goal
ad_id
ad_name
creative_id
creative_name
creative_title
creative_body
image_hash
video_id
creative_link_url
lead_created_at
is_organic
business_line
channel_type
channel_code
first_registration_source
lead_source
mapping_version
source_snapshot_json
```

> `source_snapshot_json` 用于保留同步当时的完整来源快照；页面查询和报表使用结构化字段，不直接依赖 JSON。广告对象名称修改时，历史 Lead 的快照不得被覆盖。

### 8.3 `lead_import_event`

```text
id
external_lead_id
event_key
raw_payload
status
processing_stage
retry_count
last_error_code
last_error_message
received_at
processed_at
```

`event_key` 必须唯一，用于 Webhook 事件幂等。

---

## 9. 非功能需求

### 9.1 时效与可用性

- 95% 的 Lead 在 Facebook 提交后 30 秒内完成 CRM 入库；
- 短暂故障恢复后能够自动补偿；
- Webhook 服务可独立扩容，但首期不为假设规模引入复杂微服务；
- Meta API 超时不得阻塞 Webhook 响应。

### 9.2 数据一致性

- 同一 Facebook Lead 只能对应一条 CRM Lead；
- 同一手机号不得因 Webhook 重试产生多个 Dino User；
- 每日同步完整率目标不低于 99.5%；
- CRM Lead、User 和来源记录之间必须能够互相追溯；
- 所有时间保存 UTC，前端按业务线当地时区展示。

### 9.3 安全与隐私

- Access Token 使用 Secret Manager 或等效安全存储，不得明文写入日志；
- 手机号、邮箱和原始 Payload 受权限和数据范围控制；
- 日志默认脱敏；
- Webhook 必须校验来源和请求完整性；
- 保留用户授权、隐私政策和数据删除处理依据；
- 测试环境和生产环境使用不同 Meta App 或隔离配置。

### 9.4 可观测性

监控指标至少包括：

- Webhook 接收量与响应成功率；
- Graph API 成功率、延迟和限流；
- 自动注册成功率；
- 已有用户关联率；
- 手机号异常率；
- 重复事件数；
- 最终失败数；
- Meta 与 CRM 对账差异；
- Token/Webhook 授权状态。

---

## 10. 异常场景

| 异常 | 系统行为 |
| --- | --- |
| Meta 重复推送 | 按事件键和 Facebook Lead ID 幂等处理 |
| Graph API 暂时失败 | 指数退避重试，不重复注册 |
| Meta Token 失效 | 停止无意义重试，告警管理员重新授权 |
| Form 未配置 | 保留事件，标记“待配置”，配置完成后可重放 |
| 手机号非法 | 保留 Lead，进入手机号异常队列 |
| 手机号已注册 | 关联现有 UID，创建本次 Lead 来源记录 |
| 手机号匹配多个用户 | 不自动选择，进入身份冲突队列 |
| 注册成功但 CRM 写入失败 | 使用返回 UID 重试 CRM 写入，不再次注册 |
| CRM 成功但响应超时 | 通过 Facebook Lead ID 查询已处理结果并返回幂等成功 |
| 销售分配失败 | Lead 保留在待领取池并告警，不影响注册结果 |
| Campaign/Ad 名称获取失败 | 保存 ID，名称允许后续补充，不阻断注册 |

---

## 11. 测试用例

### 11.1 正常流程

1. 新手机号提交越南 Form，自动注册成功、生成 UID、进入越南销售池；
2. 已注册手机号提交 Form，不创建新 User，Lead 正确关联现有 UID；
3. 同一用户从不同 Campaign 再次提交，保留两条 Lead 来源并归属原销售；
4. Facebook 自定义问题正确映射到 CRM 扩展字段；
5. 注册成功后产生一次 `registration_completed` 事件。
6. Lead 详情可以展示 Page → 广告账户 → Campaign → Ad Set → Ad → Creative → Form 的来源链路；
7. 同一用户多次留资时，每条 Lead 保留各自独立的来源快照，不互相覆盖；
8. Creative 等 P1 信息二次查询失败时不阻断自动注册，恢复后可以异步回填。

### 11.2 幂等与并发

1. 同一 Webhook 连续推送两次，只产生一条 CRM Lead；
2. 同一 Facebook Lead 并发处理，只创建一个 User；
3. 两个不同 Lead 同时提交相同手机号，只创建一个 User，两条 Lead 均关联该 UID；
4. 注册接口超时但实际成功，重试后不得重复注册。

### 11.3 手机号

1. `0912 345 678`、`84912345678`、`+84-912-345-678` 被标准化为同一号码；
2. 无区号号码根据 Form 国家补充正确区号；
3. 明显非法号码不调用注册服务；
4. 无手机号 Form 保留 Lead 但不自动注册。

### 11.4 权限与异常

1. 无敏感数据权限的用户只能看到脱敏手机号；
2. 无重试权限的用户看不到人工重试按钮；
3. Token 失效时产生告警并展示连接异常；
4. Form 停用后新 Lead 不执行自动注册；
5. 注册成功、销售分配失败时 Lead 进入待领取而非丢失。

### 11.5 补偿与对账

1. Webhook 丢失的 Lead 能被定时任务补回；
2. 补偿同步不会重复创建用户和 Lead；
3. 每日对账能展示 Meta 数量、CRM 数量和差异原因。

---

## 12. 验收标准

| 编号 | 验收标准 |
| --- | --- |
| AC-01 | 启用中的 Facebook Form 新 Lead 可以自动进入 CRM |
| AC-02 | 95% Lead 在提交后 30 秒内完成 CRM 入库 |
| AC-03 | 新手机号能够通过现有注册服务自动创建 Dino 用户并返回 UID |
| AC-04 | 已有手机号不重复注册，能够关联已有 UID |
| AC-05 | 同一 Facebook Lead 重复推送不产生重复 User 或 CRM Lead |
| AC-06 | 每条 Lead 至少保存来源平台、Page ID、Form ID、Facebook Lead ID、留资时间及 CRM 业务线；可获取时完整保存广告账户、Campaign、Ad Set、Ad 的 ID 与名称 |
| AC-07 | 手机号能按 Form 国家正确标准化，非法号码进入异常队列 |
| AC-08 | 成功 Lead 按业务线进入正确销售池并复用现有自动分配规则 |
| AC-09 | 注册失败、Meta 取数失败等任务支持自动重试和人工重试 |
| AC-10 | Webhook 丢失时补偿任务能够补回 Lead |
| AC-11 | 每日 Meta 与 CRM 数据差异可查看、可解释、可告警 |
| AC-12 | 手机号、邮箱、Token 和原始 Payload 满足权限、脱敏和审计要求 |
| AC-13 | 新注册用户只产生一次 `registration_completed` 事件 |
| AC-14 | 已有用户再次留资不覆盖首次注册来源 |
| AC-15 | 同一用户的多条 Lead 分别保留独立来源快照，底层以各层级 ID 聚合，不因广告名称修改而丢失归因 |
| AC-16 | Creative、广告配置等 P1 归因字段获取失败不阻断注册，并支持后续异步回填 |

---

## 13. 实施建议

### 阶段一：单业务线灰度

- 一个 Meta App；
- 一个国家/业务线；
- 一个 Facebook Page；
- 2–3 个真实 Lead Form；
- 实时 Webhook、自动注册、CRM 入库、销售分配；
- 导入记录、自动重试和每日对账。

### 阶段二：多业务线推广

- 多 Page/Form 配置；
- 业务线与销售池自助映射；
- 更完整的异常工作台；
- Lead → 注册 → 体验 → 付费漏斗；
- 转化结果回传 Meta 的专项评估。

### 推荐排期参考

| 周期 | 工作内容 |
| --- | --- |
| 第 1 周 | Meta App/权限、Webhook、数据模型、Form 配置设计 |
| 第 2 周 | Graph API、字段映射、手机号标准化、自动注册与幂等 |
| 第 3 周 | CRM Lead、销售分配、导入记录、失败重试与监控 |
| 第 4 周 | 联调、真实 Form 灰度、补偿同步、对账与验收 |

---

## 14. 依赖与待确认事项

1. 现有无验证注册接口地址、请求字段、唯一约束和返回协议；
2. 手机号在全局唯一还是业务线内唯一；
3. 同一用户再次留资时是否始终保持原销售负责人；
4. Facebook Lead Form 中是否全部包含手机号；
5. 首期试点的国家、Page、Form 和默认销售池；
6. Form 隐私说明是否覆盖自动创建 Dino English 账号及后续联系；
7. Meta App、Business Portfolio、Page、广告账号的资产管理员；
8. Meta App Review、业务验证和生产 Token 的负责人；
9. 补偿拉取频率和每日对账告警阈值；
10. Lead 原始数据及失败记录的数据保留周期；
11. 后续是否需要通过 Meta Conversions API 回传注册、体验和付费结果。

---

## 15. 关联文档

- `CRM-Phase2-PRD.md`：销售中心、自动分配、掉库、外呼和权限；
- `CRM-Bridge-PRD.md`：越南站销售外呼与数据打通过渡方案；
- `README.md`：CRM 完整迭代规划；
- Meta Lead Ads 官方文档：https://developers.facebook.com/docs/marketing-api/guides/lead-ads/
