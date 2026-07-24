import { useSyncExternalStore } from 'react'

const KEY = 'dinoai_crm_session'

type Session = { email: string } | null

const listeners = new Set<() => void>()

function read(): Session {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

let session: Session = read()

function emit() {
  listeners.forEach((l) => l())
}

export function login(email: string) {
  session = { email }
  localStorage.setItem(KEY, JSON.stringify(session))
  emit()
}

export function logout() {
  session = null
  localStorage.removeItem(KEY)
  emit()
}

export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => session,
  )
}

export const EMAIL_SUFFIXES = ['dinoai.ai']

export function isValidWorkEmail(email?: string) {
  if (!email) return false
  const lower = email.toLowerCase()
  return EMAIL_SUFFIXES.some(
    (suffix) => lower.endsWith(`@${suffix}`) && lower.length > suffix.length + 1,
  )
}
