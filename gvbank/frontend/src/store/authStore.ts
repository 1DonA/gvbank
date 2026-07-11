import { create } from 'zustand'

/**
 * Auth storage strategy — supports admin + customer signed in at the same time
 * in different tabs of the SAME browser:
 *
 *   Customer session  → localStorage  (persists across tabs, browser restarts)
 *   Admin session     → sessionStorage (per-tab, doesn't leak into other tabs)
 *
 * When we read on hydration, sessionStorage wins if present (this tab is
 * probably an admin tab). Otherwise fall back to localStorage (customer).
 *
 * This means:
 *   - Tab 1: sign in as customer → localStorage.gv_token stored
 *   - Tab 2: sign in as admin → sessionStorage.gv_token stored (Tab 1 unaffected)
 *   - Tab 1 refresh: reads localStorage → still customer
 *   - Tab 2 refresh: reads sessionStorage → still admin
 *   - Close Tab 2: admin session cleared automatically
 */

interface User { id: string; name: string; email: string; phone?: string; role: string }

interface AuthStore {
  user: User | null
  token: string | null
  pendingEmail: string
  transferRef: string
  setAuth: (user: User, token: string) => void
  setPendingEmail: (email: string) => void
  setTransferRef: (ref: string) => void
  logout: () => void
}

function readInitial(): { user: User | null; token: string | null } {
  try {
    // sessionStorage (admin) wins over localStorage (customer) if both present.
    const token =
      sessionStorage.getItem('gv_token') ||
      localStorage.getItem('gv_token') ||
      null
    const rawUser =
      sessionStorage.getItem('gv_user') ||
      localStorage.getItem('gv_user') ||
      'null'
    const user = JSON.parse(rawUser)
    return { user, token }
  } catch {
    return { user: null, token: null }
  }
}

/** Choose which Web Storage to use for a given role. */
function storeFor(role: string): Storage {
  return role === 'admin' ? sessionStorage : localStorage
}

/** Clear tokens from BOTH storages (used on logout / role switch). */
function clearBoth() {
  sessionStorage.removeItem('gv_token')
  sessionStorage.removeItem('gv_user')
  localStorage.removeItem('gv_token')
  localStorage.removeItem('gv_user')
}

const initial = readInitial()

export const useAuthStore = create<AuthStore>((set) => ({
  user: initial.user,
  token: initial.token,
  pendingEmail: '',
  transferRef: '',

  setAuth: (user, token) => {
    // Clear any stale session from the previous role in THIS tab before writing.
    if (user.role === 'admin') {
      // Admin login in this tab shouldn't affect the customer's localStorage
      // (a customer might be signed in in another tab).
      sessionStorage.setItem('gv_token', token)
      sessionStorage.setItem('gv_user', JSON.stringify(user))
    } else {
      localStorage.setItem('gv_token', token)
      localStorage.setItem('gv_user', JSON.stringify(user))
      // If this tab previously held an admin session, drop it.
      sessionStorage.removeItem('gv_token')
      sessionStorage.removeItem('gv_user')
    }
    set({ user, token })
  },

  setPendingEmail: (email) => set({ pendingEmail: email }),
  setTransferRef: (ref) => set({ transferRef: ref }),

  logout: () => {
    // Only clear the storage matching the current role — the other tab
    // (if any) with a different role keeps its session intact.
    const currentRole = (readInitial().user?.role) || 'customer'
    if (currentRole === 'admin') {
      sessionStorage.removeItem('gv_token')
      sessionStorage.removeItem('gv_user')
    } else {
      localStorage.removeItem('gv_token')
      localStorage.removeItem('gv_user')
    }
    set({ user: null, token: null, pendingEmail: '', transferRef: '' })
  },
}))
