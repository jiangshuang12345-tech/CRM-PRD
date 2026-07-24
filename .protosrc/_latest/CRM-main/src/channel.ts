import type { ChannelLevelNode, ChannelLine } from './types'

// 依据渠道 code，返回其在渠道树中的完整路径（渠道类型 / 一级 / 二级…），
// 即该 code 归因到的「最低级别渠道」。找不到返回 null。
export function channelPathByCode(channels: ChannelLine[], code?: string): string | null {
  if (!code) return null
  for (const line of channels) {
    for (const tp of line.children) {
      const walk = (nodes: ChannelLevelNode[], names: string[]): string | null => {
        for (const n of nodes) {
          if (n.code === code) return [tp.name, ...names, n.name].join(' / ')
          const deeper = walk(n.children, [...names, n.name])
          if (deeper) return deeper
        }
        return null
      }
      const found = walk(tp.children, [])
      if (found) return found
    }
  }
  return null
}

type ChannelUser = {
  businessLine: string
  registerChannel: string
  channelCode?: string
  channelSource?: string
  country?: string
  adChannel?: string
  subChannel?: string
}

// 渠道来源展示（用户中心一期）：
// 1) 有渠道 code（落地页投放）：展示广告渠道名称；
// 2) 无渠道 code（直接投 App）：展示三方归因「投放渠道 / 子渠道」。
export function channelSourceText(channels: ChannelLine[], s: ChannelUser): string {
  if (s.channelCode) {
    return s.adChannel || channelPathByCode(channels, s.channelCode) || s.registerChannel || '—'
  }
  const parts = [s.adChannel, s.subChannel].filter(Boolean)
  if (parts.length) return parts.join(' / ')
  return s.channelSource || s.registerChannel || '—'
}

export function lpChannelSourceText(channels: ChannelLine[], s: ChannelUser): string {
  if (!s.channelCode) return '—'
  return s.adChannel || channelPathByCode(channels, s.channelCode) || s.registerChannel || '—'
}

export function appChannelSourceText(s: ChannelUser): string {
  if (s.channelCode) return '—'
  const parts = [s.adChannel, s.subChannel].filter(Boolean)
  if (parts.length) return parts.join(' / ')
  return s.channelSource || s.registerChannel || '—'
}

// 业务线展示：CRM 渠道仅用于投放落地页配置，无渠道码（仅投 App）的用户
// 业务线取「注册时的国家」；有落地页渠道码的用户，国家即业务线，二者一致。
export function lineLabel(s: { businessLine: string; country?: string }): string {
  return s.country || s.businessLine
}

// 是否为「有落地页渠道码」的用户（渠道码能在渠道树中解析到实际渠道）
export function hasLandingChannel(channels: ChannelLine[], s: ChannelUser): boolean {
  return !!channelPathByCode(channels, s.channelCode)
}

// 业务线展示：业务线来自渠道归因（CRM 渠道服务于投放落地页）。
// 仅投 App、无渠道码的用户没有渠道归因，业务线可能为空。
export function businessLineOf(channels: ChannelLine[], s: ChannelUser): string {
  return hasLandingChannel(channels, s) ? s.businessLine : ''
}

// 注册渠道/渠道来源展示：
// 1) 有落地页渠道码：解析到最低级别渠道路径；
// 2) 无渠道码（仅投 App）：用线下导表「投放渠道」(channelSource) 回填渠道来源。
export function registerChannelText(channels: ChannelLine[], s: ChannelUser): string {
  const line = lineLabel(s)
  const path = channelPathByCode(channels, s.channelCode)
  if (path) return `${line} · ${path}`
  const source = s.channelSource || s.registerChannel
  return source ? `${line} · ${source}` : line
}
