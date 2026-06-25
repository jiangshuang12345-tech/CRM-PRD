import { useMemo, useState } from 'react'
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useStore } from '../store'
import type { Order, OrderStatus, UserStatus } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { setBizFilter, useBizFilter } from '../bizFilter'

const { Text } = Typography

const USER_STATUS_COLOR: Record<UserStatus, string> = {
  注册: 'default',
  体验: 'blue',
  付费: 'green',
  流失: 'red',
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
  const lineFilter = useBizFilter()
  const { allowedLines } = usePerm()
  const scope = allowedLines()

  const lineOf = useMemo(() => {
    const map = new Map(students.map((s) => [s.studentId, s.businessLine]))
    return (studentId: string) => map.get(studentId) ?? '—'
  }, [students])

  const lines = useMemo(() => {
    const all = channels.map((c) => c.name)
    return scope ? all.filter((l) => scope.includes(l)) : all
  }, [channels, scope])

  const data = useMemo(
    () =>
      orders.filter((o) => {
        if (scope && !scope.includes(lineOf(o.studentId))) return false
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
          (!lineFilter || lineOf(o.studentId) === lineFilter)
        )
      }),
    [orders, keyword, orderStatus, payMethod, lineFilter, lineOf, scope],
  )

  const columns: ColumnsType<Order> = [
    { title: t('order.col.id'), dataIndex: 'orderId', width: 180, fixed: 'left' },
    { title: t('order.col.product'), dataIndex: 'productName', width: 180 },
    { title: t('order.col.studentId'), dataIndex: 'studentId', width: 190 },
    {
      title: t('user.col.line'),
      dataIndex: 'studentId',
      key: 'businessLine',
      width: 100,
      render: (id: string) => <Tag>{lineOf(id)}</Tag>,
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
    { title: t('order.col.paidTime'), dataIndex: 'paidTime', width: 180, render: (v) => v || <Text type="secondary">—</Text> },
    { title: t('order.col.validUntil'), dataIndex: 'validUntil', width: 180, render: (v) => v || <Text type="secondary">—</Text> },
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
        <Select
          allowClear
          placeholder={t('user.col.line')}
          style={{ width: 140 }}
          value={lineFilter}
          onChange={setBizFilter}
          options={lines.map((l) => ({ label: l, value: l }))}
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
        scroll={{ x: 1770 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />
    </Card>
  )
}
