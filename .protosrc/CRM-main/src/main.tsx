import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import App from './App'
import './index.css'
import { ANTD_LOCALE, I18nProvider, RTL_LANGS, useI18n } from './i18n'

function ThemedApp() {
  const { lang } = useI18n()
  return (
    <ConfigProvider
      locale={ANTD_LOCALE[lang]}
      direction={RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'}
      theme={{
        token: {
          colorPrimary: '#2F6BFF',
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    >
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemedApp />
    </I18nProvider>
  </React.StrictMode>,
)
