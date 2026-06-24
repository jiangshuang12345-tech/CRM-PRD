import { useSyncExternalStore } from 'react'

// 业务线筛选：跨「用户中心 / 订单中心」共享，并持久化到 localStorage。
// 实际场景中运营通常只看自己业务线的数据，筛选一次后长期不变。
const KEY = 'dinoai_crm_bizline_filter'
const listeners = new Set<() => void>()
let value: string | undefined = load()

function load(): string | undefined {
  try {
    return localStorage.getItem(KEY) || undefined
  } catch {
    return undefined
  }
}

export function setBizFilter(v: string | undefined) {
  value = v
  try {
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useBizFilter(): string | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => value,
  )
}
