import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { addLog, setState, uid, useStore } from '../store'
import type { Account, AuditLog, DataScope, ModuleKey, PermLevel, Role } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'

const { Text, Paragraph } = Typography

const LEVEL_META: Record<PermLevel, { color: string }> = {
  none: { color: 'default' },
  view: { color: 'blue' },
  operate: { color: 'green' },
}

const MODULE_HIERARCHY: { key: ModuleKey; sub?: ModuleKey[] }[] = [
  { key: 'users', sub: ['users_edit'] },
  { key: 'sales', sub: ['sales_claim', 'sales_dial', 'sales_update', 'sales_reassign', 'sales_config'] },
  { key: 'orders' },
  { key: 'system', sub: ['system_role_add', 'system_role_edit', 'system_role_delete', 'system_acc_add', 'system_acc_edit'] },
  { key: 'usersV2' },
  { key: 'channels', sub: ['channels_create', 'channels_edit', 'channels_delete', 'channels_gen_code', 'channels_params'] },
  { key: 'landing', sub: ['landing_create', 'landing_delete'] },
  { key: 'packages', sub: ['packages_create', 'packages_edit', 'packages_status'] },
  { key: 'coupons', sub: ['coupons_create', 'coupons_extend', 'coupons_revoke', 'coupons_edit'] },
]

const EMPTY_PERMS = (): Record<ModuleKey, PermLevel> =>
  MODULE_HIERARCHY.flatMap(m => [m.key, ...(m.sub || [])]).reduce(
    (acc, m) => ({ ...acc, [m]: 'none' }),
    {} as Record<ModuleKey, PermLevel>,
  )

type RoleModal = { mode: 'create' } | { mode: 'edit'; role: Role } | null

export default function SystemConfig() {
  const { t } = useI18n()
  const { can, actor } = usePerm()
  const canEditRoles = can('system') === 'operate' || can('system_role_edit') === 'operate'
  const canAddRoles = can('system') === 'operate' || can('system_role_add') === 'operate'
  const canDeleteRoles = can('system') === 'operate' || can('system_role_delete') === 'operate'

  const canEditAcc = can('system') === 'operate' || can('system_acc_edit') === 'operate'
  const canAddAcc = can('system') === 'operate' || can('system_acc_add') === 'operate'
  const roles = useStore((s) => s.roles)
  const accounts = useStore((s) => s.accounts)
  const channels = useStore((s) => s.channels)
  const logs = useStore((s) => s.logs)
  const lines = useMemo(() => channels.map((c) => c.name), [channels])

  const moduleLabel = (m: ModuleKey) => (m.includes('_') ? t(`perm.${m}`) : t(`app.nav.${m}`))
  const levelLabel = (lv: PermLevel) => t(`sys.level.${lv}`)
  const scopeLabel = (sc: DataScope) => t(`sys.scope.${sc}`)
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id

  // ---------- 角色权限新增 / 编辑 ----------
  const [roleModal, setRoleModal] = useState<RoleModal>(null)
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftPerms, setDraftPerms] = useState<Record<ModuleKey, PermLevel>>(EMPTY_PERMS())
  const [draftScope, setDraftScope] = useState<DataScope>('line')

  const openCreateRole = () => {
    setDraftName('')
    setDraftDesc('')
    setDraftPerms(EMPTY_PERMS())
    setDraftScope('line')
    setRoleModal({ mode: 'create' })
  }
  const openEditRole = (r: Role) => {
    setDraftName(r.name)
    setDraftDesc(r.desc)
    setDraftPerms({ ...r.perms })
    setDraftScope(r.dataScope)
    setRoleModal({ mode: 'edit', role: r })
  }
  const saveRole = () => {
    if (!roleModal) return
    if (!draftName.trim()) {
      message.error(t('sys.role.nameRequired'))
      return
    }
    if (roleModal.mode === 'create') {
      const role: Role = {
        id: uid('role_'),
        name: draftName.trim(),
        desc: draftDesc.trim(),
        builtin: false,
        dataScope: draftScope,
        perms: draftPerms,
      }
      setState((prev) => ({ ...prev, roles: [...prev.roles, role] }))
      addLog({ actor, module: 'system', action: 'sys.log.addRole', target: role.name })
      message.success(t('sys.addRoleOk'))
    } else {
      const id = roleModal.role.id
      setState((prev) => ({
        ...prev,
        roles: prev.roles.map((r) =>
          r.id === id
            ? { ...r, name: draftName.trim(), desc: draftDesc.trim(), perms: draftPerms, dataScope: draftScope }
            : r,
        ),
      }))
      addLog({ actor, module: 'system', action: 'sys.log.editRole', target: draftName.trim() })
      message.success(t('sys.saveRoleOk'))
    }
    setRoleModal(null)
  }
  const deleteRole = (r: Role) => {
    const used = accounts.filter((a) => a.roleId === r.id).length
    if (used > 0) {
      message.error(t('sys.role.inUse', { n: used }))
      return
    }
    Modal.confirm({
      title: t('sys.role.delTitle'),
      content: t('sys.role.delContent', { name: r.name }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        setState((prev) => ({ ...prev, roles: prev.roles.filter((x) => x.id !== r.id) }))
        addLog({ actor, module: 'system', action: 'sys.log.delRole', target: r.name })
      },
    })
  }

  const roleColumns: ColumnsType<Role> = [
    {
      title: t('sys.role.col.name'),
      dataIndex: 'name',
      width: 200,
      render: (v, r) => (
        <Space size={6}>
          <Text strong>{v}</Text>
          {r.builtin && <Tag color="geekblue">{t('sys.builtin')}</Tag>}
          {r.planned && <Tag color="orange">{t('sys.planned')}</Tag>}
        </Space>
      ),
    },
    { title: t('sys.role.col.desc'), dataIndex: 'desc', render: (v) => <Text type="secondary">{v}</Text> },
    {
      title: t('sys.scopeLabel'),
      dataIndex: 'dataScope',
      width: 140,
      render: (v: DataScope) => <Tag color={v === 'all' ? 'purple' : 'cyan'}>{scopeLabel(v)}</Tag>,
    },
    {
      title: t('sys.role.col.members'),
      key: 'members',
      width: 80,
      align: 'center',
      render: (_, r) => accounts.filter((a) => a.roleId === r.id).length,
    },
    ...(canEditRoles || canDeleteRoles
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: 160,
            render: (_: unknown, r: Role) => (
              <Space size={0}>
                {canEditRoles && (
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditRole(r)}>
                    {t('sys.editRole')}
                  </Button>
                )}
                {canDeleteRoles && !r.builtin && (
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteRole(r)}>
                    {t('common.delete')}
                  </Button>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ]

  const PHASE3_MODULES = ['usersV2', 'channels', 'landing', 'packages', 'coupons']
  const isPhase3 = (m: string) => PHASE3_MODULES.some(p => m === p || m.startsWith(p + '_'))

  // 权限矩阵：行=模块（主模块+子模块平铺），列=角色
  const matrixData = MODULE_HIERARCHY.flatMap((m) => [m.key, ...(m.sub || [])]).map((m: ModuleKey) => ({ key: m }))

  const matrixColumns: ColumnsType<{ key: ModuleKey }> = [
    {
      title: t('sys.module'),
      dataIndex: 'key',
      fixed: 'left',
      width: 150,
      render: (m: ModuleKey) => {
        const isSub = m.includes('_')
        const p3 = isPhase3(m)
        return (
          <Text strong={!isSub} style={{ marginLeft: isSub ? 16 : 0, color: p3 ? '#bfbfbf' : undefined }}>
            {moduleLabel(m)}
            {p3 && !isSub && <Tag style={{ marginLeft: 6, transform: 'scale(0.8)' }}>{t('app.phase3')}</Tag>}
          </Text>
        )
      },
    },
    ...roles.map((r) => ({
      title: r.name,
      key: r.id,
      width: 130,
      align: 'center' as const,
      render: (_: unknown, row: { key: ModuleKey }) => {
        const lv = r.perms[row.key]
        return <Tag color={LEVEL_META[lv].color}>{levelLabel(lv)}</Tag>
      },
    })),
  ]
  // ---------- 成员账号 ----------
  const [accEditing, setAccEditing] = useState<Account | null>(null)
  const [accOpen, setAccOpen] = useState(false)
  const [form] = Form.useForm()
  const watchRole = Form.useWatch('roleId', form) as string | undefined
  const watchRoleScope = roles.find((r) => r.id === watchRole)?.dataScope

  const openAcc = (a?: Account) => {
    setAccEditing(a ?? null)
    form.resetFields()
    if (a) {
      form.setFieldsValue({
        email: a.email,
        name: a.name,
        roleId: a.roleId,
        businessLines: a.businessLines,
        status: a.status === '启用',
      })
    } else {
      form.setFieldsValue({ status: true })
    }
    setAccOpen(true)
  }
  const submitAcc = async () => {
    const v = await form.validateFields()
    const scope = roles.find((r) => r.id === v.roleId)?.dataScope
    const next: Account = {
      id: accEditing?.id ?? uid('acc_'),
      email: v.email,
      name: v.name,
      roleId: v.roleId,
      businessLines: scope === 'all' ? [] : v.businessLines ?? [],
      status: v.status ? '启用' : '停用',
      lastLogin: accEditing?.lastLogin,
    }
    setState((prev) => ({
      ...prev,
      accounts: accEditing
        ? prev.accounts.map((a) => (a.id === next.id ? next : a))
        : [next, ...prev.accounts],
    }))
    addLog({
      actor,
      module: 'system',
      action: accEditing ? 'sys.log.editAcc' : 'sys.log.addAcc',
      target: next.email,
    })
    message.success(t(accEditing ? 'sys.acc.updateOk' : 'sys.acc.addOk'))
    setAccOpen(false)
  }
  const toggleAcc = (a: Account) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((x) =>
        x.id === a.id ? { ...x, status: x.status === '启用' ? '停用' : '启用' } : x,
      ),
    }))
    addLog({
      actor,
      module: 'system',
      action: a.status === '启用' ? 'sys.log.disableAcc' : 'sys.log.enableAcc',
      target: a.email,
    })
  }

  const accColumns: ColumnsType<Account> = [
    { title: t('sys.acc.col.name'), dataIndex: 'name', width: 140 },
    { title: t('sys.acc.col.email'), dataIndex: 'email', width: 220 },
    {
      title: t('sys.acc.col.role'),
      dataIndex: 'roleId',
      width: 170,
      render: (v) => <Tag color="geekblue">{roleName(v)}</Tag>,
    },
    {
      title: t('sys.acc.col.scope'),
      dataIndex: 'businessLines',
      render: (v: string[], r) => {
        const scope = roles.find((x) => x.id === r.roleId)?.dataScope
        if (scope === 'all') return <Tag color="purple">{scopeLabel('all')}</Tag>
        if (!v.length) return <Text type="secondary">—</Text>
        return (
          <Space size={4} wrap>
            {v.map((l) => (
              <Tag key={l} color="cyan">{l}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: t('sys.acc.col.status'),
      dataIndex: 'status',
      width: 110,
      render: (v: string, r) => (
        <Switch
          size="small"
          disabled={!canEditAcc}
          checked={v === '启用'}
          onChange={() => toggleAcc(r)}
          checkedChildren={t('sys.status.enabled')}
          unCheckedChildren={t('sys.status.disabled')}
        />
      ),
    },
    {
      title: t('sys.acc.col.lastLogin'),
      dataIndex: 'lastLogin',
      width: 170,
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    ...(canEditAcc
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: 90,
            fixed: 'right' as const,
            render: (_: unknown, r: Account) => (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openAcc(r)}>
                {t('common.edit')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  // ---------- 操作日志 ----------
  const logColumns: ColumnsType<AuditLog> = [
    { title: t('sys.log.col.time'), dataIndex: 'time', width: 180 },
    { title: t('sys.log.col.actor'), dataIndex: 'actor', width: 220 },
    {
      title: t('sys.log.col.action'),
      dataIndex: 'action',
      width: 200,
      render: (v: string) => t(v),
    },
    { title: t('sys.log.col.target'), dataIndex: 'target', render: (v) => v || <Text type="secondary">—</Text> },
  ]

  return (
    <Card
      className="page-card"
      bordered={false}
      title={
        <span className="section-title">
          <SafetyOutlined style={{ marginRight: 8 }} />
          {t('sys.title')}
        </span>
      }
    >
      <Alert type="warning" showIcon message={t('phase2.banner')} style={{ marginBottom: 16 }} />
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">{t('sys.intro')}</Text>
      </div>

      <Tabs
        items={[
          {
            key: 'roles',
            label: t('sys.tab.roles'),
            children: (
              <div>
                {canEditAcc && (
                  <div style={{ marginBottom: 12, textAlign: 'right' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>
                      {t('sys.addRole')}
                    </Button>
                  </div>
                )}
                <Table
                  rowKey="id"
                  columns={roleColumns}
                  dataSource={roles}
                  pagination={false}
                  style={{ marginBottom: 24 }}
                />
                <Paragraph strong style={{ marginBottom: 8 }}>
                  {t('sys.matrix.title')}
                </Paragraph>
                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                  <Space size={12} wrap>
                    {(['operate', 'view', 'none'] as PermLevel[]).map((lv) => (
                      <span key={lv}>
                        <Tag color={LEVEL_META[lv].color}>{levelLabel(lv)}</Tag>
                        {t(`sys.level.${lv}.hint`)}
                      </span>
                    ))}
                  </Space>
                </Paragraph>
                <Table
                  rowKey="key"
                  size="small"
                  columns={matrixColumns}
                  dataSource={matrixData}
                  pagination={false}
                  bordered
                  scroll={{ x: 150 + roles.length * 130 }}
                />
              </div>
            ),
          },
          {
            key: 'accounts',
            label: t('sys.tab.accounts'),
            children: (
              <div>
                {canEditAcc && (
                  <div style={{ marginBottom: 12, textAlign: 'right' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openAcc()}>
                      {t('sys.acc.add')}
                    </Button>
                  </div>
                )}
                <Table
                  rowKey="id"
                  columns={accColumns}
                  dataSource={accounts}
                  scroll={{ x: 1000 }}
                  pagination={{ showTotal: (n) => t('common.total', { n }) }}
                />
              </div>
            ),
          },
          {
            key: 'logs',
            label: t('sys.tab.logs'),
            children: (
              <Table
                rowKey="id"
                size="small"
                columns={logColumns}
                dataSource={logs}
                scroll={{ x: 900 }}
                pagination={{ showTotal: (n) => t('common.total', { n }), pageSize: 15 }}
              />
            ),
          },
        ]}
      />

      {/* 新增 / 编辑角色权限 */}
      <Modal
        open={!!roleModal}
        title={roleModal?.mode === 'create' ? t('sys.addRole') : `${t('sys.editRole')} · ${draftName}`}
        onCancel={() => setRoleModal(null)}
        onOk={saveRole}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={580}
        destroyOnClose
      >
        {roleModal && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>{t('sys.role.col.name')}</Text>
            </div>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t('sys.role.namePlaceholder')}
              maxLength={20}
            />
            <div style={{ margin: '12px 0 8px' }}>
              <Text strong>{t('sys.role.col.desc')}</Text>
            </div>
            <Input
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder={t('sys.role.descPlaceholder')}
            />
            <div style={{ margin: '16px 0 8px' }}>
              <Text strong>{t('sys.scopeLabel')}</Text>
              <Tooltip title={t('sys.scopeTip')}>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>?</Text>
              </Tooltip>
            </div>
            <Radio.Group
              value={draftScope}
              onChange={(e) => setDraftScope(e.target.value)}
              options={(['all', 'line'] as DataScope[]).map((sc) => ({ label: scopeLabel(sc), value: sc }))}
              optionType="button"
            />
            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey="key"
              pagination={false}
              dataSource={matrixData.filter((m) => {
                const isSub = m.key.includes('_')
                if (!isSub) return true
                const parentKey = MODULE_HIERARCHY.find((h) => h.sub?.includes(m.key))?.key
                return parentKey ? draftPerms[parentKey] === 'operate' : true
              })}
              columns={[
                { title: t('sys.module'), dataIndex: 'key', render: (m: ModuleKey) => {
                  const isSub = m.includes('_')
                  const p3 = isPhase3(m)
                  return (
                    <span style={{ marginLeft: isSub ? 16 : 0, color: p3 ? '#bfbfbf' : (isSub ? '#8c8c8c' : 'inherit') }}>
                      {isSub ? `└ ${moduleLabel(m)}` : moduleLabel(m)}
                      {p3 && !isSub && <Tag style={{ marginLeft: 6, transform: 'scale(0.8)' }}>{t('app.phase3')}</Tag>}
                    </span>
                  )
                } },
                {
                  title: t('sys.permission'),
                  key: 'lv',
                  width: 280,
                  render: (_, row: { key: ModuleKey }) => {
                    const isSub = row.key.includes('_')
                    return (
                      <Radio.Group
                        size="small"
                        value={draftPerms[row.key]}
                        onChange={(e) => {
                          const val = e.target.value
                          setDraftPerms((prev) => {
                            const next = { ...prev, [row.key]: val }
                            // 当主模块切换为不可操作时，将其下所有子权限重置为 none
                            if (!isSub && val !== 'operate') {
                              const h = MODULE_HIERARCHY.find((x) => x.key === row.key)
                              if (h?.sub) {
                                h.sub.forEach((s) => (next[s] = 'none'))
                              }
                            }
                            return next
                          })
                        }}
                        optionType="button"
                        options={(isSub ? ['none', 'operate'] : ['none', 'view', 'operate'] as PermLevel[]).map((lv) => ({
                          label: levelLabel(lv as PermLevel),
                          value: lv,
                          disabled: row.key === 'orders' && lv === 'operate',
                        }))}
                      />
                    )
                  },
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 新增 / 编辑成员 */}
      <Modal
        open={accOpen}
        title={accEditing ? t('sys.acc.edit') : t('sys.acc.add')}
        onCancel={() => setAccOpen(false)}
        onOk={submitAcc}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item
            name="name"
            label={t('sys.acc.col.name')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <Input placeholder={t('sys.acc.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('sys.acc.col.email')}
            rules={[
              { required: true, message: t('common.pleaseSelect') },
              { type: 'email', message: t('sys.acc.emailInvalid') },
            ]}
          >
            <Input placeholder="name@dinoai.ai" />
          </Form.Item>
          <Form.Item
            name="roleId"
            label={t('sys.acc.col.role')}
            rules={[{ required: true, message: t('common.pleaseSelect') }]}
          >
            <Select
              placeholder={t('common.pleaseSelect')}
              onChange={() => form.setFieldsValue({ businessLines: undefined })}
              options={roles.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item
            name="businessLines"
            label={t('sys.acc.col.scope')}
            tooltip={t('sys.scopeTip')}
            rules={
              watchRoleScope === 'line'
                ? [{ required: true, message: t('common.pleaseSelect') }]
                : []
            }
          >
            <Select
              mode="multiple"
              allowClear
              disabled={watchRoleScope === 'all'}
              placeholder={watchRoleScope === 'all' ? t('sys.scope.all') : t('common.pleaseSelect')}
              options={lines.map((l) => ({ label: l, value: l }))}
            />
          </Form.Item>
          <Form.Item name="status" label={t('sys.acc.col.status')} valuePropName="checked">
            <Switch
              checkedChildren={t('sys.status.enabled')}
              unCheckedChildren={t('sys.status.disabled')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
