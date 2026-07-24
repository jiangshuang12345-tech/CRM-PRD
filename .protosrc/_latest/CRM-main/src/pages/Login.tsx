import { useEffect, useRef, useState } from 'react'
import { Button, Card, Dropdown, Form, Input, Typography, message } from 'antd'
import { GlobalOutlined, MailOutlined, SafetyCertificateOutlined, DownOutlined } from '@ant-design/icons'
import { EMAIL_SUFFIXES, isValidWorkEmail, login } from '../auth'
import { LOGO } from '../logo'
import { LANGS, useI18n } from '../i18n'

const { Text, Title } = Typography

const SUFFIX_LABEL = EMAIL_SUFFIXES.join(' / ')

export default function Login() {
  const { t, lang, setLang } = useI18n()
  const [form] = Form.useForm()
  const [countdown, setCountdown] = useState(0)
  const [sentCode, setSentCode] = useState<string>('')
  const timer = useRef<number>()

  useEffect(() => () => window.clearInterval(timer.current), [])

  const sendCode = async () => {
    try {
      const { email } = await form.validateFields(['email'])
      if (!isValidWorkEmail(email)) {
        message.error(t('login.onlySuffix', { suffix: SUFFIX_LABEL }))
        return
      }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      setSentCode(code)
      message.success(t('login.codeSent', { email, code }))
      setCountdown(60)
      timer.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            window.clearInterval(timer.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch {
      /* validation handled by form */
    }
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (!isValidWorkEmail(values.email)) {
      message.error(t('login.onlySuffix', { suffix: SUFFIX_LABEL }))
      return
    }
    if (!sentCode) {
      message.error(t('login.needCode'))
      return
    }
    if (values.code !== sentCode) {
      message.error(t('login.codeError'))
      return
    }
    message.success(t('login.loginOk'))
    login(values.email)
  }

  const currentLang = LANGS.find((l) => l.value === lang)

  return (
    <div className="login-bg">
      <div style={{ position: 'fixed', top: 20, right: 20 }}>
        <Dropdown
          menu={{
            selectedKeys: [lang],
            items: LANGS.map((l) => ({ key: l.value, label: `${l.flag}  ${l.label}`, onClick: () => setLang(l.value) })),
          }}
        >
          <Button icon={<GlobalOutlined />}>
            {currentLang?.flag} {currentLang?.label} <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      </div>
      <Card style={{ width: 420, boxShadow: '0 12px 40px rgba(31,99,255,0.12)', borderRadius: 16 }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="brand-row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <img src={LOGO} width={38} height={38} alt="logo" />
            <Title level={3} style={{ margin: 0 }}>
              {t('login.brandTitle')}
            </Title>
          </div>
          <Text type="secondary">{t('login.subtitle', { suffix: SUFFIX_LABEL })}</Text>
        </div>

        <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit} style={{ marginTop: 8 }}>
          <Form.Item
            name="email"
            label={t('login.email')}
            rules={[
              { required: true, message: t('login.emailRequired') },
              {
                validator: (_, v) =>
                  isValidWorkEmail(v)
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('login.emailInvalid', { suffix: SUFFIX_LABEL }))),
              },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder={`yourname@${EMAIL_SUFFIXES[0]}`} />
          </Form.Item>

          <Form.Item label={t('login.code')} required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="code" noStyle rules={[{ required: true, message: t('login.codeRequired') }]}>
                <Input size="large" prefix={<SafetyCertificateOutlined />} placeholder={t('login.codePlaceholder')} maxLength={6} />
              </Form.Item>
              <Button size="large" onClick={sendCode} disabled={countdown > 0} style={{ width: 140, flex: '0 0 auto' }}>
                {countdown > 0 ? t('login.resend', { n: countdown }) : t('login.getCode')}
              </Button>
            </div>
          </Form.Item>

          <Button type="primary" size="large" block htmlType="submit" style={{ marginTop: 6 }}>
            {t('login.submitLogin')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}
