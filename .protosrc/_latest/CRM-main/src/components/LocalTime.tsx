import { Typography } from 'antd'
import { toLocalTime, tzLabel } from '../time'

const { Text } = Typography

// 按用户注册国家换算后的当地时间展示
export default function LocalTime({ time, country }: { time?: string; country?: string }) {
  if (!time) return <Text type="secondary">—</Text>
  return (
    <span>
      {toLocalTime(time, country)}{' '}
      <Text type="secondary" style={{ fontSize: 12 }}>
        {tzLabel(country)}
      </Text>
    </span>
  )
}
