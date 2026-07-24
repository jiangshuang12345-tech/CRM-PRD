import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd'
import { CheckOutlined, EditOutlined, PhoneOutlined, SearchOutlined, SettingOutlined, SwapOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { genCallId, setState, useStore } from '../store'
import type { CallRecord, CallResult, SalesFollowLog, SalesSettings, Student, UserType } from '../types'
import { CALL_RESULTS } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { isClaimedLead, isPoolLead, isSalesLead } from '../funnel'
import { resolveUserType } from '../userType'
import { useLineScope } from '../useLineScope'
import { businessLineOf, lineLabel, registerChannelText } from '../channel'
import LineFilter from '../components/LineFilter'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const CALL_RESULT_COLOR: Record<CallResult, string> = {
  已接通: 'green',
  无人接听: 'red',
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const USER_TYPE_COLOR: Record<UserType, string> = {
  正式用户: 'green',
  测试用户: 'gold',
}

// 跟进进度标签配色
const PROGRESS_COLOR: Record<string, string> = {
  待领取: 'orange',
  跟进中: 'blue',
  暂不跟进: 'default',
  已付费: 'green',
}

// 更新跟进弹窗里可选的进度
const FOLLOW_PROGRESS = ['跟进中', '已付费', '暂不跟进'] as const

export default function SalesCenter() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const channels = useStore((s) => s.channels)
  const lessons = useStore((s) => s.lessons ?? [])
  const callRecords = useStore((s) => s.callRecords ?? [])
  const salesSettings = useStore((s) => s.salesSettings)
  const accounts = useStore((s) => s.accounts)
  const roles = useStore((s) => s.roles)
  const { can, allowedLines, actor, account } = usePerm()
  const canEdit = can('sales_update') === 'operate'
  const canClaim = can('sales_claim') === 'operate'
  const canDial = can('sales_dial') === 'operate'
  const canReassign = can('sales_reassign') === 'operate'
  const canManageSettings = can('sales_config') === 'operate'
  // 全业务线（超管）或拥有重新分配权限的主管可见范围内全部领取记录
  const seeAllOwners = allowedLines() === null || canReassign
  // 当拥有分配与掉库设置权限时，视为 Leader 身份以显示横幅和设置入口
  const isLeader = canManageSettings
  const { selected: lineSel, setSelected: setLineSel, matchLine } = useLineScope()

  // 可被分配的销售：启用状态、且角色具备销售模块「操作」权限
  const salesAccounts = useMemo(
    () => accounts.filter((a) => a.status === '启用' && roles.find((r) => r.id === a.roleId)?.perms.sales === 'operate'),
    [accounts, roles],
  )

  const [tab, setTab] = useState('pool')
  const [keyword, setKeyword] = useState('')
  const [progressFilter, setProgressFilter] = useState<string | undefined>()
  const [callResultFilter, setCallResultFilter] = useState<string | undefined>()

  const [editing, setEditing] = useState<Student | null>(null)
  const [dialing, setDialing] = useState<Student | null>(null)
  const [reassigning, setReassigning] = useState<Student | null>(null)
  const [reassignTo, setReassignTo] = useState<string | undefined>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [form] = Form.useForm()

  // 无业务线（无渠道归因）的用户不参与业务线过滤，始终展示
  const lineHit = (s: Student) => {
    const bl = businessLineOf(channels, s)
    return !bl || matchLine(bl)
  }
  const poolAll = useMemo(
    () => students.filter((s) => isPoolLead(s, lessons)).filter(lineHit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, channels, lessons, lineSel, matchLine],
  )
  const followAll = useMemo(
    () =>
      students
        .filter((s) => isClaimedLead(s, lessons))
        .filter(lineHit)
        .filter((s) => seeAllOwners || s.salesOwner === actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, channels, lessons, lineSel, matchLine, seeAllOwners, actor],
  )

  // 业务线筛选选项：渠道业务线 + 学员中出现的业务线（空业务线不入选项）
  const lineOptions = useMemo(
    () =>
      Array.from(
        new Set([...channels.map((c) => c.name), ...students.map((s) => businessLineOf(channels, s))].filter(Boolean)),
      ),
    [channels, students],
  )

  const leadText = (s: Student) =>
    `${s.phone ?? ''} ${s.studentId} ${s.localName ?? s.name} ${s.country ?? ''} ${s.channelSource ?? ''} ${s.salesLatestNote ?? ''}`.toLowerCase()

  const poolData = useMemo(
    () =>
      poolAll.filter((s) => {
        const kw = keyword.trim().toLowerCase()
        return !kw || leadText(s).includes(kw)
      }),
    [poolAll, keyword],
  )

  const followData = useMemo(
    () =>
      followAll.filter((s) => {
        const kw = keyword.trim().toLowerCase()
        return (!kw || leadText(s).includes(kw)) && (!progressFilter || s.salesProgress === progressFilter)
      }),
    [followAll, keyword, progressFilter],
  )

  // 通话记录：按业务线默认勾选过滤，非超管仅看自己坐席的记录
  const callScoped = useMemo(() => {
    let list = callRecords.filter((c) => matchLine(c.businessLine))
    if (!seeAllOwners) list = list.filter((c) => c.agent === actor)
    return list
  }, [callRecords, lineSel, matchLine, seeAllOwners, actor])

  const callData = useMemo(
    () =>
      callScoped.filter((c) => {
        const kw = keyword.trim().toLowerCase()
        const text = `${c.phone} ${c.studentId} ${c.customer} ${c.note}`.toLowerCase()
        return (!kw || text.includes(kw)) && (!callResultFilter || c.result === callResultFilter)
      }),
    [callScoped, keyword, callResultFilter],
  )

  const claim = (s: Student) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = t('sales.claimNote')
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) =>
        x.studentId === s.studentId
          ? {
              ...x,
              salesOwner: actor,
              salesProgress: '跟进中',
              salesLatestNote: note,
              salesUpdatedAt: now,
              salesHistory: [{ progress: '跟进中', note, time: now, owner: actor }, ...(x.salesHistory || [])],
            }
          : x,
      ),
    }))
    message.success(t('sales.claimed', { phone: s.phone ?? '' }))
    setTab('follow')
  }

  const openFollow = (s: Student) => {
    setEditing(s)
    form.setFieldsValue({
      note: '',
    })
  }

  const saveFollow = async () => {
    const v = await form.validateFields()
    if (!editing) return
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = (v.note as string).trim()
    const owner = editing.salesOwner ?? actor
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) => {
        if (x.studentId === editing.studentId) {
          const currentProgress = x.salesProgress || '跟进中'
          return {
            ...x,
            salesLatestNote: note,
            salesUpdatedAt: now,
            salesHistory: [{ progress: currentProgress, note, time: now, owner }, ...(x.salesHistory || [])],
          }
        }
        return x
      }),
    }))
    setEditing(null)
    message.success(t('sales.saved'))
  }

  const openReassign = (s: Student) => {
    setReassigning(s)
    setReassignTo(undefined)
  }

  // 重新分配线索：改写归属销售 + 归档到跟进记录
  const doReassign = () => {
    if (!reassigning) return
    if (!reassignTo) {
      message.warning(t('sales.reassign.required'))
      return
    }
    const target = salesAccounts.find((a) => a.email === reassignTo)
    const name = target?.name ?? reassignTo
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = t('sales.reassign.note', { name })
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) =>
        x.studentId === reassigning.studentId
          ? {
              ...x,
              salesOwner: reassignTo,
              salesLatestNote: note,
              salesUpdatedAt: now,
              salesHistory: [
                { progress: x.salesProgress || '跟进中', note, time: now, owner: actor },
                ...(x.salesHistory || []),
              ],
            }
          : x,
      ),
    }))
    setReassigning(null)
    message.success(t('sales.reassigned', { name }))
  }

  // 保存外呼通话小结：生成通话记录 + 归档到该线索的销售跟进记录
  const saveCall = (result: CallResult, duration: string, rawNote: string) => {
    if (!dialing) return
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = `${t('sales.dial.autoNote')}${rawNote.trim()}`
    const owner = dialing.salesOwner ?? actor
    // 模拟外呼录音链接
    const dummyAudio = result === '已接通' ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : undefined
    const record: CallRecord = {
      id: genCallId(),
      studentId: dialing.studentId,
      customer: dialing.localName || dialing.name,
      phone: dialing.phone ?? '',
      businessLine: dialing.businessLine,
      result,
      duration,
      note,
      agent: actor,
      time: now,
    }
    setState((prev) => ({
      ...prev,
      callRecords: [record, ...prev.callRecords],
      students: prev.students.map((x) =>
        x.studentId === dialing.studentId
          ? {
              ...x,
              salesLatestNote: note,
              salesUpdatedAt: now,
              salesHistory: [
                { progress: x.salesProgress || '跟进中', note, time: now, owner, audioUrl: dummyAudio },
                ...(x.salesHistory || []),
              ],
            }
          : x,
      ),
    }))
    setDialing(null)
    message.success(t('sales.dialed'))
  }

  const typeCol = {
    title: t('user.col.userType'),
    dataIndex: 'userType',
    width: 100,
    render: (_: UserType, r: Student) => {
      const tp = resolveUserType(r)
      return <Tag color={USER_TYPE_COLOR[tp]}>{t(`enum.userType.${tp}`)}</Tag>
    },
  }
  // 基于「用户中心-二期」字段（不含 用户状态 / 到期时间 / 最近修改人 / 注册方式 / 渠道 code）
  const userColumns: ColumnsType<Student> = [
    { title: t('user.col.id'), dataIndex: 'studentId', width: 190, fixed: 'left' },
    { title: t('user.col.name'), dataIndex: 'localName', width: 140, render: (_, r) => r.localName || r.name },
    typeCol,
    {
      title: t('user.col.ageGroup'),
      dataIndex: 'ageGroup',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>),
    },
    { title: t('user.col.account'), dataIndex: 'account', width: 200, render: (v) => <Text>{v}</Text> },
    {
      title: t('user.col.line'),
      dataIndex: 'businessLine',
      width: 110,
      render: (_, r) => {
        const bl = businessLineOf(channels, r)
        return bl ? <Tag>{bl}</Tag> : <Text type="secondary">-</Text>
      },
    },
    { title: t('user.col.country'), dataIndex: 'country', width: 110, render: (_, r) => <Tag>{lineLabel(r)}</Tag> },
    {
      title: t('user.col.channel'),
      dataIndex: 'registerChannel',
      width: 260,
      render: (_: string, r) => registerChannelText(channels, r),
    },
    {
      title: t('user.col.regTime'),
      dataIndex: 'registerTime',
      width: 200,
      render: (v: string | undefined, r: Student) => <LocalTime time={v} country={r.country || r.businessLine} />,
    },
  ]

  const poolColumns: ColumnsType<Student> = [
    ...userColumns,
    ...(canClaim
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: 120,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) => (
              <Button type="link" icon={<CheckOutlined />} onClick={() => claim(r)}>
                {t('perm.sales_claim')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  const followColumns: ColumnsType<Student> = [
    ...userColumns,
    {
      title: t('sales.col.progress'),
      dataIndex: 'salesProgress',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color={PROGRESS_COLOR[v]}>{t(`sales.progress.${v}`)}</Tag> : '—'),
    },
    {
      title: t('sales.col.latestNote'),
      dataIndex: 'salesLatestNote',
      width: 220,
      ellipsis: true,
      render: (v: string | undefined) => v || <Text type="secondary">—</Text>,
    },
    { title: t('sales.col.updatedAt'), dataIndex: 'salesUpdatedAt', width: 170, render: (v) => v || <Text type="secondary">—</Text> },
    { title: t('sales.col.owner'), dataIndex: 'salesOwner', width: 190, render: (v) => v || <Text type="secondary">—</Text> },
    ...(canEdit || canDial || canReassign
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: canReassign ? 280 : 180,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) => (
              <Space size={0}>
                {canDial && (
                  <Button type="link" icon={<PhoneOutlined />} disabled={!r.phone} onClick={() => setDialing(r)}>
                    {t('perm.sales_dial')}
                  </Button>
                )}
                {canEdit && (
                  <Button type="link" icon={<EditOutlined />} onClick={() => openFollow(r)}>
                    {t('perm.sales_update')}
                  </Button>
                )}
                {canReassign && (
                  <Button type="link" icon={<SwapOutlined />} onClick={() => openReassign(r)}>
                    {t('perm.sales_reassign')}
                  </Button>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ]

  const callColumns: ColumnsType<CallRecord> = [
    { title: t('sales.call.time'), dataIndex: 'time', width: 180 },
    { title: t('sales.call.customer'), dataIndex: 'customer', width: 140 },
    { title: t('user.col.phone'), dataIndex: 'phone', width: 160 },
    { title: t('user.col.line'), dataIndex: 'businessLine', width: 100, render: (v) => <Tag>{v}</Tag> },
    {
      title: t('sales.call.result'),
      dataIndex: 'result',
      width: 110,
      render: (v: CallResult) => <Tag color={CALL_RESULT_COLOR[v]}>{t(`sales.callResult.${v}`)}</Tag>,
    },
    { title: t('sales.call.duration'), dataIndex: 'duration', width: 90 },
    {
      title: t('sales.call.note'),
      dataIndex: 'note',
      width: 340,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    { title: t('sales.call.agent'), dataIndex: 'agent', width: 190 },
  ]

  const totalLeads = students.filter((s) => isSalesLead(s, lessons)).length

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('sales.title')}</span>}
      extra={
        canManageSettings && (
          <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            {t('sales.settings')}
          </Button>
        )
      }
    >
      <Alert type="warning" showIcon message={t('phase2.banner')} style={{ marginBottom: 16 }} />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.flow')} description={t('sales.intro')} />

      <Space wrap style={{ marginBottom: 16 }}>
        <LineFilter value={lineSel} onChange={setLineSel} options={lineOptions} />
        {tab === 'follow' && (
          <Select
            allowClear
            placeholder={t('sales.col.progress')}
            style={{ width: 150 }}
            value={progressFilter}
            onChange={setProgressFilter}
            options={(['跟进中', '暂不跟进'] as const).map((p) => ({ label: t(`sales.progress.${p}`), value: p }))}
          />
        )}
        {tab === 'calls' && (
          <Select
            allowClear
            placeholder={t('sales.call.result')}
            style={{ width: 150 }}
            value={callResultFilter}
            onChange={setCallResultFilter}
            options={CALL_RESULTS.map((r) => ({ label: t(`sales.callResult.${r}`), value: r }))}
          />
        )}
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={tab === 'calls' ? t('sales.searchCalls') : t('sales.searchFollow')}
          style={{ width: 340 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </Space>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'pool',
            label: `${t('sales.tab.pool')} (${poolAll.length})`,
            children: (
              <Table
                rowKey="studentId"
                columns={poolColumns}
                dataSource={poolData}
                scroll={{ x: 1390 }}
                locale={{ emptyText: t('sales.emptyPool') }}
                pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
              />
            ),
          },
          {
            key: 'follow',
            label: `${t('sales.tab.follow')} (${followAll.length})`,
            children: (
              <>
                {isLeader && (
                  <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.leaderTip')} />
                )}
                <Table
                  rowKey="studentId"
                  columns={followColumns}
                  dataSource={followData}
                  scroll={{ x: canReassign ? 2400 : 2300 }}
                  locale={{ emptyText: t('sales.emptyFollow') }}
                  pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
                />
              </>
            ),
          },
          {
            key: 'calls',
            label: `${t('sales.tab.calls')} (${callScoped.length})`,
            children: (
              <>
                <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.callsBanner')} />
                <Table
                  rowKey="id"
                  columns={callColumns}
                  dataSource={callData}
                  scroll={{ x: 1310 }}
                  locale={{ emptyText: t('sales.emptyCalls') }}
                  pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
                />
              </>
            ),
          },
        ]}
      />

      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('sales.totalTip', { n: totalLeads })}
        </Text>
      </div>

      <Modal_Follow
        t={t}
        editing={editing}
        form={form}
        onCancel={() => setEditing(null)}
        onOk={saveFollow}
      />

      <Modal_Dial t={t} dialing={dialing} onCancel={() => setDialing(null)} onSave={saveCall} />

      <Modal
        open={!!reassigning}
        title={t('sales.reassign.title')}
        onCancel={() => setReassigning(null)}
        onOk={doReassign}
        okText={t('sales.reassign')}
        cancelText={t('common.cancel')}
        width={480}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">{t('sales.reassign.current')}：</Text>
          <Text strong>{reassigning?.salesOwner || '—'}</Text>
        </div>
        <div style={{ marginBottom: 6 }}>{t('sales.reassign.to')}</div>
        <Select
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          placeholder={t('sales.reassign.toPlaceholder')}
          value={reassignTo}
          onChange={setReassignTo}
          options={salesAccounts
            .filter((a) => a.email !== reassigning?.salesOwner)
            .map((a) => ({ label: `${a.name}（${a.email}）`, value: a.email }))}
        />
      </Modal>

      {settingsOpen && salesSettings && (
        <Modal_Settings
          t={t}
          open={settingsOpen}
          initialSettings={salesSettings}
          salesAccounts={salesAccounts}
          onCancel={() => setSettingsOpen(false)}
          onOk={(newSettings) => {
            setState((prev) => ({ ...prev, salesSettings: newSettings }))
            setSettingsOpen(false)
            message.success(t('sales.settings.saved'))
          }}
        />
      )}
    </Card>
  )
}

// 外呼弹窗：模拟发起呼叫 → 挂断后填写通话小结
function Modal_Dial({
  t,
  dialing,
  onCancel,
  onSave,
}: {
  t: (k: string, v?: Record<string, string | number>) => string
  dialing: Student | null
  onCancel: () => void
  onSave: (result: CallResult, duration: string, note: string) => void
}) {
  const [phase, setPhase] = useState<'calling' | 'summary'>('calling')
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<CallResult>('已接通')
  const [note, setNote] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 打开弹窗时重置状态并开始计时
  useEffect(() => {
    if (dialing) {
      setPhase('calling')
      setSeconds(0)
      setResult('已接通')
      setNote('')
      setIsGenerating(false)
    }
  }, [dialing])

  useEffect(() => {
    if (!dialing || phase !== 'calling') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [dialing, phase])

  const handleHangup = () => {
    setPhase('summary')
    if (result === '已接通' && seconds > 0) {
      setIsGenerating(true)
      setTimeout(() => {
        setNote(t('sales.dial.aiSummary'))
        setIsGenerating(false)
      }, 1500)
    }
  }

  const duration = result === '无人接听' ? '—' : fmtDuration(seconds)

  const submit = () => {
    if (!note.trim()) {
      message.warning(t('sales.dial.noteRequired'))
      return
    }
    onSave(result, duration, note)
  }

  return (
    <Modal
      open={!!dialing}
      title={t('sales.dial.title', { name: dialing?.localName || dialing?.name || '' })}
      onCancel={onCancel}
      width={520}
      destroyOnClose
      footer={
        phase === 'calling'
          ? [
              <Button key="hangup" danger type="primary" icon={<PhoneOutlined />} onClick={handleHangup}>
                {t('sales.dial.hangup')}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onCancel} disabled={isGenerating}>
                {t('common.cancel')}
              </Button>,
              <Button key="save" type="primary" onClick={submit} loading={isGenerating}>
                {t('sales.dial.save')}
              </Button>,
            ]
      }
    >
      <div style={{ padding: '4px 0 12px' }}>
        <div style={{ fontSize: 15 }}>
          <Text strong>{dialing?.localName || dialing?.name}</Text>
          <Tag style={{ marginInlineStart: 8 }}>{dialing?.businessLine}</Tag>
        </div>
        <div style={{ color: '#8c8c8c', marginTop: 4 }}>
          <PhoneOutlined /> {dialing?.phone}
        </div>
      </div>

      {phase === 'calling' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: '#52c41a', marginBottom: 8 }}>{t('sales.dial.connected')}</div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 2 }}>{fmtDuration(seconds)}</div>
        </div>
      ) : (
        <Form layout="vertical" style={{ marginTop: 4 }}>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('sales.dial.summaryTip')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label={t('sales.call.result')}>
              <Select
                value={result}
                onChange={(v) => setResult(v)}
                options={CALL_RESULTS.map((r) => ({ label: t(`sales.callResult.${r}`), value: r }))}
                disabled={isGenerating}
              />
            </Form.Item>
            <Form.Item label={t('sales.call.duration')}>
              <Input value={duration} disabled />
            </Form.Item>
          </div>
          <Form.Item label={t('sales.call.note')} required>
            <Input.TextArea
              rows={4}
              value={isGenerating ? t('sales.dial.aiGenerating') : note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('sales.f.notePlaceholder')}
              disabled={isGenerating}
              style={isGenerating ? { color: '#2F6BFF', backgroundColor: '#f0f5ff' } : undefined}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

// 更新跟进弹窗
function Modal_Follow({
  t,
  editing,
  form,
  onCancel,
  onOk,
}: {
  t: (k: string, v?: Record<string, string | number>) => string
  editing: Student | null
  form: ReturnType<typeof Form.useForm>[0]
  onCancel: () => void
  onOk: () => void
}) {
  const history: SalesFollowLog[] = editing?.salesHistory ?? []
  return (
    <ModalWrapper open={!!editing} title={t('sales.modal.title')} onCancel={onCancel} onOk={onOk} okText={t('sales.saveFollow')} cancelText={t('common.cancel')}>
      <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item label={t('user.col.phone')}>
            <Input value={editing?.phone} disabled />
          </Form.Item>
          <Form.Item label={t('sales.f.owner')}>
            <Input value={editing?.salesOwner} disabled />
          </Form.Item>
        </div>
        <Form.Item name="note" label={t('sales.f.note')} rules={[{ required: true, message: t('sales.f.noteRequired') }]}>
          <Input.TextArea rows={3} placeholder={t('sales.f.notePlaceholder')} />
        </Form.Item>
      </Form>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Text strong>{t('sales.history')}</Text>
        <div style={{ marginTop: 12 }}>
          {history.length ? (
            <Timeline
              items={history.map((h) => ({
                color: PROGRESS_COLOR[h.progress] === 'default' ? 'gray' : PROGRESS_COLOR[h.progress],
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <Text strong>{t(`sales.progress.${h.progress}`)}</Text> · {h.note}
                    </div>
                    {h.audioUrl && (
                      <div>
                        <audio controls src={h.audioUrl} style={{ height: 32, width: '100%', maxWidth: 300 }} />
                      </div>
                    )}
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                      {h.time} · {h.owner}
                    </div>
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">{t('sales.history.empty')}</Text>
          )}
        </div>
      </div>
    </ModalWrapper>
  )
}

function Modal_Settings({
  t,
  open,
  initialSettings,
  salesAccounts,
  onCancel,
  onOk,
}: {
  t: (k: string, v?: Record<string, string | number>) => string
  open: boolean
  initialSettings: SalesSettings
  salesAccounts: { email: string; name: string }[]
  onCancel: () => void
  onOk: (settings: SalesSettings) => void
}) {
  const [form] = Form.useForm()
  const enabled = Form.useWatch('autoDropEnabled', form)

  return (
    <Modal
      open={open}
      title={t('sales.settings.title')}
      onCancel={onCancel}
      onOk={async () => {
        const v = await form.validateFields()
        onOk(v as SalesSettings)
      }}
      width={640}
      destroyOnClose
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialSettings,
          allocations: salesAccounts.map((a) => {
            const existing = initialSettings.allocations?.find((x: any) => x.email === a.email)
            return { email: a.email, weight: existing ? existing.weight : 1 }
          }),
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: 16 }}>
            {t('sales.settings.dropRule')}
          </Text>
          <div style={{ marginTop: 12, padding: '16px', background: '#f5f5f5', borderRadius: 6 }}>
            <Form.Item name="autoDropEnabled" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Switch checkedChildren={t('common.enable')} unCheckedChildren={t('common.disable')} />
            </Form.Item>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: enabled ? 'inherit' : '#bfbfbf' }}>
              <span>{t('sales.settings.dropDesc1')}</span>
              <Form.Item name="autoDropHours" noStyle rules={[{ required: true }]}>
                <InputNumber min={1} max={720} disabled={!enabled} />
              </Form.Item>
              <span>{t('sales.settings.dropDesc2')}</span>
            </div>
          </div>
        </div>

        <div>
          <Text strong style={{ fontSize: 16 }}>
            {t('sales.settings.ratio')}
          </Text>
          <div style={{ marginTop: 12 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={salesAccounts}
              rowKey="email"
              columns={[
                { title: t('sales.col.owner'), dataIndex: 'name', width: 220, render: (v, r) => `${v} (${r.email})` },
                {
                  title: t('sales.settings.weight'),
                  key: 'weight',
                  render: (_, r, i) => (
                    <Form.Item name={['allocations', i, 'weight']} noStyle rules={[{ required: true }]}>
                      <InputNumber min={0} max={100} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Email',
                  key: 'email',
                  width: 0,
                  render: (_, r, i) => (
                    <Form.Item name={['allocations', i, 'email']} hidden>
                      <Input />
                    </Form.Item>
                  ),
                },
              ]}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('sales.settings.ratioTip')}
              </Text>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  )
}

// 轻量 Modal 包装
function ModalWrapper(props: {
  open: boolean
  title: string
  onCancel: () => void
  onOk: () => void
  okText: string
  cancelText: string
  children: ReactNode
}) {
  return (
    <Modal
      open={props.open}
      title={props.title}
      onCancel={props.onCancel}
      onOk={props.onOk}
      okText={props.okText}
      cancelText={props.cancelText}
      width={640}
      destroyOnClose
    >
      {props.children}
    </Modal>
  )
}


