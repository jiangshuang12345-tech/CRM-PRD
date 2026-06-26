import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { EditOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import type { AppChannel, LoginMethod, Student, UserStatus } from '../types'
import { APP_CHANNELS } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'

const { Text } = Typography

const STATUS_COLOR: Record<UserStatus, string> = {
  注册: 'default',
  体验: 'blue',
  付费: 'green',
  流失: 'red',
}

const METHOD_COLOR: Record<LoginMethod, string> = {
  谷歌邮箱: 'red',
  Facebook: 'blue',
  kakao: 'gold',
  手机号: 'green',
  AppID: 'purple',
}

const APP_CHANNEL_COLOR: Record<AppChannel, string> = {
  'App Store': 'blue',
  'Google Play': 'green',
}

export default function UserCenterP1() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const { can, allowedLines } = usePerm()
  const canEdit = can('users') === 'operate'
  const scope = allowedLines()
  const [keyword, setKeyword] = useState('')
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [channelFilter, setChannelFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [editing, setEditing] = useState<Student | null>(null)
  const [form] = Form.useForm()

  // 数据权限：底层仍按业务线隔离（一期不展示业务线，仅展示国家）
  const scoped = useMemo(
    () => (scope ? students.filter((s) => scope.includes(s.businessLine)) : students),
    [students, scope],
  )

  const countries = useMemo(
    () => Array.from(new Set(scoped.map((s) => s.country).filter(Boolean))) as string[],
    [scoped],
  )

  const data = useMemo(
    () =>
      scoped.filter((s) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          s.studentId.toLowerCase().includes(kw) ||
          (s.localName ?? s.name).toLowerCase().includes(kw) ||
          s.account.toLowerCase().includes(kw)
        const matchCountry = !countryFilter || s.country === countryFilter
        const matchChannel = !channelFilter || s.appChannel === channelFilter
        const matchStatus = !statusFilter || s.status === statusFilter
        return matchKw && matchCountry && matchChannel && matchStatus
      }),
    [scoped, keyword, countryFilter, channelFilter, statusFilter],
  )

  const openEdit = (s: Student) => {
    setEditing(s)
    form.setFieldsValue({
      localName: s.localName,
      gender: s.gender,
      birthday: s.birthday ? dayjs(s.birthday) : undefined,
    })
  }

  const submitEdit = async () => {
    const v = await form.validateFields()
    if (!editing) return
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.studentId === editing.studentId
          ? {
              ...s,
              localName: v.localName,
              gender: v.gender,
              birthday: v.birthday ? v.birthday.format('YYYY-MM-DD') : undefined,
            }
          : s,
      ),
    }))
    setEditing(null)
  }

  const columns: ColumnsType<Student> = [
    { title: t('user.col.id'), dataIndex: 'studentId', width: 190, fixed: 'left' },
    {
      title: t('user.col.name'),
      dataIndex: 'localName',
      width: 140,
      render: (_, r) => <span>{r.localName || r.name}</span>,
    },
    {
      title: t('user.col.method'),
      dataIndex: 'loginMethod',
      width: 120,
      render: (v: LoginMethod) => <Tag color={METHOD_COLOR[v]}>{t(`enum.method.${v}`)}</Tag>,
    },
    {
      title: t('user.col.account'),
      dataIndex: 'account',
      width: 220,
      render: (v) => <Text>{v}</Text>,
    },
    {
      title: t('user.col.appChannel'),
      dataIndex: 'appChannel',
      width: 140,
      render: (v: AppChannel | undefined) =>
        v ? <Tag color={APP_CHANNEL_COLOR[v]}>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: t('user.col.country'),
      dataIndex: 'country',
      width: 120,
      render: (v: string | undefined) => (v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>),
    },
    { title: t('user.col.regTime'), dataIndex: 'registerTime', width: 180 },
    {
      title: t('user.col.expireTime'),
      dataIndex: 'expireTime',
      width: 180,
      render: (v: string | undefined) => (v ? v : <Text type="secondary">—</Text>),
    },
    {
      title: t('user.col.status'),
      dataIndex: 'status',
      width: 100,
      render: (v: UserStatus) => <Tag color={STATUS_COLOR[v]}>{t(`enum.status.${v}`)}</Tag>,
    },
    {
      title: t('user.col.modifier'),
      dataIndex: 'lastModifier',
      width: 180,
      render: (v: string | undefined) => (v ? v : <Text type="secondary">—</Text>),
    },
    ...(canEdit
      ? [
          {
            title: t('common.action'),
            key: 'action',
            width: 120,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) => (
              <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                {t('user.editInfo')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('user.title')}</span>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('user.searchPlaceholder')}
          style={{ width: 280 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t('user.col.appChannel')}
          style={{ width: 150 }}
          value={channelFilter}
          onChange={setChannelFilter}
          options={APP_CHANNELS.map((c) => ({ label: c, value: c }))}
        />
        <Select
          allowClear
          placeholder={t('user.col.country')}
          style={{ width: 130 }}
          value={countryFilter}
          onChange={setCountryFilter}
          options={countries.map((c) => ({ label: c, value: c }))}
        />
        <Select
          allowClear
          placeholder={t('user.filterStatus')}
          style={{ width: 150 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={(['注册', '体验', '付费', '流失'] as UserStatus[]).map((l) => ({ label: t(`enum.status.${l}`), value: l }))}
        />
      </Space>

      <Table
        rowKey="studentId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1700 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />

      <Modal
        open={!!editing}
        title={t('user.modalTitle', { id: editing?.studentId ?? '' })}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item name="localName" label={t('user.label.localName')}>
            <Input placeholder={t('user.localNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="gender" label={t('user.label.gender')}>
            <Select
              allowClear
              placeholder={t('common.pleaseSelect')}
              options={(['男', '女', '其他'] as const).map((g) => ({ label: t(`enum.gender.${g}`), value: g }))}
            />
          </Form.Item>
          <Form.Item name="birthday" label={t('user.label.birthday')}>
            <DatePicker style={{ width: '100%' }} placeholder={t('user.birthdayPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('user.col.country')}>
            <Input value={editing?.country} disabled />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
