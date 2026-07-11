import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI, supportAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { OTPInput } from '../components/ui/OTPInput'
import { LoginHeader, LoginFooter } from './Login'
import {
  ChevronLeft, ChevronRight, Check, ShieldCheck, Lock, Info, AlertTriangle,
  Wallet, PiggyBank, User, MapPin, Briefcase, Key, FileCheck, Eye, EyeOff,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'products',  label: 'Account',      icon: <Wallet size={14}/> },
  { id: 'personal',  label: 'Personal',     icon: <User size={14}/> },
  { id: 'identity',  label: 'Identity',     icon: <ShieldCheck size={14}/> },
  { id: 'address',   label: 'Address',      icon: <MapPin size={14}/> },
  { id: 'work',      label: 'Work',         icon: <Briefcase size={14}/> },
  { id: 'security',  label: 'Security',     icon: <Key size={14}/> },
  { id: 'review',    label: 'Review',       icon: <FileCheck size={14}/> },
  { id: 'verify',    label: 'Verify',       icon: <ShieldCheck size={14}/> },
] as const
type StepId = typeof STEPS[number]['id']

interface FormState {
  // Account selection
  open_checking: boolean
  open_savings: boolean
  initial_deposit: string

  // Personal
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string

  // Identity / KYC
  citizenship: string
  ssn_last4: string
  gov_id_type: string
  gov_id_last4: string
  gov_id_state: string

  // Address
  street_1: string
  street_2: string
  city: string
  state: string
  zip_code: string

  // Work & income
  occupation: string
  employer: string
  annual_income: string
  source_of_funds: string

  // Security
  password: string
  confirm_password: string
  security_question: string
  security_answer: string

  // Disclosures
  consent_patriot: boolean
  consent_esign: boolean
  consent_terms: boolean
}

const initialState: FormState = {
  open_checking: true, open_savings: false, initial_deposit: '',
  first_name: '', middle_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
  citizenship: 'us_citizen', ssn_last4: '',
  gov_id_type: 'drivers_license', gov_id_last4: '', gov_id_state: '',
  street_1: '', street_2: '', city: '', state: '', zip_code: '',
  occupation: '', employer: '', annual_income: '50k_100k', source_of_funds: 'employment',
  password: '', confirm_password: '',
  security_question: "What was the name of your first pet?", security_answer: '',
  consent_patriot: false, consent_esign: false, consent_terms: false,
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
  'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]
const INCOME_BUCKETS = [
  { v: 'under_25k', l: 'Under $25,000' },
  { v: '25k_50k',   l: '$25,000 – $50,000' },
  { v: '50k_100k',  l: '$50,000 – $100,000' },
  { v: '100k_200k', l: '$100,000 – $200,000' },
  { v: '200k_500k', l: '$200,000 – $500,000' },
  { v: 'over_500k', l: 'Over $500,000' },
]
const SOURCE_OPTIONS = [
  { v: 'employment',  l: 'Employment / salary' },
  { v: 'business',    l: 'Business income / self-employed' },
  { v: 'investments', l: 'Investments' },
  { v: 'inheritance', l: 'Inheritance / gift' },
  { v: 'savings',     l: 'Personal savings' },
  { v: 'other',       l: 'Other' },
]
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was the model of your first car?",
  "What was the name of your elementary school?",
]

// ──────────────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [stepIdx, setStepIdx] = useState(0)
  const [form, setForm] = useState<FormState>(initialState)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const step = STEPS[stepIdx]
  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))

  const validateAndAdvance = () => {
    const err = validateStep(step.id, form)
    if (err) { toast.error(err); return }
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1))
  }

  const back = () => setStepIdx(i => Math.max(i - 1, 0))

  const submitApplication = async () => {
    setLoading(true)
    try {
      await authAPI.register({
        first_name:   form.first_name.trim(),
        middle_name:  form.middle_name.trim() || null,
        last_name:    form.last_name.trim(),
        email:        form.email.trim(),
        phone:        form.phone.trim(),
        date_of_birth: form.date_of_birth,

        ssn_last4:    form.ssn_last4,
        citizenship:  form.citizenship,
        gov_id_type:  form.gov_id_type,
        gov_id_last4: form.gov_id_last4,
        gov_id_state: form.gov_id_state || null,

        street_1: form.street_1.trim(),
        street_2: form.street_2.trim() || null,
        city:     form.city.trim(),
        state:    form.state,
        zip_code: form.zip_code.trim(),

        occupation:      form.occupation.trim(),
        employer:        form.employer.trim() || null,
        annual_income:   form.annual_income,
        source_of_funds: form.source_of_funds,

        open_checking:   form.open_checking,
        open_savings:    form.open_savings,
        initial_deposit: parseFloat(form.initial_deposit || '0') || 0,

        password:          form.password,
        security_question: form.security_question,
        security_answer:   form.security_answer.trim(),

        consent_patriot: form.consent_patriot,
        consent_esign:   form.consent_esign,
        consent_terms:   form.consent_terms,
      })
      toast.success('Application received. Check your email and phone for the verification code.')
      setStepIdx(STEPS.findIndex(s => s.id === 'verify'))
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Application failed. Please review your entries.')
    } finally { setLoading(false) }
  }

  const submitOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginVerify({ email: form.email.trim(), code, purpose: 'register' })
      setAuth(res.data.user, res.data.access_token)
      try { await supportAPI.resetMyChat() } catch { /* non-fatal */ }
      toast.success('Account opened. Welcome to GV Union Bank!')
      navigate('/dashboard')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Invalid or expired code')
      setOtp(Array(6).fill(''))
    } finally { setLoading(false) }
  }

  const resendOtp = async () => {
    try {
      await authAPI.resendOTP(form.email.trim(), 'register')
      toast.success('A new code has been sent')
    } catch { toast.error('Failed to resend code') }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <LoginHeader/>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Title strip */}
          <div className="text-center mb-7">
            <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-1">Open a Personal Account</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Apply in about 5 minutes</h1>
            <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">
              We're required by federal law to verify the identity of all customers (USA PATRIOT Act §326).
              All information is encrypted and used solely to open and protect your account.
            </p>
          </div>

          {/* Progress stepper */}
          <ProgressStepper stepIdx={stepIdx}/>

          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-bank-lg p-6 sm:p-10 mt-6">
            {step.id === 'products' && <ProductsStep form={form} upd={upd}/>}
            {step.id === 'personal' && <PersonalStep form={form} upd={upd}/>}
            {step.id === 'identity' && <IdentityStep form={form} upd={upd}/>}
            {step.id === 'address'  && <AddressStep form={form} upd={upd}/>}
            {step.id === 'work'     && <WorkStep form={form} upd={upd}/>}
            {step.id === 'security' && <SecurityStep form={form} upd={upd} showPw={showPw} setShowPw={setShowPw}/>}
            {step.id === 'review'   && <ReviewStep form={form} upd={upd}/>}
            {step.id === 'verify'   && (
              <VerifyStep email={form.email} otp={otp} setOtp={setOtp}
                          pending={loading} submit={submitOtp} resend={resendOtp}/>
            )}

            {/* Nav buttons */}
            {step.id !== 'verify' && (
              <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
                <button onClick={back} disabled={stepIdx === 0}
                  className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-30 flex items-center gap-2">
                  <ChevronLeft size={16}/> Back
                </button>
                {step.id !== 'review' ? (
                  <button onClick={validateAndAdvance}
                    className="px-7 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2">
                    Continue <ChevronRight size={16}/>
                  </button>
                ) : (
                  <button onClick={submitApplication} disabled={loading}
                    className="px-7 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 flex items-center gap-2">
                    {loading ? 'Submitting…' : 'Submit Application'} <Check size={16}/>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Trust strip */}
          <div className="text-center mt-6 text-xs text-gray-500 flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1"><Lock size={11} className="text-green-600"/> 256-bit encryption</span>
            <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-green-600"/> FDIC Insured</span>
            <span>Equal Housing Lender</span>
            <Link to="/login" className="text-navy-600 font-semibold hover:underline">Already a customer? Sign in</Link>
          </div>
        </div>
      </main>

      <LoginFooter/>
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────
function ProgressStepper({ stepIdx }: { stepIdx: number }) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex items-center gap-1 min-w-max">
        {STEPS.map((s, i) => {
          const done = i < stepIdx
          const current = i === stepIdx
          return (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${current ? 'bg-navy-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${done ? 'bg-green-500 text-white' :
                    current ? 'bg-navy-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? <Check size={14}/> : i + 1}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${current ? 'text-navy-600' : 'text-gray-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 1: Products ───────────────────────────────────────────────────────
function ProductsStep({ form, upd }: any) {
  return (
    <>
      <StepHeader title="Choose your account(s)"
                  blurb="Open a checking account, a savings account, or both. You can always add more later."/>

      <div className="space-y-3 mb-6">
        <ProductCard
          selected={form.open_checking}
          onClick={() => upd('open_checking', !form.open_checking)}
          title="Total Checking" sub="No monthly fee with qualifying activity"
          highlights={['Free GV debit card', 'Free Zelle', '15,000+ ATMs', 'Online + mobile banking']}
          accent="navy"
          icon={<Wallet size={22}/>}
        />
        <ProductCard
          selected={form.open_savings}
          onClick={() => upd('open_savings', !form.open_savings)}
          title="High-Yield Savings" sub="5.20% APY · No minimum balance"
          highlights={['Earn 5.20% APY on every dollar', 'No monthly fee', 'Up to 6 free withdrawals/month', 'FDIC insured to $250,000']}
          accent="green"
          icon={<PiggyBank size={22}/>}
        />
      </div>

      <div className="border-t border-gray-100 pt-6">
        <label className="label">Opening deposit <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
        <div className="relative max-w-xs">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
          <input type="number" min="0" step="0.01" className="input pl-8 text-xl font-serif"
            value={form.initial_deposit} onChange={e => upd('initial_deposit', e.target.value)} placeholder="0.00"/>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          You can fund your account later via mobile deposit, transfer from another bank, or direct deposit.
        </p>
      </div>
    </>
  )
}

function ProductCard({ selected, onClick, title, sub, highlights, accent, icon }: any) {
  const accents = {
    navy: { ring: 'border-navy-600', bg: 'bg-navy-50', icon: 'bg-navy-600 text-gold-400' },
    green: { ring: 'border-green-600', bg: 'bg-green-50', icon: 'bg-green-600 text-white' },
  } as any
  const a = accents[accent]
  return (
    <button onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-4
        ${selected ? `${a.ring} ${a.bg}` : 'border-gray-100 hover:border-gray-300'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? a.icon : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-serif text-lg font-bold text-gray-900">{title}</h3>
          {selected && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">Selected</span>}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{sub}</p>
        <ul className="mt-3 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-gray-600">
          {highlights.map((h: string) => (
            <li key={h} className="flex items-center gap-1.5"><Check size={11} className="text-green-600 flex-shrink-0"/>{h}</li>
          ))}
        </ul>
      </div>
    </button>
  )
}

// ── Step 2: Personal ───────────────────────────────────────────────────────
function PersonalStep({ form, upd }: any) {
  const maxDob = new Date(Date.now() - 18*365.25*24*60*60*1000).toISOString().slice(0,10)
  return (
    <>
      <StepHeader title="Tell us about yourself" blurb="Use your legal name as it appears on your government ID."/>
      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.6fr_1.2fr] gap-3 mb-4">
        <Field label="First name *">
          <input className="input" value={form.first_name} onChange={e => upd('first_name', e.target.value)} placeholder="John"/>
        </Field>
        <Field label="Middle">
          <input className="input" value={form.middle_name} onChange={e => upd('middle_name', e.target.value)} placeholder="W."/>
        </Field>
        <Field label="Last name *">
          <input className="input" value={form.last_name} onChange={e => upd('last_name', e.target.value)} placeholder="Smith"/>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Email address *">
          <input type="email" className="input" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="your@email.com"/>
        </Field>
        <Field label="Mobile phone * " hint="Used for SMS verification">
          <input type="tel" className="input" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+1 555 123 4567"/>
        </Field>
      </div>
      <Field label="Date of birth * " hint="Must be 18 years or older to open an account">
        <input type="date" className="input max-w-xs" value={form.date_of_birth}
          onChange={e => upd('date_of_birth', e.target.value)} max={maxDob}/>
      </Field>
    </>
  )
}

// ── Step 3: Identity / KYC ────────────────────────────────────────────────
function IdentityStep({ form, upd }: any) {
  return (
    <>
      <StepHeader title="Verify your identity" blurb="Required by the USA PATRIOT Act for all new bank accounts."/>

      <Disclosure tone="info">
        Under federal law, we must collect identifying information for every customer. Your data is encrypted
        and used only to verify your identity. We will never share it with marketers.
      </Disclosure>

      <div className="space-y-4 mt-6">
        <Field label="Citizenship status *">
          <select className="input" value={form.citizenship} onChange={e => upd('citizenship', e.target.value)}>
            <option value="us_citizen">U.S. Citizen</option>
            <option value="us_resident">U.S. Permanent Resident</option>
            <option value="non_resident">Non-Resident Alien</option>
          </select>
        </Field>

        <Field label="Last 4 digits of Social Security Number *"
               hint="We never store your full SSN. Only the last 4 digits are kept for verification.">
          <input type="text" inputMode="numeric" maxLength={4} className="input max-w-[140px] font-mono"
            value={form.ssn_last4}
            onChange={e => upd('ssn_last4', e.target.value.replace(/\D/g,''))}
            placeholder="••••"/>
        </Field>

        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Government-issued ID</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="ID type *">
              <select className="input" value={form.gov_id_type} onChange={e => upd('gov_id_type', e.target.value)}>
                <option value="drivers_license">Driver's License</option>
                <option value="state_id">State ID</option>
                <option value="passport">Passport</option>
              </select>
            </Field>
            <Field label="Last 4 digits of ID *">
              <input type="text" maxLength={4} className="input font-mono"
                value={form.gov_id_last4}
                onChange={e => upd('gov_id_last4', e.target.value.replace(/\D/g,''))}
                placeholder="••••"/>
            </Field>
            {form.gov_id_type !== 'passport' && (
              <Field label="Issuing state">
                <select className="input" value={form.gov_id_state} onChange={e => upd('gov_id_state', e.target.value)}>
                  <option value="">Select…</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Step 4: Address ────────────────────────────────────────────────────────
function AddressStep({ form, upd }: any) {
  return (
    <>
      <StepHeader title="Where do you live?" blurb="We use this for statement delivery and identity verification. P.O. boxes not accepted as primary."/>
      <Field label="Street address *">
        <input className="input" value={form.street_1} onChange={e => upd('street_1', e.target.value)} placeholder="123 Main Street"/>
      </Field>
      <Field label="Apartment, suite, unit (optional)">
        <input className="input" value={form.street_2} onChange={e => upd('street_2', e.target.value)} placeholder="Apt 4B"/>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-3">
        <Field label="City *">
          <input className="input" value={form.city} onChange={e => upd('city', e.target.value)} placeholder="Chicago"/>
        </Field>
        <Field label="State *">
          <select className="input" value={form.state} onChange={e => upd('state', e.target.value)}>
            <option value="">Select…</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="ZIP code *">
          <input className="input font-mono" maxLength={10}
            value={form.zip_code}
            onChange={e => upd('zip_code', e.target.value.replace(/[^\d-]/g,''))}
            placeholder="60601"/>
        </Field>
      </div>
    </>
  )
}

// ── Step 5: Employment / income ───────────────────────────────────────────
function WorkStep({ form, upd }: any) {
  return (
    <>
      <StepHeader title="Employment & income"
                  blurb="Required by the Bank Secrecy Act and anti-money-laundering regulations."/>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Occupation *">
          <input className="input" value={form.occupation} onChange={e => upd('occupation', e.target.value)}
            placeholder="Software Engineer"/>
        </Field>
        <Field label="Employer (optional)">
          <input className="input" value={form.employer} onChange={e => upd('employer', e.target.value)}
            placeholder="ACME Corp."/>
        </Field>
      </div>

      <Field label="Estimated annual income *">
        <select className="input" value={form.annual_income} onChange={e => upd('annual_income', e.target.value)}>
          {INCOME_BUCKETS.map(b => <option key={b.v} value={b.v}>{b.l}</option>)}
        </select>
      </Field>

      <Field label="Primary source of funds *"
             hint="Where will the money in this account primarily come from?">
        <select className="input" value={form.source_of_funds} onChange={e => upd('source_of_funds', e.target.value)}>
          {SOURCE_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </Field>

      <Disclosure tone="info" className="mt-5">
        Tax reporting: under IRS rules we'll request a W-9 or W-8 form via secure message after your account is opened.
      </Disclosure>
    </>
  )
}

// ── Step 6: Security ───────────────────────────────────────────────────────
function SecurityStep({ form, upd, showPw, setShowPw }: any) {
  const strength = pwStrength(form.password)
  return (
    <>
      <StepHeader title="Create your sign-in" blurb="Choose a strong password and a security question for account recovery."/>

      <div className="space-y-4">
        <Field label="Password *">
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input pr-11"
              value={form.password} onChange={e => upd('password', e.target.value)}
              placeholder="At least 8 characters" autoComplete="new-password"/>
            <button type="button" onClick={() => setShowPw((s: boolean) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {form.password && (
            <div className="mt-2">
              <div className="flex gap-1 h-1.5">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`flex-1 rounded ${
                    strength.score >= n
                      ? strength.score === 1 ? 'bg-red-400'
                      : strength.score === 2 ? 'bg-orange-400'
                      : strength.score === 3 ? 'bg-yellow-400'
                      : 'bg-green-500'
                      : 'bg-gray-200'
                  }`}/>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Strength: <span className="font-semibold">{strength.label}</span></p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Use 8+ characters with an uppercase letter, a number, and a symbol.</p>
        </Field>

        <Field label="Confirm password *">
          <input type={showPw ? 'text' : 'password'} className="input"
            value={form.confirm_password} onChange={e => upd('confirm_password', e.target.value)}
            placeholder="Re-enter password" autoComplete="new-password"/>
        </Field>

        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Account recovery</p>
          <Field label="Security question *">
            <select className="input" value={form.security_question} onChange={e => upd('security_question', e.target.value)}>
              {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </Field>
          <Field label="Your answer * " hint="Case-insensitive. You'll use this if you ever lose access to your email and phone.">
            <input className="input" value={form.security_answer} onChange={e => upd('security_answer', e.target.value)}/>
          </Field>
        </div>
      </div>
    </>
  )
}

function pwStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const labels = ['too weak', 'weak', 'fair', 'good', 'strong']
  return { score: s, label: labels[s] }
}

// ── Step 7: Review & disclosures ──────────────────────────────────────────
function ReviewStep({ form, upd }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex items-start justify-between py-2 gap-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right break-words">{value || '—'}</span>
    </div>
  )
  const accountSummary =
    form.open_checking && form.open_savings ? 'Checking + High-Yield Savings'
    : form.open_checking ? 'Total Checking'
    : form.open_savings ? 'High-Yield Savings'
    : 'No accounts selected'

  return (
    <>
      <StepHeader title="Review your application" blurb="Please confirm everything is correct before submitting."/>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <ReviewCard title="Accounts requested">
          <Row label="Products" value={accountSummary}/>
          <Row label="Opening deposit" value={form.initial_deposit ? `$${parseFloat(form.initial_deposit).toFixed(2)}` : '$0.00'}/>
        </ReviewCard>

        <ReviewCard title="Personal information">
          <Row label="Name" value={[form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')}/>
          <Row label="Date of birth" value={form.date_of_birth}/>
          <Row label="Email" value={form.email}/>
          <Row label="Phone" value={form.phone}/>
        </ReviewCard>

        <ReviewCard title="Identity">
          <Row label="Citizenship" value={form.citizenship.replace('_',' ')}/>
          <Row label="SSN (last 4)" value={form.ssn_last4 ? `••• – ${form.ssn_last4}` : ''}/>
          <Row label={`${form.gov_id_type.replace('_',' ')} (last 4)`} value={form.gov_id_last4}/>
        </ReviewCard>

        <ReviewCard title="Address">
          <Row label="Street" value={[form.street_1, form.street_2].filter(Boolean).join(', ')}/>
          <Row label="City, State ZIP" value={[form.city, form.state, form.zip_code].filter(Boolean).join(', ')}/>
        </ReviewCard>

        <ReviewCard title="Employment & income">
          <Row label="Occupation" value={form.occupation}/>
          <Row label="Employer" value={form.employer}/>
          <Row label="Annual income" value={(INCOME_BUCKETS.find(b => b.v === form.annual_income) || {}).l}/>
          <Row label="Source of funds" value={(SOURCE_OPTIONS.find(s => s.v === form.source_of_funds) || {}).l}/>
        </ReviewCard>

        <ReviewCard title="Security">
          <Row label="Password" value={'•'.repeat(Math.max(8, form.password.length))}/>
          <Row label="Security question" value={form.security_question}/>
        </ReviewCard>
      </div>

      {/* Disclosures */}
      <div className="bg-gray-50 rounded-2xl p-5 sm:p-6 space-y-4">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <FileCheck size={16}/> Required disclosures
        </p>
        <ConsentCheckbox checked={form.consent_patriot} onChange={(v: boolean) => upd('consent_patriot', v)}
          title="USA PATRIOT Act Customer Identification Program">
          To help the government fight the funding of terrorism and money laundering, federal law requires us to obtain,
          verify and record information identifying each person who opens an account.
        </ConsentCheckbox>

        <ConsentCheckbox checked={form.consent_esign} onChange={(v: boolean) => upd('consent_esign', v)}
          title="Electronic Disclosure & E-SIGN Consent">
          I agree to receive account documents, disclosures, statements and notices electronically. I confirm
          I have hardware and software that can access PDFs and HTML pages.
        </ConsentCheckbox>

        <ConsentCheckbox checked={form.consent_terms} onChange={(v: boolean) => upd('consent_terms', v)}
          title="Deposit Account Agreement, Truth in Savings & Privacy Policy">
          I have read and agree to the Deposit Account Agreement, Truth in Savings Act disclosures, Fee Schedule,
          and Privacy Notice. I certify that all information provided is true and complete.
        </ConsentCheckbox>
      </div>
    </>
  )
}

function ReviewCard({ title, children }: any) {
  return (
    <div className="border border-gray-100 rounded-2xl p-5">
      <p className="font-semibold text-navy-600 mb-2 text-sm">{title}</p>
      <div>{children}</div>
    </div>
  )
}

function ConsentCheckbox({ checked, onChange, title, children }: any) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-1 accent-navy-600 w-4 h-4 flex-shrink-0"/>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </label>
  )
}

// ── Step 8: Verify OTP ─────────────────────────────────────────────────────
function VerifyStep({ email, otp, setOtp, pending, submit, resend }: any) {
  return (
    <div className="text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-4">
        <ShieldCheck className="text-gold-400" size={28}/>
      </div>
      <h3 className="font-serif text-2xl font-bold text-navy-600 mb-1">Verify your identity</h3>
      <p className="text-gray-500 text-sm mb-1">We sent a 6-digit code to your email and phone.</p>
      <p className="text-xs text-gray-400 mb-6">{email}</p>
      <OTPInput value={otp} onChange={setOtp}/>
      <button onClick={submit} disabled={pending || otp.join('').length < 6}
        className="w-full py-4 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
        {pending ? 'Verifying…' : 'Verify & Activate Account →'}
      </button>
      <p className="text-center text-sm text-gray-500 mt-4">
        Didn't receive it?{' '}
        <button onClick={resend} className="text-navy-600 font-semibold hover:underline">Resend code</button>
      </p>
      <p className="text-center text-xs text-gray-400 mt-2">Code expires in 10 minutes</p>
    </div>
  )
}

// ── Reusable bits ──────────────────────────────────────────────────────────
function StepHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl font-bold text-navy-600">{title}</h2>
      <p className="text-sm text-gray-500 mt-1.5">{blurb}</p>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: any }) {
  return (
    <div className="mb-1">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Disclosure({ tone = 'info', className = '', children }: any) {
  const tones: any = {
    info: { wrap: 'bg-blue-50 border-blue-200', icon: <Info size={16} className="text-blue-600"/>, fg: 'text-blue-900' },
    warn: { wrap: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={16} className="text-amber-600"/>, fg: 'text-amber-900' },
  }
  const t = tones[tone]
  return (
    <div className={`${t.wrap} border rounded-xl p-3 flex items-start gap-2.5 ${className}`}>
      <div className="flex-shrink-0 mt-0.5">{t.icon}</div>
      <p className={`text-xs ${t.fg} leading-relaxed`}>{children}</p>
    </div>
  )
}

// ── Step validation ────────────────────────────────────────────────────────
function validateStep(step: StepId, f: FormState): string | null {
  switch (step) {
    case 'products':
      if (!f.open_checking && !f.open_savings) return 'Please select at least one account type'
      if (f.initial_deposit && parseFloat(f.initial_deposit) < 0) return 'Opening deposit cannot be negative'
      return null
    case 'personal':
      if (!f.first_name.trim() || !f.last_name.trim()) return 'Full legal name is required'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return 'Please enter a valid email'
      if (!/^\+?[\d\s\-()]{7,}$/.test(f.phone)) return 'Please enter a valid phone number'
      if (!f.date_of_birth) return 'Date of birth is required'
      const age = (Date.now() - new Date(f.date_of_birth).getTime()) / (365.25 * 24*60*60*1000)
      if (age < 18) return 'You must be 18 years or older to open an account'
      return null
    case 'identity':
      if (!/^\d{4}$/.test(f.ssn_last4)) return 'Enter the last 4 digits of your SSN'
      if (!/^\d{4}$/.test(f.gov_id_last4)) return 'Enter the last 4 digits of your government ID'
      if (f.gov_id_type !== 'passport' && !f.gov_id_state) return 'Select the issuing state for your ID'
      return null
    case 'address':
      if (!f.street_1.trim()) return 'Street address is required'
      if (!f.city.trim()) return 'City is required'
      if (!f.state) return 'Please select your state'
      if (!/^\d{5}(-\d{4})?$/.test(f.zip_code)) return 'ZIP code must be 5 or 9 digits (e.g. 60601 or 60601-1234)'
      return null
    case 'work':
      if (!f.occupation.trim()) return 'Occupation is required'
      return null
    case 'security':
      if (f.password.length < 8) return 'Password must be at least 8 characters'
      if (!/[A-Z]/.test(f.password) || !/[0-9]/.test(f.password)) {
        return 'Password must contain an uppercase letter and a number'
      }
      if (f.password !== f.confirm_password) return 'Passwords do not match'
      if (!f.security_answer.trim()) return 'Please answer your security question'
      return null
    case 'review':
      if (!f.consent_patriot || !f.consent_esign || !f.consent_terms) {
        return 'All three disclosures must be accepted to open an account'
      }
      return null
    default: return null
  }
}
