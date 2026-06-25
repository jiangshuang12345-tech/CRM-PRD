import { useSyncExternalStore } from 'react'
import { useStore } from './store'
import { useSession } from './auth'
import type { Account, ModuleKey, PermLevel, Role } from './types'

// 当前“以谁的身份查看”（用于在原型中模拟不同角色）。持久化到 localStorage。
const KEY = 'dinoai_crm_identity'
const listeners = new Set<() => void>()
let currentId: string | null = load()

function load(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setIdentity(id: string | null) {
  currentId = id
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useIdentityId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => currentId,
  )
}

// 解析当前账号：优先使用手动切换的身份，其次按登录邮箱匹配账号。
export function useCurrentAccount(): { account: Account | null; role: Role | null } {
  const id = useIdentityId()
  const accounts = useStore((s) => s.accounts)
  const roles = useStore((s) => s.roles)
  const session = useSession()

  let acc: Account | undefined = id ? accounts.find((a) => a.id === id) : undefined
  if (!acc && session) acc = accounts.find((a) => a.email === session.email)
  const role = acc ? roles.find((r) => r.id === acc!.roleId) ?? null : null
  return { account: acc ?? null, role }
}

export function usePerm() {
  const { account, role } = useCurrentAccount()
  const session = useSession()

  // role 为空（任意工作邮箱登录、未匹配账号）时，按超级管理员处理，保证原型可用。
  const can = (m: ModuleKey): PermLevel => (role ? role.perms[m] : 'operate')
  const isOperate = (m: ModuleKey) => can(m) === 'operate'

  // 数据范围：null 表示全部业务线；否则仅允许这些业务线。
  const allowedLines = (): string[] | null => {
    if (!role) return null
    if (role.dataScope === 'all') return null
    return account?.businessLines ?? []
  }

  const actor = account?.email ?? session?.email ?? 'admin@dinoai.ai'

  return { account, role, can, isOperate, allowedLines, actor }
}
