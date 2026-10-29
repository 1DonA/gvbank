import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authAPI, supportAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { OTPInput } from '../components/ui/OTPInput'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Shield, Smartphone, Lock, Mail, AlertTriangle, Phone } from 'lucide-react'

type Step = 'credentials' | 'pin' | 'otp'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState<Step>('credentials')
  const [showPw, setShowPw] = useState(false)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [pin, setPin] = useState<string[]>(Array(4).fill(''))
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } =
    useForm<{ username: string; password: string; remember: boolean }>()

  const completeLogin = async (user: any, access_token: string, device_token?: string) => {
    try {
      setAuth(user, access_token)
      try { await supportAPI.resetMyChat() } catch { /* non-fatal */ }
      toast.success('Welcome back')
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      console.error('Login finalize error', err)
      toast.error('Signed in, but could not open the dashboard. Please refresh.')
    }
  }

  const onCredentials = async (data: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authAPI.loginInit(data)
      setPendingEmail(data.username)

      if (res.data.access_token) {
        await completeLogin(res.data.user, res.data.access_token, res.data.device_token)
        return
      }

      if (res.data.requires_pin) {
        setStep('pin')
        toast(res.data.device_trusted
          ? 'Recognized device — enter your PIN to continue.'
          : 'Enter your 4-digit PIN. We\'ll send a one-time code after.')
        return
      }

      setMaskedEmail(res.data.masked_email || '')
      setStep('otp')
      toast.success(res.data.message)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Sign-in failed. Please try again.')
    } finally { setLoading(false) }
  }

  const onPIN = async () => {
    const pinCode = pin.join('')
    if (pinCode.length < 4) { toast.error('Enter your 4-digit PIN'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginVerifyPin({ username: pendingEmail, pin: pinCode })
      if (res.data.access_token) {
        await completeLogin(res.data.user, res.data.access_token, res.data.device_token)
        return
      }
      setMaskedEmail(res.data.masked_email || '')
      toast.success(res.data.message || 'PIN accepted — check your email')
      setStep('otp')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Incorrect PIN')
      setPin(Array(4).fill(''))
    } finally { setLoading(false) }
  }

  const onOTP = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Please enter the full 6-digit code'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginVerify({ username: pendingEmail, code, purpose: 'login' })
      if (res.data.requires_pin) {
        setStep('pin')
        toast.success(res.data.message || 'Code accepted — enter your PIN')
        return
      }
      await completeLogin(res.data.user, res.data.access_token, res.data.device_token)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Incorrect code')
      setOtp(Array(6).fill(''))
    } finally { setLoading(false) }
  }

  const resend = async () => {
    try {
      await authAPI.resendOTP(pendingEmail, 'login')
      toast.success('A new code is on its way')
    } catch { toast.error('Failed to resend code') }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <LoginHeader/>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4 text-xs text-green-700">
              <Shield size={14}/> Secure connection
            </div>

            {step === 'credentials' && (
              <form onSubmit={handleSubmit(onCredentials)} className="space-y-5" autoComplete="on">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-gray-900">Sign in</h1>
                  <p className="text-sm text-gray-500 mt-1">Enter your username and password.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Username</label>
                  <input type="text" autoFocus autoComplete="username" inputMode="text"
                    name="username" id="username"
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'At least 3 characters' } })}
                    className="input mt-1" placeholder="your username"/>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
                  <div className="relative mt-1">
                    <input type={showPw ? 'text' : 'password'} autoComplete="current-password"
                      {...register('password', { required: 'Password is required' })}
                      className="input pr-10" placeholder="••••••••"/>
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" defaultChecked {...register('remember')} className="accent-navy-600"/>
                    Remember username
                  </label>
                  <Link to="/forgot-password" className="text-navy-600 font-semibold hover:underline">Forgot?</Link>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}

            {step === 'pin' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-3">
                    <Lock size={24} className="text-white"/>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-gray-900">Enter your PIN</h2>
                  <p className="text-sm text-gray-500 mt-1">4-digit transaction PIN</p>
                </div>
                <div className="flex justify-center gap-2">
                  {pin.map((digit, i) => (
                    <input key={i}
                      id={`pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '')
                        const next = [...pin]; next[i] = v; setPin(next)
                        if (v && i < 3) {
                          const el = document.getElementById(`pin-${i+1}`) as HTMLInputElement | null
                          el?.focus()
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !pin[i] && i > 0) {
                          const el = document.getElementById(`pin-${i-1}`) as HTMLInputElement | null
                          el?.focus()
                        }
                      }}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-navy-600 focus:outline-none"/>
                  ))}
                </div>
                <button onClick={onPIN} disabled={loading || pin.join('').length < 4}
                  className="w-full py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Continue'}
                </button>
                <button onClick={() => setStep('credentials')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                  ← Back
                </button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-3">
                    <Smartphone size={24} className="text-white"/>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-gray-900">Enter verification code</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sent to {maskedEmail || 'your email and phone'}
                  </p>
                </div>
                <OTPInput value={otp} onChange={setOtp}/>
                <button onClick={onOTP} disabled={loading || otp.join('').length < 6}
                  className="w-full py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => setStep('credentials')} className="text-gray-500 hover:text-gray-700">← Back</button>
                  <button onClick={resend} className="text-navy-600 font-semibold hover:underline">Resend code</button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18}/>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">Security tip</p>
                <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                  We will never call, email or text you asking for your password or verification code.
                  Contact your account officer if you receive a suspicious message.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LoginFooter/>
    </div>
  )
}

export function LoginHeader() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold text-lg">G</div>
          <div>
            <p className="font-serif text-base font-bold text-navy-600 leading-none">GV Union Bank</p>
            <p className="text-[10px] tracking-widest uppercase text-gold-600">Regulated by BaFin</p>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a href={`tel:+49 000 000 0000`} className="hidden sm:flex items-center gap-1 text-gray-500 hover:text-navy-600">
            <Phone size={14}/> Support
          </a>
          <Link to="/register" className="text-navy-600 font-semibold hover:underline">Open account</Link>
        </div>
      </div>
    </header>
  )
}

export function LoginFooter() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <p className="font-bold text-navy-600 mb-1">Deposit Protection</p>
            <p>Protected up to €100,000 by the German Deposit Protection Scheme.</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1">Contact</p>
            <p className="flex items-center gap-1"><Mail size={11}/> support@gvunionbank.com</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1">Accessibility</p>
            <p>WCAG 2.1 AA compliant.</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1">Report fraud</p>
            <p>Contact your account officer immediately.</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center sm:text-left">
          <p>© 2026 GV Union Bank AG. Regulated by BaFin.</p>
        </div>
      </div>
    </footer>
  )
}
