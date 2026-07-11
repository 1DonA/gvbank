import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI, supportAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { OTPInput } from '../components/ui/OTPInput'
import { MarketingHeader } from '../components/marketing/MarketingHeader'
import { MarketingFooter } from '../components/marketing/MarketingFooter'
import {
  ShieldCheck, Lock, Smartphone, Globe2, Award, ArrowRight,
  CreditCard, PiggyBank, Home, Car, LineChart, GraduationCap, Plane, Wallet,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
// Top-level landing page
// ──────────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingHeader section="personal"/>
      <Hero />
      <ProductsGrid />
      <FeatureStrip />
      <PromoStrips />
      <SecurityBlock />
      <MarketingFooter />
    </div>
  )
}

// ── Utility bar (Personal | Business | Wealth, plus customer service) ─────
function UtilityBar() {
  return (
    <div className="hidden md:block bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs">
        <div className="flex">
          {[
            { label: 'Personal',   active: true },
            { label: 'Business',   active: false },
            { label: 'Wealth Management', active: false },
            { label: 'Commercial', active: false },
          ].map(t => (
            <button key={t.label}
              className={`px-3 py-2.5 font-semibold tracking-wide transition-colors ${
                t.active
                  ? 'text-navy-600 border-b-2 border-navy-600'
                  : 'text-gray-500 hover:text-navy-600 border-b-2 border-transparent'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5 text-gray-500">
          <a href="#" className="hover:text-navy-600">Schedule a meeting</a>
          <a href="#" className="hover:text-navy-600 flex items-center gap-1">
            Customer service <ChevronDown size={12}/>
          </a>
          <a href="#" className="hover:text-navy-600">Español</a>
        </div>
      </div>
    </div>
  )
}

// ── Main header (logo + product nav) ───────────────────────────────────────
const NAV = [
  { label: 'Checking',         icon: <Wallet size={14}/> },
  { label: 'Savings & CDs',    icon: <PiggyBank size={14}/> },
  { label: 'Credit cards',     icon: <CreditCard size={14}/> },
  { label: 'Home loans',       icon: <Home size={14}/> },
  { label: 'Auto',             icon: <Car size={14}/> },
  { label: 'Investing',        icon: <LineChart size={14}/> },
  { label: 'Education',        icon: <GraduationCap size={14}/> },
  { label: 'Travel',           icon: <Plane size={14}/> },
]

function MainHeader() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold text-xl shadow-bank">G</div>
          <div className="hidden sm:block">
            <p className="font-serif text-xl font-bold text-navy-600 leading-none">GV Union Bank</p>
            <p className="text-[10px] tracking-widest uppercase text-gold-600">Member FDIC</p>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
          {NAV.map(n => (
            <a key={n.label} href="#products"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-navy-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/login"
            className="hidden sm:inline-block text-sm font-semibold text-navy-600 hover:underline">
            Sign in
          </Link>
          <Link to="/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-navy-600 text-white hover:bg-[#1e3a5f] transition-all">
            Open Account
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Hero with embedded sign-in widget ──────────────────────────────────────
function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#f3efe7] via-[#ece5d4] to-[#e0d3b8] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
        {/* Left: promo */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-600 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4">
            ⚡ Limited-Time Offer
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-600 leading-tight">
            Earn <span className="line-through text-gray-400 decoration-2">75,000</span>{' '}
            <span className="text-gold-600">100,000</span> bonus points
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-700 max-w-xl">
            Enjoy benefits like <strong>5× points on GV Travel</strong>, <strong>3× on gas and groceries</strong>,
            and complimentary airport lounge access at over 1,300 lounges worldwide.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="px-7 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-xl transition-all flex items-center gap-2 shadow-bank">
              See details <ArrowRight size={16}/>
            </button>
            <button className="px-7 py-3.5 bg-white hover:bg-gray-50 text-navy-600 font-semibold rounded-xl transition-all border border-navy-600/20">
              Compare cards
            </button>
          </div>

          {/* Decorative credit card mock */}
          <div className="mt-10 hidden md:block">
            <PromoCard />
          </div>
        </div>

        {/* Right: sign-in widget */}
        <div className="lg:justify-self-end w-full max-w-md">
          <SignInWidget />
        </div>
      </div>

      {/* Decorative blob */}
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none"/>
    </section>
  )
}

// ── Decorative card mock ───────────────────────────────────────────────────
function PromoCard() {
  return (
    <div className="relative w-80 aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-navy-600 via-[#1e3a5f] to-[#3a5d7c] text-white p-5 shadow-bank-lg rotate-[-4deg] hover:rotate-0 transition-transform">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white"/>
      </div>
      <div className="relative flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <p className="text-xs tracking-widest text-white/70 uppercase">Sapphire Preferred</p>
          <div className="w-10 h-7 rounded bg-gradient-to-br from-gold-500 to-gold-400"/>
        </div>
        <div>
          <p className="font-mono text-base tracking-[0.18em]">•••• •••• •••• 3274</p>
          <div className="flex justify-between items-end mt-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/50">Card holder</p>
              <p className="text-xs font-semibold uppercase">D. Barrett</p>
            </div>
            <p className="text-xl font-serif italic text-white/90">VISA</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline sign-in widget ─────────────────────────────────────────────────
function SignInWidget() {
  const navigate = useNavigate()
  const { setAuth, setPendingEmail, pendingEmail } = useAuthStore()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)

  const submitCreds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Username and password required'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginInit({ email: form.email, password: form.password })
      if (!res.data.requires_otp) {
        setAuth(res.data.user, res.data.access_token)
        navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard')
        return
      }
      setPendingEmail(form.email)
      setStep('otp')
      toast.success(res.data.message || 'Verification code sent')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Sign-in failed')
    } finally { setLoading(false) }
  }

  const submitOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      const res = await authAPI.loginVerify({ email: pendingEmail || form.email, code, purpose: 'login' })
      setAuth(res.data.user, res.data.access_token)
      try { await supportAPI.resetMyChat() } catch { /* non-fatal */ }
      toast.success('Signed in')
      navigate('/dashboard')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Invalid code')
      setOtp(Array(6).fill(''))
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-bank-lg p-7 border border-gray-100">
      {step === 'credentials' ? (
        <form onSubmit={submitCreds} className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-navy-600">Sign In</h3>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Username</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border-0 border-b-2 border-gray-200 focus:border-navy-600 px-1 py-2.5 outline-none text-sm transition-colors"
              placeholder="your@email.com"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full border-0 border-b-2 border-gray-200 focus:border-navy-600 px-1 py-2.5 outline-none text-sm transition-colors"
              placeholder="••••••••"/>
          </div>
          <label className="flex items-center justify-between text-xs pt-1">
            <span className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" checked={form.remember} onChange={e => setForm({...form, remember: e.target.checked})}
                className="accent-navy-600"/>
              Remember username
            </span>
            <a href="#" className="text-navy-600 font-semibold hover:underline">Use token</a>
          </label>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="relative flex items-center py-1">
            <div className="flex-1 border-t border-gray-200"/>
            <span className="px-3 text-xs text-gray-400">Or</span>
            <div className="flex-1 border-t border-gray-200"/>
          </div>
          <button type="button"
            className="w-full py-3.5 border-2 border-navy-600 text-navy-600 hover:bg-navy-50 font-semibold rounded-xl text-sm transition-all">
            Passwordless sign in
          </button>
          <div className="flex justify-between text-xs pt-2 border-t border-gray-100">
            <a href="#" className="text-navy-600 font-semibold hover:underline">Forgot username/password</a>
            <Link to="/register" className="text-navy-600 font-semibold hover:underline">Enroll</Link>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setStep('credentials')}
            className="text-xs text-gray-500 hover:text-navy-600">← Back</button>
          <div>
            <h3 className="font-serif text-xl font-bold text-navy-600">Verify Identity</h3>
            <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email and phone.</p>
          </div>
          <OTPInput value={otp} onChange={setOtp}/>
          <button onClick={submitOtp} disabled={loading || otp.join('').length < 6}
            className="w-full py-3.5 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
            {loading ? 'Verifying…' : 'Verify & Sign in'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Products grid (3-column featured) ─────────────────────────────────────
function ProductsGrid() {
  const products = [
    { slug: 'checking', tag: 'Checking', title: 'Total Checking', blurb: 'Easy access, no monthly fee with qualifying activity. $300 bonus for new customers.',
      cta: 'Open in minutes', color: 'from-navy-600 to-[#1e3a5f]', icon: <Wallet size={22}/> },
    { slug: 'savings',  tag: 'Savings',  title: 'High-Yield Savings', blurb: 'Earn up to 5.20% APY on balances. FDIC-insured up to $250,000.',
      cta: 'Start earning', color: 'from-[#1a4a3a] to-[#2a7a5a]', icon: <PiggyBank size={22}/> },
    { slug: 'credit-cards', tag: 'Credit Card', title: 'Sapphire Preferred', blurb: '100,000 bonus points after $4K spend. 5× on travel, 3× on dining and groceries.',
      cta: 'Apply now', color: 'from-[#5a3a8a] to-[#8a5ac0]', icon: <CreditCard size={22}/> },
  ]
  return (
    <section id="products" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-1">Banking that fits your life</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Explore our products</h2>
          </div>
          <Link to="/products/checking" className="text-sm font-semibold text-navy-600 hover:underline flex items-center gap-1">
            See all accounts <ArrowRight size={14}/>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {products.map(p => (
            <Link key={p.title} to={`/products/${p.slug}`}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.color} text-white p-7 shadow-bank hover:shadow-bank-lg transition-all block`}>
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5"/>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-gold-400">
                  {p.icon}
                </div>
                <p className="text-xs tracking-widest text-white/60 uppercase">{p.tag}</p>
                <h3 className="font-serif text-2xl font-bold mt-1">{p.title}</h3>
                <p className="text-white/80 text-sm mt-3 leading-relaxed">{p.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-600 text-sm font-semibold rounded-xl transition-all">
                  {p.cta} <ArrowRight size={14}/>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Secondary product strip */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { icon: <Home size={18}/>,         label: 'Home loans',  blurb: 'Mortgage rates from 6.49%',     slug: 'home-loans' },
            { icon: <Car size={18}/>,          label: 'Auto loans',  blurb: 'Pre-qualify with no impact',    slug: 'auto' },
            { icon: <LineChart size={18}/>,    label: 'Investing',   blurb: 'Self-directed & advised',       slug: 'investing' },
            { icon: <GraduationCap size={18}/>,label: 'Education',   blurb: 'Plan for college costs',        slug: 'education' },
          ].map(s => (
            <Link key={s.label} to={`/products/${s.slug}`} className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center gap-3 transition-all">
              <div className="w-10 h-10 rounded-lg bg-white text-navy-600 flex items-center justify-center flex-shrink-0">{s.icon}</div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-500">{s.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Feature strip (FDIC, Mobile, Security, Travel) ─────────────────────────
function FeatureStrip() {
  const features = [
    { icon: <ShieldCheck size={20}/>, title: 'FDIC Insured', blurb: 'Deposits protected up to $250,000 per depositor.' },
    { icon: <Lock size={20}/>,        title: '24/7 Fraud Monitoring', blurb: 'AI-powered alerts the moment something looks off.' },
    { icon: <Smartphone size={20}/>,  title: 'Award-winning App', blurb: '4.9★ on the App Store. Deposit checks, send Zelle, manage cards.' },
    { icon: <Globe2 size={20}/>,      title: '15,000+ ATMs', blurb: 'Fee-free withdrawals at our nationwide network.' },
  ]
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-xs tracking-widest text-gold-600 uppercase font-bold">Why GV Union Bank</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600 mt-1">A bank you can trust</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-navy-600/40 hover:shadow-bank transition-all">
              <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-serif text-lg font-bold text-navy-600">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Promo strips (two side-by-side promos) ─────────────────────────────────
function PromoStrips() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-5">
        <div className="relative bg-gradient-to-br from-[#3a5d7c] to-navy-600 rounded-2xl text-white p-10 overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-gold-500/15"/>
          <div className="relative">
            <Award className="text-gold-400 mb-4" size={32}/>
            <p className="text-xs tracking-widest uppercase text-white/60">For high-balance customers</p>
            <h3 className="font-serif text-3xl font-bold mt-2">Private Wealth Banking</h3>
            <p className="text-white/80 mt-3 max-w-md">Dedicated relationship manager, fee waivers, premium credit lines and concierge service.</p>
            <Link to="/wealth" className="mt-6 inline-block px-6 py-3 bg-white text-navy-600 font-semibold rounded-xl hover:bg-gray-50 transition-all">
              Learn more →
            </Link>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-[#1a4a3a] to-[#2a7a5a] rounded-2xl text-white p-10 overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10"/>
          <div className="relative">
            <PiggyBank className="text-white/90 mb-4" size={32}/>
            <p className="text-xs tracking-widest uppercase text-white/60">Limited-time bonus</p>
            <h3 className="font-serif text-3xl font-bold mt-2">Earn $300 when you open a checking account</h3>
            <p className="text-white/80 mt-3 max-w-md">Direct-deposit qualifying paychecks within 90 days to claim your bonus.</p>
            <Link to="/products/checking" className="mt-6 inline-block px-6 py-3 bg-white text-[#1a4a3a] font-semibold rounded-xl hover:bg-gray-50 transition-all">
              See offer details →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Security block ─────────────────────────────────────────────────────────
function SecurityBlock() {
  return (
    <section className="py-16 bg-[#0a1628] text-white">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[1fr_1.4fr] gap-10 items-center">
        <div>
          <p className="text-xs tracking-widest text-gold-400 uppercase font-bold">Security commitment</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2">Your money is protected.</h2>
          <p className="text-white/70 mt-4 leading-relaxed">
            Bank-grade encryption, biometric sign-in, and round-the-clock fraud monitoring.
            If you don't recognize a transaction, we'll work with you to investigate and reimburse eligible cases.
          </p>
          <button className="mt-6 px-6 py-3 border border-white/30 hover:border-white text-white font-semibold rounded-xl transition-all">
            See our pledge →
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: <Lock size={18}/>,        title: 'AES-256 encryption', sub: 'For data at rest and in transit' },
            { icon: <ShieldCheck size={18}/>, title: 'Two-factor auth',    sub: 'Required for every sign-in and transfer' },
            { icon: <Smartphone size={18}/>,  title: 'Biometric login',    sub: 'Face ID and Touch ID on supported devices' },
            { icon: <Globe2 size={18}/>,      title: 'Zero liability',     sub: 'Protection on unauthorized debit charges' },
          ].map(s => (
            <div key={s.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center mb-3">{s.icon}</div>
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-white/60 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Personal', links: ['Checking', 'Savings & CDs', 'Credit cards', 'Home loans', 'Auto loans', 'Investing'] },
    { title: 'Business', links: ['Business checking', 'Credit cards', 'Merchant services', 'Lending', 'Payroll'] },
    { title: 'About',    links: ['Newsroom', 'Careers', 'Investor relations', 'Sustainability', 'Our heritage'] },
    { title: 'Help',     links: ['Customer service', 'Branch locator', 'Lost or stolen card', 'Accessibility', 'Site map'] },
  ]
  return (
    <footer className="bg-white border-t border-gray-200 pt-14 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-100">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold">G</div>
              <div>
                <p className="font-serif font-bold text-navy-600 leading-none">GV Union Bank</p>
                <p className="text-[10px] tracking-widest text-gold-600 uppercase">Member FDIC</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              Serving customers across all 50 states. Equal Housing Lender.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-500">
              <p className="flex items-center gap-2"><Phone size={13}/> 1-800-GVB-BANK</p>
              <p className="flex items-center gap-2"><Mail size={13}/> support@gvunionbank.com</p>
              <p className="flex items-center gap-2"><MapPin size={13}/> Chicago, IL · New York, NY</p>
            </div>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <p className="font-bold text-sm text-navy-600 mb-3">{c.title}</p>
              <ul className="space-y-2 text-sm text-gray-500">
                {c.links.map(l => <li key={l}><a href="#" className="hover:text-navy-600 transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 GV Union Bank, N.A. All rights reserved. Investment and insurance products: Not a deposit · Not FDIC insured · May lose value.</p>
          <div className="flex gap-4">
            <Link to="/admin/login" className="hover:text-navy-600">Admin Portal</Link>
            <a href="#" className="hover:text-navy-600">Privacy</a>
            <a href="#" className="hover:text-navy-600">Terms</a>
            <a href="#" className="hover:text-navy-600">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
