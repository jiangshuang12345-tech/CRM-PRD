import { Select } from 'antd'
import { useI18n } from '../i18n'

// 业务线多选筛选（默认勾选账号数据权限内的业务线，可自行增减）
export default function LineFilter({
  value,
  onChange,
  options,
  width = 220,
}: {
  value: string[]
  onChange: (v: string[]) => void
  options: string[]
  width?: number
}) {
  const { t } = useI18n()
  return (
    <Select
      mode="multiple"
      allowClear
      maxTagCount="responsive"
      placeholder={t('user.col.line')}
      style={{ minWidth: width }}
      value={value}
      onChange={onChange}
      options={options.map((l) => ({ label: l, value: l }))}
    />
  )
}
