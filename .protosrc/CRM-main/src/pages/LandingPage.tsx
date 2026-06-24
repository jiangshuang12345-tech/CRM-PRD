import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'

const { RangePicker } = DatePicker
import { CopyOutlined, DeleteOutlined, LinkOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { setState, uid, useStore } from '../store'
import type { ChannelLevelNode, ChannelLine, LandingPage } from '../types'
import { useSession } from '../auth'
import { useI18n } from '../i18n'

const { Text, Paragraph } = Typography

// 各业务线的落地页模版（关联渠道 / 商品包 / 优惠码）
const LANDING_TEMPLATES: Record<
  string,
  (p: { channel: string; packageId?: string; coupon?: string }) => string
> = {
  韩国: ({ channel, packageId, coupon }) => {
    const inner =
      `/website/payment/sku/?id=${packageId ?? ''}&channel=${channel}` +
      (coupon ? `&coupon=${coupon}` : '')
    return `https://kr.dinoai.ai/website/signin/?backurl=${encodeURIComponent(inner)}`
  },
  越南: ({ channel, coupon }) =>
    `https://vn.dinoai.ai/website/landingpage/signin/?channel=${channel}` +
    (coupon ? `&coupon=${coupon}` : ''),
  印尼: ({ channel, coupon }) =>
    `https://in.dinoai.ai/website/landingpage/signin/?channel=${channel}` +
    (coupon ? `&coupon=${coupon}` : ''),
  马来西亚: ({ channel, coupon }) =>
    `https://ma.dinoai.ai/website/landingpage/signin/?channel=${channel}` +
    (coupon ? `&coupon=${coupon}` : ''),
  马来: ({ channel, coupon }) =>
    `https://ma.dinoai.ai/website/landingpage/signin/?channel=${channel}` +
    (coupon ? `&coupon=${coupon}` : ''),
}

// 收集某业务线下所有「已生成 code」的渠道（带层级路径）
function collectCodes(line: ChannelLine): { code: string; path: string }[] {
  const res: { code: string; path: string }[] = []
  for (const tp of line.children) {
    const walk = (nodes: ChannelLevelNode[], names: string[]) => {
      for (const n of nodes) {
        const path = [tp.name, ...names, n.name].join(' / ')
        if (n.code) res.push({ code: n.code, path })
        walk(n.children, [...names, n.name])
      }
    }
    walk(tp.children, [])
  }
  return res
}

function copy(text: string, ok: string) {
  navigator.clipboard?.writeText(text)
  message.success(ok)
}

export default function LandingPageManagement() {
  const { t } = useI18n()
  const session = useSession()
  const channels = useStore((s) => s.channels)
  const packages = useStore((s) => s.packages)
  const coupons = useStore((s) => s.coupons)
  const landingPages = useStore((s) => s.landingPages)

  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [preview, setPreview] = useState<string | null>(null)
  const line = Form.useWatch('businessLine', form) as string | undefined
  const couponId = Form.useWatch('couponId', form) as string | undefined

  const lines = useMemo(() => channels.map((c) => c.name), [channels])
  const codeOptions = useMemo(() => {
    const c = channels.find((x) => x.name === line)
    return c ? collectCodes(c) : []
  }, [channels, line])
  const pkgOptions = useMemo(() => packages.filter((p) => p.businessLine === line), [packages, line])
  const couponOptions = useMemo(() => coupons.filter((c) => c.businessLine === line), [coupons, line])
  const codeOfCoupon = useMemo(
    () => coupons.find((c) => c.id === couponId)?.codes ?? [],
    [coupons, couponId],
  )

  const hasTemplate = !!line && !!LANDING_TEMPLATES[line]

  const onLineChange = () => {
    form.setFieldsValue({ channelCode: undefined, packageId: undefined, couponId: undefined, couponCode: undefined })
    setPreview(null)
  }

  const buildUrl = (): string | null => {
    const v = form.getFieldsValue()
    if (!v.businessLine || !LANDING_TEMPLATES[v.businessLine]) return null
    if (!v.channelCode) return null
    return LANDING_TEMPLATES[v.businessLine]({
      channel: v.channelCode,
      packageId: v.packageId,
      coupon: v.couponCode,
    })
  }

  const doPreview = async () => {
    await form.validateFields(['businessLine', 'channelCode'])
    const url = buildUrl()
    setPreview(url)
  }

  const openModal = () => {
    form.resetFields()
    setPreview(null)
    setOpen(true)
  }

  const submit = async () => {
    const v = await form.validateFields()
    const url = buildUrl()
    if (!url) {
      message.error(t('lp.noTemplate'))
      return
    }
    const ch = codeOptions.find((c) => c.code === v.channelCode)
    const pkg = packages.find((p) => p.id === v.packageId)
    const range = v.validRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined
    const lp: LandingPage = {
      id: uid('lp_'),
      businessLine: v.businessLine,
      channelCode: v.channelCode,
      channelName: ch?.path,
      packageId: v.packageId,
      packageName: pkg?.name,
      couponId: v.couponId,
      couponCode: v.couponCode,
      validFrom: range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      validUntil: range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      url,
      creator: session?.email ?? 'admin@dinoai.ai',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    setState((prev) => ({ ...prev, landingPages: [lp, ...prev.landingPages] }))
    message.success(t('lp.genOk'))
    setOpen(false)
  }

  const remove = (lp: LandingPage) =>
    Modal.confirm({
      title: t('lp.delTitle'),
      content: t('lp.delContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () =>
        setState((prev) => ({ ...prev, landingPages: prev.landingPages.filter((x) => x.id !== lp.id) })),
    })

  const columns: ColumnsType<LandingPage> = [
    { title: t('lp.col.line'), dataIndex: 'businessLine', width: 90, render: (v) => <Tag color="magenta">{v}</Tag> },
    {
      title: t('lp.col.channel'),
      dataIndex: 'channelName',
      width: 220,
      render: (v, r) => (
        <span>
          {v || '—'}
          <br />
          <Text code style={{ fontSize: 12 }}>{r.channelCode}</Text>
        </span>
      ),
    },
    { title: t('lp.col.package'), dataIndex: 'packageName', width: 200, render: (v) => v || <Text type="secondary">—</Text> },
    {
      title: t('lp.col.coupon'),
      dataIndex: 'couponId',
      width: 130,
      render: (v, r) => (v ? <span>{v}{r.couponCode ? <Text code style={{ marginLeft: 4 }}>{r.couponCode}</Text> : null}</span> : <Text type="secondary">—</Text>),
    },
    {
      title: t('lp.col.valid'),
      dataIndex: 'validFrom',
      width: 200,
      render: (_, r) =>
        r.validFrom && r.validUntil ? (
          <Text style={{ fontSize: 12 }}>
            {r.validFrom}
            <br />~ {r.validUntil}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: t('lp.col.url'),
      dataIndex: 'url',
      render: (v: string) => (
        <Space>
          <Text style={{ maxWidth: 320, display: 'inline-block', wordBreak: 'break-all' }}>{v}</Text>
          <Tooltip title={t('common.copy')}>
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(v, t('common.copied'))} />
          </Tooltip>
          <Tooltip title={t('lp.openLink')}>
            <Button size="small" type="text" icon={<LinkOutlined />} href={v} target="_blank" />
          </Tooltip>
        </Space>
      ),
    },
    { title: t('lp.col.creator'), dataIndex: 'creator', width: 170 },
    { title: t('lp.col.createTime'), dataIndex: 'createdAt', width: 170 },
    {
      title: t('common.action'),
      key: 'op',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(r)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ]

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('lp.title')}</span>}
      extra={
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={openModal}>
          {t('lp.genBtn')}
        </Button>
      }
    >
      <Alert type="warning" showIcon message={t('phase2.banner')} style={{ marginBottom: 16 }} />
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">{t('lp.intro')}</Text>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={landingPages}
        scroll={{ x: 1620 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />

      <Modal
        open={open}
        title={t('lp.genTitle')}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={t('lp.genConfirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !hasTemplate }}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item
            name="businessLine"
            label={t('lp.f.line')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <Select
              placeholder={t('common.pleaseSelect')}
              onChange={onLineChange}
              options={lines.map((l) => ({
                label: LANDING_TEMPLATES[l] ? l : `${l}（${t('lp.noTemplateTag')}）`,
                value: l,
              }))}
            />
          </Form.Item>

          {line && !hasTemplate && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={t('lp.noTemplate')} />
          )}

          <Form.Item
            name="channelCode"
            label={t('lp.f.channel')}
            tooltip={t('lp.f.channelTip')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <Select
              showSearch
              placeholder={line ? t('lp.f.channelPlaceholder') : t('lp.f.pickLineFirst')}
              disabled={!line}
              optionFilterProp="label"
              onChange={() => setPreview(null)}
              notFoundContent={t('lp.f.noChannel')}
              options={codeOptions.map((c) => ({ label: `${c.path}  ·  ${c.code}`, value: c.code }))}
            />
          </Form.Item>

          <Form.Item
            name="packageId"
            label={t('lp.f.package')}
            tooltip={t('lp.f.packageTip')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <Select
              showSearch
              placeholder={line ? t('common.pleaseSelect') : t('lp.f.pickLineFirst')}
              disabled={!line}
              optionFilterProp="label"
              onChange={() => setPreview(null)}
              options={pkgOptions.map((p) => ({ label: `${p.id} · ${p.name}`, value: p.id }))}
            />
          </Form.Item>

          <Form.Item name="couponId" label={t('lp.f.coupon')}>
            <Select
              allowClear
              showSearch
              placeholder={t('lp.f.optional')}
              disabled={!line}
              optionFilterProp="label"
              onChange={() => {
                form.setFieldsValue({ couponCode: undefined })
                setPreview(null)
              }}
              options={couponOptions.map((c) => ({ label: `${c.id} · ${c.name}`, value: c.id }))}
            />
          </Form.Item>

          {couponId && (
            <Form.Item name="couponCode" label={t('lp.f.couponCode')} tooltip={t('lp.f.couponCodeTip')}>
              <Select
                allowClear
                placeholder={t('lp.f.optional')}
                onChange={() => setPreview(null)}
                options={codeOfCoupon.map((c) => ({ label: `${c.kol} · ${c.code}`, value: c.code }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="validRange"
            label={t('lp.f.validRange')}
            tooltip={t('lp.f.validRangeTip')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm:ss' }}
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder={[t('lp.f.validStart'), t('lp.f.validEnd')]}
            />
          </Form.Item>

          <Divider style={{ margin: '8px 0 16px' }} />
          <Space style={{ marginBottom: 8 }}>
            <Button onClick={doPreview} disabled={!hasTemplate}>
              {t('lp.previewBtn')}
            </Button>
            <Text type="secondary">{t('lp.previewHint')}</Text>
          </Space>
          {preview && (
            <div
              style={{
                padding: '10px 12px',
                background: '#f5f7fa',
                borderRadius: 8,
                wordBreak: 'break-all',
                position: 'relative',
              }}
            >
              <Paragraph style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>{preview}</Paragraph>
              <Button
                size="small"
                style={{ marginTop: 8 }}
                icon={<CopyOutlined />}
                onClick={() => copy(preview, t('common.copied'))}
              >
                {t('common.copy')}
              </Button>
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  )
}
