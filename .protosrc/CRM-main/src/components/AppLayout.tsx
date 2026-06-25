import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Modal, Typography, Button, Tag } from 'antd'
import {
  ApartmentOutlined,
  TeamOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  TagsOutlined,
  LinkOutlined,
  SafetyOutlined,
  LogoutOutlined,
  DownOutlined,
  RedoOutlined,
  GlobalOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, useSession } from '../auth'
import { resetState, useStore } from '../store'
import { LOGO } from '../logo'
import { LANGS, useI18n } from '../i18n'
import { setIdentity, useCurrentAccount, usePerm } from '../perm'
import type { ModuleKey } from '../types'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const NAV_MODULE: Record<string, ModuleKey> = {
  '/channels': 'channels',
  '/landing': 'landing',
  '/users': 'users',
  '/orders': 'orders',
  '/packages': 'packages',
  '/coupons': 'coupons',
  '/system': 'system',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const { t, lang, setLang } = useI18n()
  const { can } = usePerm()
  const { account, role } = useCurrentAccount()
  const accounts = useStore((s) => s.accounts)
  const roles = useStore((s) => s.roles)

  const phase2Label = (text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {text}
      <Tag color="orange" style={{ margin: 0, lineHeight: '16px', fontSize: 11, padding: '0 5px' }}>
        {t('app.phase2')}
      </Tag>
    </span>
  )

  const ALL_NAV = [
    { key: '/channels', icon: <ApartmentOutlined />, label: t('app.nav.channels') },
    { key: '/users', icon: <TeamOutlined />, label: t('app.nav.users') },
    { key: '/orders', icon: <ProfileOutlined />, label: t('app.nav.orders') },
    { key: '/packages', icon: <AppstoreOutlined />, label: phase2Label(t('app.nav.packages')) },
    { key: '/coupons', icon: <TagsOutlined />, label: phase2Label(t('app.nav.coupons')) },
    { key: '/landing', icon: <LinkOutlined />, label: phase2Label(t('app.nav.landing')) },
    { key: '/system', icon: <SafetyOutlined />, label: phase2Label(t('app.nav.system')) },
  ]
  // 按当前角色权限过滤可见菜单
  const NAV = ALL_NAV.filter((n) => can(NAV_MODULE[n.key]) !== 'none')

  const TITLES: Record<string, string> = {
    '/channels': t('app.nav.channels'),
    '/landing': t('app.nav.landing'),
    '/users': t('app.nav.users'),
    '/orders': t('app.nav.orders'),
    '/packages': t('app.nav.packages'),
    '/coupons': t('app.nav.coupons'),
    '/system': t('app.nav.system'),
  }

  const onLogout = () => {
    Modal.confirm({
      title: t('app.logout.title'),
      content: t('app.logout.content'),
      okText: t('app.logout.ok'),
      cancelText: t('common.cancel'),
      onOk: () => logout(),
    })
  }

  const onReset = () => {
    Modal.confirm({
      title: t('app.reset.title'),
      content: t('app.reset.content'),
      okText: t('app.reset.ok'),
      cancelText: t('common.cancel'),
      onOk: () => resetState(),
    })
  }

  const currentLang = LANGS.find((l) => l.value === lang)

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <img src={LOGO} width={26} height={26} alt="logo" />
          {!collapsed && <span>{t('app.brand')}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            {TITLES[location.pathname] ?? t('app.brand')}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown
              menu={{
                selectedKeys: [account?.id ?? '__default__'],
                style: { maxHeight: 360, overflow: 'auto' },
                items: [
                  {
                    key: '__default__',
                    label: t('perm.identity.default'),
                    onClick: () => setIdentity(null),
                  },
                  { type: 'divider' as const },
                  ...accounts.map((a) => {
                    const r = roles.find((x) => x.id === a.roleId)
                    return {
                      key: a.id,
                      label: (
                        <span>
                          {a.name} · <Text type="secondary">{r?.name}</Text>
                        </span>
                      ),
                      onClick: () => setIdentity(a.id),
                    }
                  }),
                ],
              }}
            >
              <Button type="text" icon={<UserSwitchOutlined />}>
                {account ? account.name : t('perm.identity.default')}
                {role && (
                  <Tag color="geekblue" style={{ marginLeft: 6 }}>
                    {role.name}
                  </Tag>
                )}
                <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                selectedKeys: [lang],
                items: LANGS.map((l) => ({
                  key: l.value,
                  label: `${l.flag}  ${l.label}`,
                  onClick: () => setLang(l.value),
                })),
              }}
            >
              <Button type="text" icon={<GlobalOutlined />}>
                {currentLang?.flag} {currentLang?.label} <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: 'reset', icon: <RedoOutlined />, label: t('app.menu.resetData'), onClick: onReset },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('app.menu.logout'), danger: true, onClick: onLogout },
                ],
              }}
            >
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ background: '#2F6BFF' }}>{session?.email?.[0]?.toUpperCase()}</Avatar>
                <Text>{session?.email}</Text>
                <DownOutlined style={{ fontSize: 12, color: '#999' }} />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 20, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
