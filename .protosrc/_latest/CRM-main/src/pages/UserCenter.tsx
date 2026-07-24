import { useMemo, useState } from 'react'
import {
  Alert,
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
import { EditOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import type { LoginMethod, Student, StudentEditLog, StudentFieldChange, UserStatus, UserType } from '../types'
import { USER_STATUSES, USER_TYPES } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { hasPhoneLogin, resolveUserType } from '../userType'
import { resolveUserStatus } from '../lessons'
import { inUserCenter } from '../funnel'
import { useLineScope } from '../useLineScope'
import { businessLineOf, lineLabel, registerChannelText } from '../channel'
import LineFilter from '../components/LineFilter'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const STATUS_COLOR: Record<UserStatus, string> = {
  '未付费-未体验': 'default',
  '未付费-体验中': 'gold',
  '未付费-已体验': 'blue',
  付费: 'green',
  付费逾期: 'red',
}

const METHOD_COLOR: Record<LoginMethod, string> = {
  谷歌邮箱: 'red',
  Facebook: 'blue',
  kakao: 'gold',
  手机号: 'green',
  AppID: 'purple',
}

const USER_TYPE_COLOR: Record<UserType, string> = {
  正式用户: 'green',
  测试用户: 'gold',
}

export default function UserCenter() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const channels = useStore((s) => s.channels)
  const lessons = useStore((s) => s.lessons ?? [])
  const { can, actor } = usePerm()
  const canEdit = can('users_edit') === 'operate'
  const { selected: lineSel, setSelected: setLineSel, matchLine } = useLineScope()
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [editing, setEditing] = useState<Student | null>(null)
  const [historyOf, setHistoryOf] = useState<Student | null>(null)
  const [form] = Form.useForm()

  // 业务线筛选选项：渠道业务线 + 数据中出现的业务线（无渠道归因的空业务线不入选项）
  const lineOptions = useMemo(
    () =>
      Array.from(
        new Set([...channels.map((c) => c.name), ...students.map((s) => businessLineOf(channels, s))].filter(Boolean)),
      ),
    [channels, students],
  )

  // 国家筛选选项：数据中出现的注册国家
  const countryOptions = useMemo(
    () => Array.from(new Set(students.map((s) => lineLabel(s)).filter(Boolean))),
    [students],
  )

  const data = useMemo(
    () =>
      students.filter((s) => {
        // 分流规则：未付费-未体验且有手机号的用户进入「销售中心」，其余展示在此
        if (!inUserCenter(s, lessons)) return false
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          s.studentId.toLowerCase().includes(kw) ||
          (s.localName ?? s.name).toLowerCase().includes(kw) ||
          s.account.toLowerCase().includes(kw)
        const matchStatus = !statusFilter || resolveUserStatus(s, lessons) === statusFilter
        const matchType = !typeFilter || resolveUserType(s) === typeFilter
        const matchCountry = !countryFilter || lineLabel(s) === countryFilter
        // 无业务线（无渠道归因）的用户不参与业务线过滤，始终展示
        const bl = businessLineOf(channels, s)
        return matchKw && (!bl || matchLine(bl)) && matchStatus && matchType && matchCountry
      }),
    [students, channels, lessons, keyword, lineSel, statusFilter, typeFilter, countryFilter, matchLine],
  )

  const phoneLocked = editing ? hasPhoneLogin(editing) : false

  const openEdit = (s: Student) => {
    setEditing(s)
    form.setFieldsValue({
      localName: s.localName,
      gender: s.gender,
      birthday: s.birthday ? dayjs(s.birthday) : undefined,
      businessLine: s.businessLine,
      userType: resolveUserType(s),
    })
  }

  const submitEdit = async () => {
    const v = await form.validateFields()
    if (!editing) return
    const locked = hasPhoneLogin(editing)
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.studentId === editing.studentId
          ? {
              ...s,
              localName: v.localName,
              gender: v.gender,
              birthday: v.birthday ? v.birthday.format('YYYY-MM-DD') : undefined,
              // 手机号/kakao 由规则自动判定，不接受手动修改
              userType: locked ? s.userType : v.userType,
              lastModifier: actor,
            }
          : s,
      ),
    }))
    setEditing(null)
  }

  const columns: ColumnsType<Student> = [
    {
      title: t('user.col.id'),
      dataIndex: 'studentId',
      width: 190,
      fixed: 'left',
      render: (v: string) => <Link to={`/users-v2/${v}`}>{v}</Link>,
    },
    {
      title: t('user.col.name'),
      dataIndex: 'localName',
      width: 140,
      render: (_, r) => <span>{r.localName || r.name}</span>,
    },
    {
      title: t('user.col.status'),
      dataIndex: 'status',
      width: 130,
      render: (_: UserStatus, r: Student) => {
        const st = resolveUserStatus(r, lessons)
        return <Tag color={STATUS_COLOR[st]}>{t(`enum.status.${st}`)}</Tag>
      },
    },
    {
      title: t('user.col.userType'),
      dataIndex: 'userType',
      width: 110,
      render: (_: UserType, r: Student) => {
        const tp = resolveUserType(r)
        return <Tag color={USER_TYPE_COLOR[tp]}>{t(`enum.userType.${tp}`)}</Tag>
      },
    },
    {
      title: t('user.col.ageGroup'),
      dataIndex: 'ageGroup',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: t('user.col.courseLevel'),
      dataIndex: 'courseLevel',
      width: 110,
      render: (v: string | undefined) => (v ? <Text>{v}</Text> : <Text type="secondary">-</Text>),
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
      width: 200,
      render: (v) => <Text>{v}</Text>,
    },
    { title: t('user.col.country'), dataIndex: 'country', width: 110, render: (_, r) => <Tag>{lineLabel(r)}</Tag> },
    {
      title: t('user.col.channelSource'),
      dataIndex: 'registerChannel',
      width: 260,
      render: (_: string, r) => registerChannelText(channels, r),
    },
    {
      title: t('user.col.code'),
      dataIndex: 'channelCode',
      width: 200,
      render: (v: string) => (v ? <Text code>{v}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: t('user.col.campaign'),
      dataIndex: 'campaign',
      width: 150,
      render: (v: string | undefined) => v || <Text type="secondary">-</Text>,
    },
    {
      title: t('user.col.campaignId'),
      dataIndex: 'campaignId',
      width: 180,
      render: (v: string | undefined) => v || <Text type="secondary">-</Text>,
    },
    {
      title: t('user.col.trialStatus'),
      dataIndex: 'trialStatusStr',
      width: 130,
      render: (v: string | undefined) => v || <Text type="secondary">-</Text>,
    },
    {
      title: t('user.col.paymentStatus'),
      dataIndex: 'paymentStatusStr',
      width: 130,
      render: (v: string | undefined) => v || <Text type="secondary">-</Text>,
    },
    {
      title: t('user.col.paymentPlatform'),
      dataIndex: 'paymentPlatform',
      width: 130,
      render: (v: string | undefined) => v || <Text type="secondary">-</Text>,
    },
    {
      title: t('user.col.regTime'),
      dataIndex: 'registerTime',
      width: 200,
      render: (v: string | undefined, r: Student) => <LocalTime time={v} country={r.country || r.businessLine} />,
    },
    {
      title: t('user.col.expireTime'),
      dataIndex: 'expireTime',
      width: 200,
      render: (v: string | undefined, r: Student) => <LocalTime time={v} country={r.country || r.businessLine} />,
    },
    {
      title: t('user.col.modifier'),
      dataIndex: 'lastModifier',
      width: 180,
      render: (v: string | undefined, r: Student) =>
        v ? (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => setHistoryOf(r)}>
            {v}
            <HistoryOutlined style={{ marginInlineStart: 6 }} />
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, r: Student) =>
        canEdit ? (
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            {t('user.editInfo')}
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('user.titleV2')}</span>}>
      <Alert type="warning" showIcon message={t('phase3.banner')} style={{ marginBottom: 16 }} />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('user.funnelTip')} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('user.searchPlaceholder')}
          style={{ width: 280 }}
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
          options={countryOptions.map((c) => ({ label: c, value: c }))}
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
          placeholder={t('user.filterStatus')}
          style={{ width: 150 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={USER_STATUSES.map((l) => ({ label: t(`enum.status.${l}`), value: l }))}
        />
      </Space>

      <Table
        rowKey="studentId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 2990 }}
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
          <Form.Item
            name="userType"
            label={t('user.col.userType')}
            tooltip={phoneLocked ? t('user.userTypeAutoTip') : undefined}
          >
            <Select
              disabled={phoneLocked}
              options={USER_TYPES.map((tp) => ({ label: t(`enum.userType.${tp}`), value: tp }))}
            />
          </Form.Item>
          <Form.Item label={t('user.col.line')} tooltip={t('user.lineReadonly')}>
            <Input value={editing?.businessLine} disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!historyOf}
        title={t('user.hist.title')}
        onCancel={() => setHistoryOf(null)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Table<StudentEditLog>
          rowKey={(r) => `${r.time}-${r.modifier}`}
          size="small"
          pagination={false}
          dataSource={historyOf?.editHistory ?? []}
          locale={{ emptyText: t('user.hist.empty') }}
          columns={[
            { title: t('user.hist.col.time'), dataIndex: 'time', width: 170 },
            {
              title: t('user.hist.col.detail'),
              dataIndex: 'changes',
              render: (changes: StudentFieldChange[] | undefined, r: StudentEditLog) => {
                if (changes && changes.length)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {changes.map((c, i) => (
                        <div key={i}>
                          <Text type="secondary">{c.field}：</Text>
                          <Text delete type="secondary">{c.before || t('user.hist.blank')}</Text>
                          <Text type="secondary"> → </Text>
                          <Text strong>{c.after || t('user.hist.blank')}</Text>
                        </div>
                      ))}
                    </div>
                  )
                return r.detail ? <span>{r.detail}</span> : <Text type="secondary">—</Text>
              },
            },
            { title: t('user.hist.col.modifier'), dataIndex: 'modifier', width: 190 },
          ]}
        />
      </Modal>
    </Card>
  )
}
