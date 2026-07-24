import { useMemo, useState } from 'react'
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useStore } from '../store'
import type { Order, OrderStatus, UserStatus, UserType } from '../types'
import { USER_TYPES } from '../types'
import { useI18n } from '../i18n'
import { resolveUserType } from '../userType'
import { useLineScope } from '../useLineScope'
import LineFilter from '../components/LineFilter'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const USER_STATUS_COLOR: Record<UserStatus, string> = {
  '未付费-未体验': 'default',
  '未付费-体验中': 'gold',
  '未付费-已体验': 'blue',
  付费: 'green',
  付费逾期: 'red',
}
const USER_TYPE_COLOR: Record<UserType, string> = {
  正式用户: 'green',
  测试用户: 'gold',
}
const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'green',
  已退款: 'red',
  已取消: 'default',
}

function fmtMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`
}

export default function OrderCenter() {
  const { t } = useI18n()
  const orders = useStore((s) => s.orders)
  const students = useStore((s) => s.students)
  const channels = useStore((s) => s.channels)
  const [keyword, setKeyword] = useState('')
  const [orderStatus, setOrderStatus] = useState<string | undefined>()
  const [payMethod, setPayMethod] = useState<string | undefined>()
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const { selected: lineSel, setSelected: setLineSel, matchLine } = useLineScope()

  const lineOptions = useMemo(
    () => Array.from(new Set([...channels.map((c) => c.name), ...students.map((s) => s.businessLine)].filter(Boolean))),
    [channels, students],
  )

  const lineOf = useMemo(() => {
    const map = new Map(students.map((s) => [s.studentId, s.businessLine]))
    return (studentId: string) => map.get(studentId) ?? '—'
  }, [students])

  const typeOf = useMemo(() => {
    const map = new Map(students.map((s) => [s.studentId, resolveUserType(s)]))
    return (studentId: string) => map.get(studentId)
  }, [students])

  const countryOf = useMemo(() => {
    const map = new Map(students.map((s) => [s.studentId, s.country || s.businessLine]))
    return (studentId: string) => map.get(studentId)
  }, [students])

  const countries = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.country || s.businessLine).filter(Boolean))) as string[]
  }, [students])

  const data = useMemo(
    () =>
      orders.filter((o) => {
        if (!matchLine(lineOf(o.studentId))) return false
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          o.orderId.toLowerCase().includes(kw) ||
          o.studentId.toLowerCase().includes(kw) ||
          o.productName.toLowerCase().includes(kw)
        return (
          matchKw &&
          (!orderStatus || o.orderStatus === orderStatus) &&
          (!payMethod || o.payMethod === payMethod) &&
          (!countryFilter || countryOf(o.studentId) === countryFilter) &&
          (!typeFilter || typeOf(o.studentId) === typeFilter)
        )
      }),
    [orders, keyword, orderStatus, payMethod, countryFilter, typeFilter, lineOf, countryOf, typeOf, lineSel, matchLine],
  )

  const columns: ColumnsType<Order> = [
    { title: t('order.col.id'), dataIndex: 'orderId', width: 180, fixed: 'left' },
    { title: t('order.col.product'), dataIndex: 'productName', width: 180 },
    { title: t('order.col.studentId'), dataIndex: 'studentId', width: 190 },
    {
      title: t('user.col.userType'),
      dataIndex: 'studentId',
      key: 'userType',
      width: 110,
      render: (id: string) => {
        const tp = typeOf(id)
        return tp ? <Tag color={USER_TYPE_COLOR[tp]}>{t(`enum.userType.${tp}`)}</Tag> : <Text type="secondary">—</Text>
      },
    },
    {
      title: t('user.col.country'),
      dataIndex: 'studentId',
      key: 'country',
      width: 100,
      render: (id: string) => <Tag>{countryOf(id) ?? '—'}</Tag>,
    },
    {
      title: t('order.col.userStatus'),
      dataIndex: 'userStatus',
      width: 100,
      render: (v: UserStatus) => <Tag color={USER_STATUS_COLOR[v]}>{t(`enum.status.${v}`)}</Tag>,
    },
    {
      title: t('order.col.orderStatus'),
      dataIndex: 'orderStatus',
      width: 100,
      render: (v: OrderStatus) => <Tag color={ORDER_STATUS_COLOR[v]}>{t(`enum.order.${v}`)}</Tag>,
    },
    {
      title: t('order.col.original'),
      dataIndex: 'originalPrice',
      width: 140,
      align: 'right',
      render: (v, r) => <Text type="secondary">{fmtMoney(v, r.currency)}</Text>,
    },
    {
      title: t('order.col.paid'),
      dataIndex: 'paidAmount',
      width: 150,
      align: 'right',
      render: (v, r) => <Text strong>{fmtMoney(v, r.currency)}</Text>,
    },
    {
      title: t('order.col.payMethod'),
      dataIndex: 'payMethod',
      width: 130,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: t('order.col.paidTime'),
      dataIndex: 'paidTime',
      width: 200,
      render: (v: string | undefined, r: Order) => <LocalTime time={v} country={countryOf(r.studentId)} />,
    },
    {
      title: t('order.col.validUntil'),
      dataIndex: 'validUntil',
      width: 200,
      render: (v: string | undefined, r: Order) => <LocalTime time={v} country={countryOf(r.studentId)} />,
    },
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('order.title')}</span>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('order.searchPlaceholder')}
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <LineFilter value={lineSel} onChange={setLineSel} options={lineOptions} />
        <Select
          allowClear
          placeholder={t('user.col.country')}
          style={{ width: 140 }}
          value={countryFilter}
          onChange={setCountryFilter}
          options={countries.map((l) => ({ label: l, value: l }))}
        />
        <Select
          allowClear
          placeholder={t('user.col.userType')}
          style={{ width: 140 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={USER_TYPES.map((tp) => ({ label: t(`enum.userType.${tp}`), value: tp }))}
        />
        <Select
          allowClear
          placeholder={t('order.filterStatus')}
          style={{ width: 150 }}
          value={orderStatus}
          onChange={setOrderStatus}
          options={(['待支付', '已支付', '已退款', '已取消'] as OrderStatus[]).map((l) => ({ label: t(`enum.order.${l}`), value: l }))}
        />
        <Select
          allowClear
          placeholder={t('order.filterPay')}
          style={{ width: 160 }}
          value={payMethod}
          onChange={setPayMethod}
          options={['App Store', 'Google Play', 'Stripe', 'PayPal'].map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="orderId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1880 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />
    </Card>
  )
}
