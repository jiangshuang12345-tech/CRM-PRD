import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { addLog, genCouponCode, getState, setState, uid, useStore } from '../store'
import { BUSINESS_LINES, LINE_CURRENCY } from '../types'
import type { BusinessLine, Coupon, CouponCode, CouponProduct, CouponStatus } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

function copyText(text: string, ok: string) {
  navigator.clipboard?.writeText(text)
  message.success(ok)
}

function currencyOptions(line: BusinessLine) {
  const opts = [{ label: '美元 (USD)', value: 'USD' }]
  if (line !== '其他') opts.unshift({ label: LINE_CURRENCY[line].label, value: LINE_CURRENCY[line].code })
  return opts
}

// 可用商品搜索框（输入商品包ID，回车搜索，可多次添加）
function ProductPicker({
  value = [],
  onChange,
}: {
  value?: CouponProduct[]
  onChange?: (v: CouponProduct[]) => void
}) {
  const { t } = useI18n()
  const [text, setText] = useState('')

  const add = () => {
    const id = text.trim()
    if (!id) return
    if (value.some((p) => p.id.toLowerCase() === id.toLowerCase())) {
      message.warning(t('cp.prodExists'))
      setText('')
      return
    }
    const pkg = getState().packages.find((p) => p.id.toLowerCase() === id.toLowerCase())
    if (!pkg) {
      message.error(t('cp.prodNotFound', { id }))
      return
    }
    onChange?.([...value, { id: pkg.id, name: pkg.name, price: pkg.price }])
    setText('')
  }

  const remove = (id: string) => onChange?.(value.filter((p) => p.id !== id))

  const columns: ColumnsType<CouponProduct> = [
    { title: t('cp.prod.id'), dataIndex: 'id', width: 120 },
    { title: t('cp.prod.name'), dataIndex: 'name' },
    { title: t('cp.prod.price'), dataIndex: 'price', width: 140, render: (v) => v.toLocaleString() },
    {
      title: t('common.action'),
      key: 'op',
      width: 90,
      render: (_, r) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(r.id)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Input
        placeholder={t('cp.productsPlaceholder')}
        prefix={<SearchOutlined />}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPressEnter={add}
        suffix={
          <Button type="link" size="small" onClick={add} style={{ padding: 0 }}>
            {t('cp.addProduct')}
          </Button>
        }
      />
      <Table
        style={{ marginTop: 12 }}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={value}
        pagination={false}
        locale={{ emptyText: t('common.noData') }}
      />
    </div>
  )
}

// 优惠码列表（按 KOL 生成多个优惠码，分别统计使用量用于结算）
function CodePicker({
  value = [],
  onChange,
  showUsed = false,
}: {
  value?: CouponCode[]
  onChange?: (v: CouponCode[]) => void
  showUsed?: boolean
}) {
  const { t } = useI18n()
  const [kol, setKol] = useState('')

  const add = () => {
    const name = kol.trim()
    if (!name) return
    if (value.some((c) => c.kol.toLowerCase() === name.toLowerCase())) {
      message.warning(t('cp.kolExists'))
      return
    }
    onChange?.([...value, { id: uid('cc_'), code: genCouponCode(), kol: name, used: 0 }])
    setKol('')
  }

  const remove = (id: string) => onChange?.(value.filter((c) => c.id !== id))

  const copyAll = () => {
    if (value.length === 0) return
    copyText(value.map((c) => c.code).join('\n'), t('common.copied'))
  }
  const copyAllWithKol = () => {
    if (value.length === 0) return
    copyText(value.map((c) => `${c.kol}\t${c.code}`).join('\n'), t('common.copied'))
  }

  const columns: ColumnsType<CouponCode> = [
    { title: t('cp.code.kol'), dataIndex: 'kol' },
    {
      title: t('cp.code.code'),
      dataIndex: 'code',
      width: 200,
      render: (v: string) => (
        <Space size={4}>
          <Text code>{v}</Text>
          <Tooltip title={t('common.copy')}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyText(v, t('common.copied'))} />
          </Tooltip>
        </Space>
      ),
    },
    ...(showUsed
      ? [{ title: t('cp.code.used'), dataIndex: 'used', width: 110, align: 'right' as const, render: (v: number) => v.toLocaleString() }]
      : []),
    {
      title: t('common.action'),
      key: 'op',
      width: 90,
      render: (_: unknown, r: CouponCode) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(r.id)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Input
        placeholder={t('cp.kolPlaceholder')}
        prefix={<PlusOutlined />}
        value={kol}
        onChange={(e) => setKol(e.target.value)}
        onPressEnter={add}
        suffix={
          <Button type="link" size="small" onClick={add} style={{ padding: 0 }}>
            {t('cp.addCode')}
          </Button>
        }
      />
      <Space style={{ marginTop: 12 }}>
        <Button size="small" icon={<CopyOutlined />} disabled={value.length === 0} onClick={copyAll}>
          {t('cp.copyAllCodes')}
        </Button>
        <Button size="small" icon={<CopyOutlined />} disabled={value.length === 0} onClick={copyAllWithKol}>
          {t('cp.copyAllWithKol')}
        </Button>
      </Space>
      <Table
        style={{ marginTop: 12 }}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={value}
        pagination={false}
        locale={{ emptyText: t('cp.noCodes') }}
      />
    </div>
  )
}

// 生成券表单
function CreateCoupon({ line, onBack }: { line: BusinessLine; onBack: () => void }) {
  const { t } = useI18n()
  const { actor } = usePerm()
  const [form] = Form.useForm()

  const submit = async () => {
    const v = await form.validateFields()
    const [claimStart, claimEnd] = v.claimRange as [Dayjs, Dayjs]
    const [useStart, useEnd] = v.useRange as [Dayjs, Dayjs]
    const codes: CouponCode[] = (v.codes as CouponCode[]).map((c) => ({
      ...c,
      used: 0,
    }))
    const coupon: Coupon = {
      id: `CP${Math.floor(1000 + Math.random() * 9000)}`,
      name: v.name,
      codes,
      businessLine: line,
      couponType: '满减券',
      currency: v.currency,
      creator: actor,
      total: v.total,
      remaining: v.total,
      claimStart: claimStart.format('YYYY-MM-DD HH:mm:ss'),
      claimEnd: claimEnd.format('YYYY-MM-DD HH:mm:ss'),
      useStart: useStart.format('YYYY-MM-DD HH:mm:ss'),
      useEnd: useEnd.format('YYYY-MM-DD HH:mm:ss'),
      products: v.products ?? [],
      thresholdAmount: v.thresholdAmount,
      deductAmount: v.deductAmount,
      status: claimEnd.isBefore(dayjs()) ? '已结束' : '已生效',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    setState((prev) => ({ ...prev, coupons: [coupon, ...prev.coupons] }))
    addLog({ actor, module: 'coupons', action: t('cp.log.create'), target: `${coupon.id} · ${coupon.name}` })
    message.success(t('cp.genOk'))
    onBack()
  }

  return (
    <Card
      className="page-card"
      bordered={false}
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack} size="small" />
          <span className="section-title" style={{ borderLeft: 'none', paddingLeft: 0 }}>
            {t('cp.create.title', { line })}
          </span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ flex: '0 0 130px' }}
        wrapperCol={{ flex: '1 1 auto' }}
        labelAlign="right"
        style={{ maxWidth: 760 }}
        initialValues={{
          businessLine: line,
          couponType: '满减券',
          creator: actor,
        }}
      >
        <Title level={5}>{t('cp.basic')}</Title>
        <Form.Item name="businessLine" label={t('cp.businessType')}>
          <Select disabled options={[{ label: line, value: line }]} />
        </Form.Item>
        <Form.Item name="couponType" label={t('cp.couponType')} tooltip={t('cp.couponTypeTip')}>
          <Select disabled options={[{ label: t('enum.couponType.满减券'), value: '满减券' }]} />
        </Form.Item>
        <Form.Item name="currency" label={t('cp.currency')} rules={[{ required: true, message: t('cp.currencyRequired') }]}>
          <Select placeholder={t('cp.currencyPlaceholder')} options={currencyOptions(line)} style={{ maxWidth: 280 }} />
        </Form.Item>
        <Form.Item name="name" label={t('cp.name')} rules={[{ required: true, message: t('cp.nameRequired') }]}>
          <Input placeholder={t('cp.namePlaceholder')} maxLength={30} showCount />
        </Form.Item>
        <Form.Item name="creator" label={t('cp.creator')}>
          <Input disabled />
        </Form.Item>

        <Divider />
        <Title level={5}>{t('cp.issueRule')}</Title>
        <Form.Item name="total" label={t('cp.totalQty')} rules={[{ required: true, message: t('cp.totalRequired') }]}>
          <InputNumber style={{ width: 280 }} min={1} placeholder={t('cp.totalPlaceholder')} />
        </Form.Item>
        <Form.Item
          name="codes"
          label={t('cp.codes')}
          tooltip={t('cp.codesTip')}
          rules={[
            {
              validator: (_, val: CouponCode[] | undefined) =>
                val && val.length > 0 ? Promise.resolve() : Promise.reject(new Error(t('cp.codesRequired'))),
            },
          ]}
        >
          <CodePicker />
        </Form.Item>
        <Form.Item name="claimRange" label={t('cp.claimValid')} rules={[{ required: true, message: t('cp.claimRequired') }]}>
          <RangePicker showTime style={{ width: 400 }} placeholder={[t('pkg.startTime'), t('pkg.endTime')]} />
        </Form.Item>

        <Divider />
        <Title level={5}>{t('cp.useRule')}</Title>
        <Form.Item name="useRange" label={t('cp.useValid')} rules={[{ required: true, message: t('cp.useRequired') }]}>
          <RangePicker showTime style={{ width: 400 }} placeholder={[t('pkg.startTime'), t('pkg.endTime')]} />
        </Form.Item>
        <Form.Item name="products" label={t('cp.products')} rules={[{ required: true, message: t('cp.productsRequired') }]}>
          <ProductPicker />
        </Form.Item>

        <Divider />
        <Title level={5}>{t('cp.benefitRule')}</Title>
        <Form.Item label={t('cp.fullMinus')} required style={{ marginBottom: 0 }}>
          <Space align="baseline" wrap>
            <span>{t('cp.full')}</span>
            <Form.Item name="thresholdAmount" rules={[{ required: true, message: t('cp.thresholdRequired') }]}>
              <InputNumber min={0} placeholder={t('cp.threshold')} style={{ width: 160 }} />
            </Form.Item>
            <span>{t('cp.minus')}</span>
            <Form.Item
              name="deductAmount"
              dependencies={['thresholdAmount']}
              rules={[
                { required: true, message: t('cp.deductRequired') },
                ({ getFieldValue }) => ({
                  validator: (_, val) =>
                    val == null || val <= (getFieldValue('thresholdAmount') ?? Infinity)
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('cp.deductInvalid'))),
                }),
              ]}
            >
              <InputNumber min={0} placeholder={t('cp.deduct')} style={{ width: 160 }} />
            </Form.Item>
          </Space>
        </Form.Item>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button onClick={onBack}>{t('common.back')}</Button>
            <Button type="primary" onClick={submit}>
              {t('cp.submitGen')}
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  )
}

export default function CouponPage() {
  const { t } = useI18n()
  const coupons = useStore((s) => s.coupons)
  const { can, allowedLines, actor } = usePerm()
  const canEdit = can('coupons') === 'operate'
  const scope = allowedLines()
  const [view, setView] = useState<'list' | 'create'>('list')
  const [createLine, setCreateLine] = useState<BusinessLine>('韩国')
  const [pickLineOpen, setPickLineOpen] = useState(false)
  const [pickedLine, setPickedLine] = useState<BusinessLine | null>(null)

  const [keyword, setKeyword] = useState('')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [editProducts, setEditProducts] = useState<CouponProduct[]>([])

  const [codesCoupon, setCodesCoupon] = useState<Coupon | null>(null)
  const [codesList, setCodesList] = useState<CouponCode[]>([])

  const [extendCoupon, setExtendCoupon] = useState<Coupon | null>(null)
  const [extendTime, setExtendTime] = useState<Dayjs | null>(null)

  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null)

  const data = useMemo(
    () =>
      coupons.filter((c) => {
        if (scope && !scope.includes(c.businessLine)) return false
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          c.id.toLowerCase().includes(kw) ||
          c.name.toLowerCase().includes(kw) ||
          c.codes.some((cc) => cc.code.toLowerCase().includes(kw) || cc.kol.toLowerCase().includes(kw))
        return (
          matchKw &&
          (!lineFilter || c.businessLine === lineFilter) &&
          (!statusFilter || c.status === statusFilter)
        )
      }),
    [coupons, keyword, lineFilter, statusFilter, scope],
  )

  const confirmPickLine = () => {
    if (!pickedLine) {
      message.error(t('cp.pickLineError'))
      return
    }
    setCreateLine(pickedLine)
    setPickLineOpen(false)
    setView('create')
  }

  const openEdit = (c: Coupon) => {
    setEditCoupon(c)
    setEditProducts(c.products)
  }
  const saveEdit = () => {
    if (!editCoupon) return
    if (editProducts.length === 0) {
      message.error(t('cp.saveProductsErr'))
      return
    }
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) => (c.id === editCoupon.id ? { ...c, products: editProducts } : c)),
    }))
    addLog({ actor, module: 'coupons', action: t('cp.log.editProducts'), target: `${editCoupon.id} · ${editCoupon.name}` })
    message.success(t('cp.saveProductsOk'))
    setEditCoupon(null)
  }

  const openCodes = (c: Coupon) => {
    setCodesCoupon(c)
    setCodesList(c.codes)
  }
  const saveCodes = () => {
    if (!codesCoupon) return
    if (codesList.length === 0) {
      message.error(t('cp.codesRequired'))
      return
    }
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) => (c.id === codesCoupon.id ? { ...c, codes: codesList } : c)),
    }))
    addLog({ actor, module: 'coupons', action: t('cp.log.codes'), target: `${codesCoupon.id} · ${codesCoupon.name}` })
    message.success(t('cp.saveCodesOk'))
    setCodesCoupon(null)
  }

  const openExtend = (c: Coupon) => {
    setExtendCoupon(c)
    setExtendTime(null)
  }
  const saveExtend = () => {
    if (!extendCoupon || !extendTime) {
      message.error(t('cp.extendNeedTime'))
      return
    }
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) =>
        c.id === extendCoupon.id
          ? {
              ...c,
              claimEnd: extendTime.format('YYYY-MM-DD HH:mm:ss'),
              status: extendTime.isAfter(dayjs()) ? '已生效' : c.status,
            }
          : c,
      ),
    }))
    addLog({ actor, module: 'coupons', action: t('cp.log.extend'), target: `${extendCoupon.id} · ${extendCoupon.name}` })
    message.success(t('cp.extendOk'))
    setExtendCoupon(null)
  }

  const stopIssue = (c: Coupon) =>
    Modal.confirm({
      title: t('cp.stopTitle'),
      content: t('cp.stopContent', { name: c.name }),
      okText: t('cp.stopOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => {
        setState((prev) => ({
          ...prev,
          coupons: prev.coupons.map((x) => (x.id === c.id ? { ...x, status: '已结束' } : x)),
        }))
        addLog({ actor, module: 'coupons', action: t('cp.log.stop'), target: `${c.id} · ${c.name}` })
      },
    })

  const columns: ColumnsType<Coupon> = [
    { title: t('cp.col.id'), dataIndex: 'id', width: 90, fixed: 'left' },
    { title: t('cp.col.name'), dataIndex: 'name', width: 200 },
    {
      title: t('cp.col.codes'),
      dataIndex: 'codes',
      width: 130,
      render: (codes: CouponCode[], r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openCodes(r)}>
          <Tag color="blue">{t('cp.codesCount', { n: codes.length })}</Tag>
        </Button>
      ),
    },
    { title: t('cp.col.line'), dataIndex: 'businessLine', width: 90, render: (v) => <Tag color="geekblue">{v}</Tag> },
    { title: t('cp.col.currency'), dataIndex: 'currency', width: 80 },
    { title: t('cp.col.total'), dataIndex: 'total', width: 100, align: 'right', render: (v) => v.toLocaleString() },
    {
      title: t('cp.col.remaining'),
      dataIndex: 'remaining',
      width: 100,
      align: 'right',
      render: (v) => v.toLocaleString(),
    },
    { title: t('cp.col.creator'), dataIndex: 'creator', width: 170 },
    {
      title: t('cp.col.status'),
      dataIndex: 'status',
      width: 100,
      render: (v: CouponStatus) => <Tag color={v === '已生效' ? 'green' : 'default'}>{t(`enum.coupon.${v}`)}</Tag>,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 360,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setDetailCoupon(r)}>
            {t('common.detail')}
          </Button>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(r)}>
              {t('common.edit')}
            </Button>
          )}
          {canEdit && (
            <Button type="link" size="small" onClick={() => openCodes(r)}>
              {t('cp.manageCodes')}
            </Button>
          )}
          {canEdit && (
            <Button type="link" size="small" onClick={() => openExtend(r)}>
              {t('cp.extend')}
            </Button>
          )}
          {canEdit && (
            <Button type="link" size="small" danger disabled={r.status === '已结束'} onClick={() => stopIssue(r)}>
              {t('cp.stop')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  if (view === 'create') {
    return <CreateCoupon line={createLine} onBack={() => setView('list')} />
  }

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('cp.title')}</span>}
      extra={
        canEdit ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setPickedLine(null)
              setPickLineOpen(true)
            }}
          >
            {t('cp.genBtn')}
          </Button>
        ) : null
      }
    >
      <Alert
        type="warning"
        showIcon
        message={t('phase2.banner')}
        style={{ marginBottom: 16 }}
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('cp.searchPlaceholder')}
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t('cp.filterLine')}
          style={{ width: 140 }}
          value={lineFilter}
          onChange={setLineFilter}
          options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
        />
        <Select
          allowClear
          placeholder={t('cp.filterStatus')}
          style={{ width: 140 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={(['已生效', '已结束'] as CouponStatus[]).map((l) => ({ label: t(`enum.coupon.${l}`), value: l }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1580 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />

      {/* 选择业务类型 */}
      <Modal
        open={pickLineOpen}
        title={t('cp.pickLineTitle')}
        onCancel={() => setPickLineOpen(false)}
        onOk={confirmPickLine}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={460}
      >
        <Radio.Group
          value={pickedLine ?? undefined}
          onChange={(e) => setPickedLine(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space size={12} wrap style={{ padding: '12px 0' }}>
            {BUSINESS_LINES.map((l) => (
              <Radio.Button key={l} value={l} style={{ minWidth: 84, textAlign: 'center' }}>
                {l}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>
      </Modal>

      {/* 编辑 - 可用商品 */}
      <Modal
        open={!!editCoupon}
        title={t('cp.editRuleTitle')}
        onCancel={() => setEditCoupon(null)}
        width={760}
        footer={[
          <Button key="back" onClick={() => setEditCoupon(null)}>
            {t('common.back')}
          </Button>,
          <Button key="ok" type="primary" onClick={saveEdit}>
            {t('common.confirm')}
          </Button>,
        ]}
      >
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ color: '#ff4d4f' }}>
              *
            </Text>{' '}
            <Text strong>{t('cp.products')}：</Text>
          </div>
          <ProductPicker value={editProducts} onChange={setEditProducts} />
        </div>
      </Modal>

      {/* 延长时间 */}
      <Modal
        open={!!extendCoupon}
        title={t('cp.extendTitle')}
        onCancel={() => setExtendCoupon(null)}
        onOk={saveExtend}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={460}
      >
        {extendCoupon && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">{t('cp.currentEnd')}</Text>
              <Text strong>{extendCoupon.claimEnd}</Text>
            </div>
            <Space>
              <Text>{t('cp.changeTime')}</Text>
              <DatePicker
                showTime
                value={extendTime ?? undefined}
                onChange={(v) => setExtendTime(v)}
                placeholder={t('cp.pickTime')}
                style={{ width: 260 }}
              />
            </Space>
          </div>
        )}
      </Modal>

      {/* 券详情 */}
      <Modal
        open={!!detailCoupon}
        title={t('cp.detailTitle')}
        footer={[
          <Button key="close" onClick={() => setDetailCoupon(null)}>
            {t('common.close')}
          </Button>,
        ]}
        width={680}
        onCancel={() => setDetailCoupon(null)}
      >
        {detailCoupon && (
          <div style={{ marginTop: 12 }}>
            <Divider orientation="left" plain style={{ marginTop: 0 }}>
              {t('cp.basic')}
            </Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('cp.col.id')}>{detailCoupon.id}</Descriptions.Item>
              <Descriptions.Item label={t('cp.col.codes')}>
                {t('cp.codesCount', { n: detailCoupon.codes.length })}
              </Descriptions.Item>
              <Descriptions.Item label={t('cp.name')} span={2}>
                {detailCoupon.name}
              </Descriptions.Item>
              <Descriptions.Item label={t('cp.col.line')}>
                <Tag color="geekblue">{detailCoupon.businessLine}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('cp.couponType')}>{t('enum.couponType.满减券')}</Descriptions.Item>
              <Descriptions.Item label={t('cp.currency')}>{detailCoupon.currency}</Descriptions.Item>
              <Descriptions.Item label={t('cp.creator')}>{detailCoupon.creator}</Descriptions.Item>
              <Descriptions.Item label={t('cp.col.status')}>
                <Tag color={detailCoupon.status === '已生效' ? 'green' : 'default'}>{t(`enum.coupon.${detailCoupon.status}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('cp.createTime')}>{detailCoupon.createdAt}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>
              {t('cp.issueRule')}
            </Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('cp.col.total')}>{detailCoupon.total.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label={t('cp.col.remaining')}>{detailCoupon.remaining.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label={t('cp.claimValidLabel')} span={2}>
                {detailCoupon.claimStart} ~ {detailCoupon.claimEnd}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>
              {t('cp.useRule')}
            </Divider>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('cp.useValidLabel')}>
                {detailCoupon.useStart} ~ {detailCoupon.useEnd}
              </Descriptions.Item>
              <Descriptions.Item label={t('cp.fullMinus')}>
                {t('cp.fullMinusValue', {
                  threshold: detailCoupon.thresholdAmount.toLocaleString(),
                  deduct: detailCoupon.deductAmount.toLocaleString(),
                  currency: detailCoupon.currency,
                })}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <Text strong>{t('cp.products')}</Text>
              <Table
                style={{ marginTop: 8 }}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detailCoupon.products}
                locale={{ emptyText: t('common.noData') }}
                columns={[
                  { title: t('cp.prod.id'), dataIndex: 'id', width: 100 },
                  { title: t('cp.prod.name'), dataIndex: 'name' },
                  { title: t('cp.prod.price'), dataIndex: 'price', width: 120, render: (v) => v.toLocaleString() },
                ]}
              />
            </div>

            <Divider orientation="left" plain>
              {t('cp.codes')}
            </Divider>
            <Space style={{ marginBottom: 8 }}>
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={detailCoupon.codes.length === 0}
                onClick={() => copyText(detailCoupon.codes.map((c) => c.code).join('\n'), t('common.copied'))}
              >
                {t('cp.copyAllCodes')}
              </Button>
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={detailCoupon.codes.length === 0}
                onClick={() => copyText(detailCoupon.codes.map((c) => `${c.kol}\t${c.code}`).join('\n'), t('common.copied'))}
              >
                {t('cp.copyAllWithKol')}
              </Button>
            </Space>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detailCoupon.codes}
              locale={{ emptyText: t('cp.noCodes') }}
              summary={(rows) => {
                const total = rows.reduce((s, r) => s + r.used, 0)
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>{t('cp.codesTotalUsed')}</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong>{total.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
              columns={[
                { title: t('cp.code.kol'), dataIndex: 'kol' },
                {
                  title: t('cp.code.code'),
                  dataIndex: 'code',
                  width: 200,
                  render: (v: string) => (
                    <Space size={4}>
                      <Text code>{v}</Text>
                      <Tooltip title={t('common.copy')}>
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyText(v, t('common.copied'))} />
                      </Tooltip>
                    </Space>
                  ),
                },
                { title: t('cp.code.used'), dataIndex: 'used', width: 120, align: 'right', render: (v) => v.toLocaleString() },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 管理优惠码 */}
      <Modal
        open={!!codesCoupon}
        title={t('cp.manageCodesTitle')}
        onCancel={() => setCodesCoupon(null)}
        width={680}
        footer={[
          <Button key="back" onClick={() => setCodesCoupon(null)}>
            {t('common.back')}
          </Button>,
          <Button key="ok" type="primary" onClick={saveCodes}>
            {t('common.confirm')}
          </Button>,
        ]}
      >
        {codesCoupon && (
          <div style={{ marginTop: 12 }}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={t('cp.manageCodesTip')}
            />
            <CodePicker value={codesList} onChange={setCodesList} showUsed />
          </div>
        )}
      </Modal>
    </Card>
  )
}
