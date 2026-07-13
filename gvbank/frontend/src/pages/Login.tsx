import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI, supportAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { OTPInput } from '../components/ui/OTPInput'
import {
  ShieldCheck, Lock, Smartphone, KeyRound, Eye, EyeOff, Phone, Mail,
  ChevronLeft, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { BRAND } from '../brand'

type Step = 'credentials' | 'pin' | 'otp'

export function LoginPage() {
  const [step, setStep] = useState<Step>('credentials')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [pin, setPin] = useState<string[]>(Array(4).fill(''))
  const [showPw, setShowPw] = useState(false)
  const { setAuth, setPendingEmail, pendingEmail } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, getValues, formState: { errors } } =
    useForm<{ email: string; password: string; remember: boolean }>()

  const onCredentials = async (data: { email: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authAPI.loginInit(data)
      // Admin path
      if (!res.data.requires_otp && !res.data.requires_pin) {
        setAuth(res.data.user, res.data.access_token)
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard')
        return
      }
      setPendingEmail(data.email)
      // PIN required?
      if (res.data.requires_pin) {
        setStep('pin')
        toast('Enter your 4-digit PIN to continue.')
        return
      }
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
      const res = await authAPI.loginVerifyPin({ email: pendingEmail, pin: pinCode })
      toast.success(res.data.message || 'PIN accepted')
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
      const res = await authAPI.loginVerify({ email: pendingEmail, code, purpose: 'login' })
      setAuth(res.data.user, res.data.access_token)
      // Start a fresh support conversation each session — clears any old history.
      try { await supportAPI.resetMyChat() } catch { /* non-fatal */ }
      toast.success('Welcome back')
      navigate('/dashboard')
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

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          {/* Sign-in card */}
          <div>
            <div className="bg-white rounded-2xl shadow-bank-lg p-8 sm:p-10 max-w-xl mx-auto lg:mx-0">
              {step === 'credentials' && (
                <>
                  <div className="flex items-center gap-2 mb-2 text-xs text-green-700">
                    <Lock size={12}/> <span className="font-semibold tracking-wide uppercase">Secure Sign-In · 256-bit Encryption</span>
                  </div>
                  <h1 className="font-serif text-3xl font-bold text-navy-600 mb-1">Sign in to GV Union Bank</h1>
                  <p className="text-sm text-gray-500 mb-7">Access your accounts, move money, and manage cards.</p>

                  <form onSubmit={handleSubmit(onCredentials)} className="space-y-5">
                    <div>
                      <label className="label">Username / Email</label>
                      <input type="email" autoFocus autoComplete="username"
                        {...register('email', { required: 'Email is required' })}
                        className="input" placeholder="your@email.com"/>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label !mb-0">Password</label>
                        <Link to="/forgot-password" className="text-xs text-navy-600 font-semibold hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} autoComplete="current-password"
                          {...register('password', { required: 'Password is required' })}
                          className="input pr-11" placeholder="••••••••"/>
                        <button type="button" onClick={() => setShowPw(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                          {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" defaultChecked {...register('remember')} className="accent-navy-600"/>
                      Remember my username on this device
                    </label>
                    <button type="submit" disabled={loading}
                      className="w-full py-4 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading ? 'Signing in…' : <>Sign In <ArrowRight size={16}/></>}
                    </button>
                  </form>

                  <div className="relative flex items-center py-5">
                    <div className="flex-1 border-t border-gray-200"/>
                    <span className="px-3 text-xs text-gray-400">Other sign-in options</span>
                    <div className="flex-1 border-t border-gray-200"/>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <button className="py-3 border-2 border-gray-200 hover:border-navy-600 text-navy-600 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                      <KeyRound size={14}/> Passwordless
                    </button>
                    <button className="py-3 border-2 border-gray-200 hover:border-navy-600 text-navy-600 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                      <Smartphone size={14}/> Security Token
                    </button>
                  </div>

                  <div className="mt-7 pt-7 border-t border-gray-100 text-sm">
                    <p className="text-gray-500">New customer?</p>
                    <Link to="/register" className="text-navy-600 font-semibold hover:underline">
                      Open an account →
                    </Link>
                  </div>
                </>
              )}

              {step === 'pin' && (
                <>
                  <button onClick={() => setStep('credentials')}
                    className="text-xs text-gray-500 hover:text-navy-600 mb-3 flex items-center gap-1">
                    <ChevronLeft size={12}/> Back to sign in
                  </button>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-4">
                      <KeyRound size={28} className="text-gold-400"/>
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-navy-600 mb-1">Enter your PIN</h2>
                    <p className="text-gray-500 text-sm">Enter your 4-digit transaction PIN to continue.</p>
                    <p className="text-xs text-gray-400 mt-1">{pendingEmail}</p>
                  </div>
                  <div className="flex justify-center gap-3 my-6">
                    {pin.map((digit, i) => (
                      <input
                        key={i}
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
                        className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-navy-600 focus:outline-none"
                      />
                    ))}
                  </div>
                  <button onClick={onPIN} disabled={loading || pin.join('').length < 4}
                    className="w-full py-4 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50 text-sm">
                    {loading ? 'Verifying…' : 'Verify PIN & Continue'}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Forgot your PIN? Call us at <span className="font-mono font-semibold">{BRAND.phone_display}</span>
                  </p>
                </>
              )}

              {step === 'otp' && (
                <>
                  <button onClick={() => setStep('credentials')}
                    className="text-xs text-gray-500 hover:text-navy-600 mb-3 flex items-center gap-1">
                    <ChevronLeft size={12}/> Back to sign in
                  </button>
                  <div className="text-center mb-2">
                    <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck size={28} className="text-gold-400"/>
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-navy-600 mb-1">Verify your identity</h2>
                    <p className="text-gray-500 text-sm">For your security, please enter the 6-digit code we sent.</p>
                    <p className="text-xs text-gray-400 mt-1">{pendingEmail}</p>
                  </div>
                  <OTPInput value={otp} onChange={setOtp}/>
                  <button onClick={onOTP} disabled={loading || otp.join('').length < 6}
                    className="w-full py-4 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50 text-sm">
                    {loading ? 'Verifying…' : 'Verify & Sign in'}
                  </button>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Didn't receive it?{' '}
                    <button onClick={resend} className="text-navy-600 font-semibold hover:underline">Resend code</button>
                  </p>
                  <p className="text-center text-xs text-gray-400 mt-2">Code expires in 10 minutes</p>
                </>
              )}
            </div>

            {/* Trust strip beneath card */}
            <div className="max-w-xl mx-auto lg:mx-0 mt-5 flex items-center justify-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Lock size={12} className="text-green-600"/> Secure</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-green-600"/> FDIC Insured</span>
              <span className="flex items-center gap-1.5">© 2026 GV Union Bank</span>
            </div>
          </div>

          {/* Marketing sidebar */}
          <aside className="hidden lg:block">
            <div className="relative bg-gradient-to-br from-navy-600 via-[#1e3a5f] to-[#3a5d7c] rounded-2xl p-10 text-white overflow-hidden shadow-bank-lg">
              <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold-500/10"/>
              <div className="relative">
                <span className="text-xs tracking-widest uppercase text-gold-400 font-bold">Welcome back</span>
                <h2 className="font-serif text-3xl font-bold mt-3 leading-tight">Banking made for every chapter of your life.</h2>
                <p className="text-white/70 mt-4 leading-relaxed">
                  From your first paycheck to your retirement, we'll be here. Award-winning service,
                  bank-grade security, and tools that actually help you grow.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    { icon: <Lock size={14}/>,        label: '24/7 fraud monitoring with AI alerts' },
                    { icon: <ShieldCheck size={14}/>, label: 'FDIC-insured up to $250,000 per depositor' },
                    { icon: <Smartphone size={14}/>,  label: 'Face ID & Touch ID on supported devices' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 text-sm">
                      <span className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">{s.icon}</span>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18}/>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Security tip</p>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                    We will never call, email or text you asking for your password, verification code, or full
                    Social Security number. If you receive a suspicious message, do not respond — call us at
                    <span className="font-mono font-semibold"> +49 800 GVB-BANK</span> to verify.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <LoginFooter/>
    </div>
  )
}

// ── Small reusable bits ───────────────────────────────────────────────────
export function LoginHeader() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold text-xl shadow-bank">G</div>
          <div>
            <p className="font-serif text-lg font-bold text-navy-600 leading-none">GV Union Bank</p>
            <p className="text-[10px] tracking-widest uppercase text-gold-600">Regulated by BaFin</p>
          </div>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <a href={`tel:${BRAND.phone_tel}`} className="hidden sm:flex items-center gap-1.5 text-gray-600 hover:text-navy-600 transition-colors">
            <Phone size={14}/> <span className="font-semibold">{BRAND.phone_display}</span>
          </a>
          <Link to="/register" className="px-4 py-2 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all">
            Open Account
          </Link>
        </div>
      </div>
    </header>
  )
}

export function LoginFooter() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <p className="font-bold text-navy-600 mb-1.5">EU Deposit Protection</p>
            <p>Deposits protected up to €100,000 per depositor by the German Deposit Protection Scheme (BaFin).</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1.5">Contact us</p>
            <p className="flex items-center gap-1"><Phone size={11}/> +49 800 GVB-BANK</p>
            <p className="flex items-center gap-1"><Mail size={11}/> support@gvunionbank.com</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1.5">Accessibility</p>
            <p>This site complies with WCAG 2.1 AA standards. For TTY: 711.</p>
          </div>
          <div>
            <p className="font-bold text-navy-600 mb-1.5">Report fraud</p>
            <p>Suspect fraud on your account? Call us immediately or report online via our secure portal.</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 GV Union Bank AG. All rights reserved. Regulated by BaFin · Deposit protection up to €100,000.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-navy-600">Privacy</a>
            <a href="#" className="hover:text-navy-600">Terms</a>
            <a href="#" className="hover:text-navy-600">Security</a>
            <a href="#" className="hover:text-navy-600">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
