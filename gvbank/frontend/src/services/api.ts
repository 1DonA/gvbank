import axios from 'axios'

const api = axios.create({ baseURL: (import.meta as any).env.VITE_API_URL || '/api' })

// Prefer sessionStorage (admin, per-tab) over localStorage (customer, persistent).
// This lets a single browser be signed in as both admin (in one tab) and customer
// (in another tab) at the same time.
function readToken(): string | null {
  return sessionStorage.getItem('gv_token') || localStorage.getItem('gv_token')
}

api.interceptors.request.use(config => {
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Don't redirect on the public auth endpoints — let the page show the error.
      const url: string = err.config?.url || ''
      const isAuthFlow = url.startsWith('/auth/') || url.startsWith('/otp/')
      if (!isAuthFlow) {
        // Clear whichever storage this tab was using and go home.
        const isAdmin = !!sessionStorage.getItem('gv_token')
        sessionStorage.removeItem('gv_token')
        sessionStorage.removeItem('gv_user')
        if (!isAdmin) {
          localStorage.removeItem('gv_token')
          localStorage.removeItem('gv_user')
        }
        window.location.href = isAdmin ? '/admin/login' : '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:     (d: any)                    => api.post('/auth/register', d),
  loginInit:    (d: any)                    => api.post('/auth/login/initiate', d),
  loginVerify:  (d: any)                    => api.post('/auth/login/verify', d),
  forgotPassword: (email: string)           => api.post('/auth/forgot-password', { email }),
  resetPassword:  (d: any)                  => api.post('/auth/reset-password', d),
  resendOTP:    (email: string, purpose: string) =>
    api.post('/otp/resend', { email, purpose }),
}

// ── Customer ────────────────────────────────────────────────────────────────
export const accountsAPI = {
  list:            ()                  => api.get('/accounts/'),
  transactions:    (id: string)        => api.get(`/accounts/${id}/transactions`),
  allTransactions: ()                  => api.get('/transactions/all'),
}

export const transferAPI = {
  initiate:   (d: any) => api.post('/transactions/transfer/initiate', d),
  verify:     (d: any) => api.post('/transactions/transfer/verify', d),
  currencies: ()       => api.get('/transactions/currencies'),
}

export const userAPI = {
  me:             ()       => api.get('/users/me'),
  update:         (d: any) => api.patch('/users/me', d),
  changePassword: (d: any) => api.post('/users/me/password', d),
  uploadAvatar:   (data_url: string) => api.post('/users/me/avatar', { data_url }),
  removeAvatar:   ()       => api.delete('/users/me/avatar'),
  setLanguage:    (language: string) => api.post('/users/me/language', { language }),
  sessions:       ()       => api.get('/users/me/sessions'),
}

// ── Live support chat ──────────────────────────────────────────────────────
export const supportAPI = {
  myChat:         ()               => api.get('/support/my-chat'),
  resetMyChat:    ()               => api.delete('/support/my-chat'),
  send:           (text: string, quick_action?: string) =>
    api.post('/support/send', { text, quick_action }),
  unread:         ()               => api.get('/support/unread'),
  // Admin side
  listChats:      ()               => api.get('/admin/support/chats'),
  getChat:        (id: string)     => api.get(`/admin/support/chats/${id}`),
  reply:          (id: string, text: string) =>
    api.post(`/admin/support/chats/${id}/reply`, { text }),
  toggleResolved: (id: string)     => api.patch(`/admin/support/chats/${id}/resolve`),
  deleteMessage:  (id: string)     => api.delete(`/admin/support/messages/${id}`),
  getSettings:    ()               => api.get('/admin/support/settings'),
  updateSettings: (d: any)         => api.patch('/admin/support/settings', d),
}

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:           ()                       => api.get('/admin/stats'),
  users:           ()                       => api.get('/admin/users'),
  createUser:      (d: any)                 => api.post('/admin/users', d),
  userDetail:      (id: string)             => api.get(`/admin/users/${id}`),
  blockUser:       (id: string)             => api.patch(`/admin/users/${id}/block`),
  updateUser:      (id: string, d: any)     => api.patch(`/admin/users/${id}`, d),
  resetPassword:   (id: string, new_password: string) =>
    api.post(`/admin/users/${id}/password`, { new_password }),
  openAccountForUser: (id: string, d: any)  =>
    api.post(`/admin/users/${id}/accounts`, d),

  accounts:        ()                       => api.get('/admin/accounts'),
  adjustBalance:   (id: string, amount: number) =>
    api.patch(`/admin/accounts/${id}/balance`, { amount }),
  suspendAccount:  (id: string)             => api.patch(`/admin/accounts/${id}/suspend`),
  postTransaction: (account_id: string, d: any) =>
    api.post(`/admin/accounts/${account_id}/post`, d),

  transactions:    (status?: string)        =>
    api.get('/admin/transactions', { params: status ? { status } : {} }),
  moderateTx:      (id: string, action: string, note?: string) =>
    api.patch(`/admin/transactions/${id}`, { action, note }),
  updateTx:        (id: string, payload: { action?: string; posted_at?: string | null; note?: string | null }) =>
    api.patch(`/admin/transactions/${id}`, payload),
  deleteTx:        (id: string)             => api.delete(`/admin/transactions/${id}`),

  setUserAvatar:   (id: string, data_url: string) =>
    api.post(`/admin/users/${id}/avatar`, { data_url }),

  // Login sessions
  listSessions:    (userId: string)               => api.get(`/admin/users/${userId}/sessions`),
  createSession:   (userId: string, payload: any) => api.post(`/admin/users/${userId}/sessions`, payload),
  updateSession:   (sessionId: string, payload: any) => api.patch(`/admin/sessions/${sessionId}`, payload),
  deleteSession:   (sessionId: string)             => api.delete(`/admin/sessions/${sessionId}`),
}
