# DinoAI 运营管理平台（CRM 原型）

基于 6-12 会议纪要与参考截图实现的可交互前端原型，技术栈：**Vite + React + TypeScript + Ant Design 5**。所有数据保存在浏览器 `localStorage` 中（纯前端 Mock，无后端）。

## 启动

```bash
npm install
npm run dev      # 默认 http://localhost:5180/
```

构建生产包：

```bash
npm run build
npm run preview
```

## 登录

- 邮箱验证码登录/注册，**仅支持 `@dinoai.ai` 邮箱**。
- 点击「获取验证码」后，演示验证码会直接显示在提示中，输入即可登录。
- 右上角头像菜单可「登出」与「重置演示数据」。

## 功能模块

| 模块 | 说明 |
| --- | --- |
| 渠道管理 | 渠道类型（自然流量 / landingpage / KOL…）→ 一级 / 二级 / 三级渠道树；在任意级渠道生成实际应用的渠道 code（可复制） |
| 用户中心 | 学生列表（ID、姓名、手机号、业务线、注册渠道、国家码、渠道 code、注册时间、状态）；修改学生信息（英文名 / 本地名 / 性别 / 出生日期 / 业务线） |
| 订单中心 | 订单列表（订单ID、商品、学生ID、用户状态、订单状态、原价、实付、支付方式、成功支付时间），支持筛选 |
| 课包管理 | 新增 / 编辑 / 详情 / 上下架；字段含业务线、课包名称、币种、价格、有效期 |
| 优惠券管理 | 生成券（先弹窗选业务线 → 满减券表单：基本信息 / 发放领取规则 / 使用规则·可用商品按课包ID回车搜索 / 满减权益）；券列表支持编辑可用商品、延长领取时间、停止发放（二次确认 → 已结束） |

## 业务线与币种映射

| 业务线 | 本地币种 | 国家码 |
| --- | --- | --- |
| 韩国 | KRW | +82 |
| 沙特 | SAR | +966 |
| 马来 | MYR | +60 |
| 越南 | VND | +84 |
| 其他 | USD | +1 |

> 优惠券 / 课包币种均支持「本地币种 + 美元(USD)」。

## 目录结构

```
src/
  auth.ts                 登录会话（localStorage）
  store.ts                Mock 数据仓库 + 种子数据
  types.ts                类型与业务线/币种常量
  components/AppLayout.tsx 侧边导航 + 顶栏 + 路由出口
  pages/
    Login.tsx             邮箱验证码登录注册
    ChannelManagement.tsx 渠道管理
    UserCenter.tsx        用户中心
    OrderCenter.tsx       订单中心
    CoursePackage.tsx     课包管理
    Coupon.tsx            优惠券管理
```
