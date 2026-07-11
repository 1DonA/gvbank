import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { OTPInput } from '../components/ui/OTPInput'
import { LoginHeader, LoginFooter } from './Login'
import { ShieldCheck, ChevronLeft, Mail, Eye, EyeOff } from 'lucide-react'

type Step = 'email' | 'verify' | 'success'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email'); return
    }
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      toast.success('If that email is on file, a reset code has been sent')
      setStep('verify')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const submitReset = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    if (pw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      toast.error('Password must contain an uppercase letter and a number'); return
    }
    if (pw !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authAPI.resetPassword({ email, code, new_password: pw })
      setStep('success')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to reset password')
      setOtp(Array(6).fill(''))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <LoginHeader/>
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="bg-white rounded-2xl shadow-bank-lg p-8 sm:p-10 w-full max-w-xl">
          <Link to="/login" className="text-xs text-gray-500 hover:text-navy-600 mb-4 inline-flex items-center gap-1">
            <ChevronLeft size={12}/> Back to sign in
          </Link>

          {step === 'email' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-navy-50 text-navy-600 flex items-center justify-center mb-5">
                <Mail size={26}/>
              </div>
              <h1 className="font-serif text-3xl font-bold text-navy-600 mb-1">Forgot your password?</h1>
              <p className="text-gray-500 text-sm mb-7">No worries. Enter the email on file and we'll send a 6-digit code to reset your password.</p>

              <form onSubmit={submitEmail} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
                    className="input" placeholder="your@email.com"/>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60">
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-6 leading-relaxed">
                For your security, we'll never tell you whether an email is in our system. If your account exists,
                you'll receive a verification code via email and SMS shortly. Codes expire in 10 minutes.
              </p>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="text-gold-400" size={28}/>
                </div>
                <h1 className="font-serif text-2xl font-bold text-navy-600 mb-1">Enter your reset code</h1>
                <p className="text-gray-500 text-sm">We sent a 6-digit code to <span className="font-mono">{email}</span></p>
              </div>

              <OTPInput value={otp} onChange={setOtp}/>

              <div className="space-y-4 mt-2">
                <div>
                  <label className="label">New password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                      className="input pr-11" placeholder="At least 8 characters" autoComplete="new-password"/>
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Must contain an uppercase letter, a number, and be at least 8 characters.</p>
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="input" autoComplete="new-password"/>
                </div>
                <button onClick={submitReset} disabled={loading}
                  className="w-full py-4 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60">
                  {loading ? 'Updating…' : 'Reset password'}
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h1 className="font-serif text-2xl font-bold text-navy-600 mb-2">Password reset</h1>
              <p className="text-gray-500 text-sm mb-7">Your password has been updated. You can now sign in with the new password.</p>
              <button onClick={() => navigate('/login')}
                className="w-full py-4 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all">
                Continue to sign in →
              </button>
            </div>
          )}
        </div>
      </main>
      <LoginFooter/>
    </div>
  )
}
