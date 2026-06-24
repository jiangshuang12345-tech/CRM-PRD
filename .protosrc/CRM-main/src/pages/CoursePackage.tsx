import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { setState, useStore } from '../store'
import { BUSINESS_LINES, LINE_CURRENCY } from '../types'
import type { BusinessLine, CoursePackage } from '../types'
import { useSession } from '../auth'
import { useI18n } from '../i18n'

const { Text } = Typography
const { RangePicker } = DatePicker

function currencyOptions(line?: BusinessLine) {
  const opts = [{ label: '美元 (USD)', value: 'USD' }]
  if (line && line !== '其他') {
    const c = LINE_CURRENCY[line]
    opts.unshift({ label: c.label, value: c.code })
  }
  return opts
}

export default function CoursePackagePage() {
  const { t } = useI18n()
  const packages = useStore((s) => s.packages)
  const session = useSession()
  const [keyword, setKeyword] = useState('')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; record?: CoursePackage } | null>(null)
  const [detail, setDetail] = useState<CoursePackage | null>(null)
  const [form] = Form.useForm()
  const watchLine = Form.useWatch('businessLine', form) as BusinessLine | undefined

  const data = useMemo(
    () =>
      packages.filter((p) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw = !kw || p.id.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw)
        return matchKw && (!lineFilter || p.businessLine === lineFilter)
      }),
    [packages, keyword, lineFilter],
  )

  const openAdd = () => {
    setModal({ mode: 'add' })
    form.resetFields()
  }
  const openEdit = (record: CoursePackage) => {
    setModal({ mode: 'edit', record })
    form.setFieldsValue({
      businessLine: record.businessLine,
      name: record.name,
      currency: record.currency,
      price: record.price,
      validRange: [dayjs(record.validStart), dayjs(record.validEnd)],
    })
  }

  const submit = async () => {
    const v = await form.validateFields()
    const [validStart, validEnd] = v.validRange as [Dayjs, Dayjs]
    if (modal?.mode === 'add') {
      const pkg: CoursePackage = {
        id: `PKG${Math.floor(1000 + Math.random() * 9000)}`,
        businessLine: v.businessLine,
        name: v.name,
        currency: v.currency,
        price: v.price,
        validStart: validStart.format('YYYY-MM-DD HH:mm:ss'),
        validEnd: validEnd.format('YYYY-MM-DD HH:mm:ss'),
        creator: session?.email ?? 'admin@dinoai.ai',
        status: '上架',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      setState((prev) => ({ ...prev, packages: [pkg, ...prev.packages] }))
      message.success(t('pkg.added'))
    } else if (modal?.record) {
      setState((prev) => ({
        ...prev,
        packages: prev.packages.map((p) =>
          p.id === modal.record!.id
            ? {
                ...p,
                businessLine: v.businessLine,
                name: v.name,
                currency: v.currency,
                price: v.price,
                validStart: validStart.format('YYYY-MM-DD HH:mm:ss'),
                validEnd: validEnd.format('YYYY-MM-DD HH:mm:ss'),
              }
            : p,
        ),
      }))
      message.success(t('pkg.updated'))
    }
    setModal(null)
  }

  const toggleShelf = (record: CoursePackage) => {
    const next = record.status === '上架' ? '下架' : '上架'
    Modal.confirm({
      title: next === '下架' ? t('pkg.shelfOffTitle') : t('pkg.shelfOnTitle'),
      content: t('pkg.shelfConfirm', { action: t(`enum.pkg.${next}`), name: record.name }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: next === '下架' ? { danger: true } : undefined,
      onOk: () =>
        setState((prev) => ({
          ...prev,
          packages: prev.packages.map((p) => (p.id === record.id ? { ...p, status: next } : p)),
        })),
    })
  }

  const columns: ColumnsType<CoursePackage> = [
    { title: t('pkg.col.id'), dataIndex: 'id', width: 120 },
    { title: t('pkg.col.line'), dataIndex: 'businessLine', width: 100, render: (v) => <Tag color="geekblue">{v}</Tag> },
    { title: t('pkg.col.name'), dataIndex: 'name', width: 220 },
    {
      title: t('pkg.col.price'),
      dataIndex: 'price',
      width: 150,
      render: (v, r) => (
        <Text strong>
          {r.currency} {v.toLocaleString()}
        </Text>
      ),
    },
    {
      title: t('pkg.col.valid'),
      key: 'valid',
      width: 340,
      render: (_, r) => (
        <Text type="secondary">
          {r.validStart} ~ {r.validEnd}
        </Text>
      ),
    },
    { title: t('pkg.col.creator'), dataIndex: 'creator', width: 180 },
    {
      title: t('pkg.col.status'),
      dataIndex: 'status',
      width: 100,
      render: (v) => <Tag color={v === '上架' ? 'green' : 'default'}>{t(`enum.pkg.${v}`)}</Tag>,
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" onClick={() => setDetail(r)}>
            {t('common.detail')}
          </Button>
          <Button type="link" onClick={() => openEdit(r)}>
            {t('common.edit')}
          </Button>
          <Button type="link" danger={r.status === '上架'} onClick={() => toggleShelf(r)}>
            {r.status === '上架' ? t('pkg.offShelf') : t('pkg.onShelf')}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('pkg.title')}</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {t('pkg.addBtn')}
        </Button>
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
          placeholder={t('pkg.searchPlaceholder')}
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t('pkg.filterLine')}
          style={{ width: 150 }}
          value={lineFilter}
          onChange={setLineFilter}
          options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1440 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />

      <Modal
        open={!!modal}
        title={modal?.mode === 'add' ? t('pkg.addTitle') : t('pkg.editTitle')}
        onCancel={() => setModal(null)}
        onOk={submit}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item name="businessLine" label={t('pkg.label.line')} rules={[{ required: true, message: t('pkg.lineRequired') }]}>
            <Select
              placeholder={t('pkg.linePlaceholder')}
              options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
              onChange={() => form.setFieldValue('currency', undefined)}
            />
          </Form.Item>
          <Form.Item name="name" label={t('pkg.label.name')} rules={[{ required: true, message: t('pkg.nameRequired') }]}>
            <Input placeholder={t('pkg.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="currency" label={t('pkg.label.currency')} rules={[{ required: true, message: t('pkg.currencyRequired') }]}>
            <Select placeholder={t('pkg.currencyPlaceholder')} options={currencyOptions(watchLine)} />
          </Form.Item>
          <Form.Item name="price" label={t('pkg.label.price')} rules={[{ required: true, message: t('pkg.priceRequired') }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder={t('pkg.pricePlaceholder')} />
          </Form.Item>
          <Form.Item name="validRange" label={t('pkg.label.valid')} rules={[{ required: true, message: t('pkg.validRequired') }]}>
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder={[t('pkg.startTime'), t('pkg.endTime')]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title={t('pkg.detailTitle')} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label={t('pkg.col.id')}>{detail.id}</Descriptions.Item>
            <Descriptions.Item label={t('pkg.label.line')}>{detail.businessLine}</Descriptions.Item>
            <Descriptions.Item label={t('pkg.label.name')}>{detail.name}</Descriptions.Item>
            <Descriptions.Item label={t('pkg.label.price')}>
              {detail.currency} {detail.price.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('pkg.label.valid')}>
              {detail.validStart} ~ {detail.validEnd}
            </Descriptions.Item>
            <Descriptions.Item label={t('pkg.col.creator')}>{detail.creator}</Descriptions.Item>
            <Descriptions.Item label={t('pkg.col.status')}>
              <Tag color={detail.status === '上架' ? 'green' : 'default'}>{t(`enum.pkg.${detail.status}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pkg.createTime')}>{detail.createdAt}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  )
}
