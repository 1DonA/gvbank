import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { ShieldCheck } from 'lucide-react'

export function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>()

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authAPI.loginInit(data)
      if (res.data.requires_otp) { toast.error('Admin accounts do not use OTP'); return }
      if (res.data.user?.role !== 'admin') { toast.error('Not an admin account'); return }
      setAuth(res.data.user, res.data.access_token)
      toast.success('Admin portal access granted')
      navigate('/admin')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a14] to-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 to-red-500 flex items-center justify-center mb-3 shadow-bank-lg">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-white font-serif text-2xl font-bold">GV Union Bank</h1>
          <p className="text-red-400 text-xs tracking-widest uppercase mt-1">Admin Portal — Restricted Access</p>
        </div>

        <div className="bg-white rounded-3xl shadow-bank-lg p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-red-700 text-xs font-medium">Authorised personnel only. All access is logged and monitored.</p>
          </div>

          <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Admin Sign In</h2>
          <p className="text-gray-500 text-sm mb-7">Enter your administrator credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Admin Email</label>
              <input type="email" {...register('email', { required: 'Required' })}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-red-600 transition-all"
                placeholder="admin@gvunionbank.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
              <input type="password" {...register('password', { required: 'Required' })}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-red-600 transition-all"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-[#0a1628] text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-60 text-sm">
              {loading ? 'Authenticating…' : 'Access Admin Portal →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/login" className="text-sm text-gray-400 hover:text-navy-600">← Customer Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
