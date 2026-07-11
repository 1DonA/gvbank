import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// ⬇ Change this to your deployed backend URL
export const BASE_URL = 'https://your-backend.railway.app'

const api = axios.create({ baseURL: BASE_URL + '/api' })

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('gv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('gv_token')
      await SecureStore.deleteItemAsync('gv_user')
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  loginInit:   (d: any) => api.post('/auth/login/initiate', d),
  loginVerify: (d: any) => api.post('/auth/login/verify', d),
  resendOTP:   (email: string, purpose: string) => api.post('/otp/resend', { email, purpose }),
}
export const accountsAPI = {
  list:            () => api.get('/accounts/'),
  allTransactions: () => api.get('/transactions/all'),
}
export const transferAPI = {
  initiate: (d: any) => api.post('/transactions/transfer/initiate', d),
  verify:   (d: any) => api.post('/transactions/transfer/verify', d),
}
export const adminAPI = {
  stats:        ()                         => api.get('/admin/stats'),
  users:        ()                         => api.get('/admin/users'),
  blockUser:    (id: string)               => api.patch(`/admin/users/${id}/block`),
  transactions: (status?: string)          => api.get('/admin/transactions', { params: status ? { status } : {} }),
  moderateTx:   (id: string, action: string) => api.patch(`/admin/transactions/${id}`, { action }),
}
