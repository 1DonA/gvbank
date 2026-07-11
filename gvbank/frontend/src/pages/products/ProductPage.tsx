import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import {
  ArrowRight, Check, ChevronDown, ChevronUp, ChevronRight,
  // Icons referenced by name in productData.ts
  Smartphone, Bell, ShieldCheck, Globe2, PiggyBank, Target, TrendingUp,
  Plane, CreditCard, Award, Home, Calculator, RefreshCcw, Car, Zap,
  LineChart, Briefcase, User, GraduationCap, BookOpen,
} from 'lucide-react'
import { MarketingHeader } from '../../components/marketing/MarketingHeader'
import { MarketingFooter } from '../../components/marketing/MarketingFooter'
import { PRODUCTS } from './productData'

const ICONS: Record<string, any> = {
  Smartphone, Bell, ShieldCheck, Globe2, PiggyBank, Target, TrendingUp,
  Plane, CreditCard, Award, Home, Calculator, RefreshCcw, Car, Zap,
  LineChart, Briefcase, User, GraduationCap, BookOpen,
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug || !(slug in PRODUCTS)) return <Navigate to="/" replace/>
  const p = PRODUCTS[slug]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader section="personal"/>

      <Hero p={p}/>
      <Benefits p={p}/>
      <Rates p={p}/>
      <Features p={p}/>
      <FAQs p={p}/>
      <Related p={p}/>
      <CTABand p={p}/>

      <MarketingFooter/>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────
function Hero({ p }: any) {
  return (
    <section className={`relative bg-gradient-to-br ${p.heroGradient} text-white overflow-hidden`}>
      <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-white/5 pointer-events-none"/>
      <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-white/5 pointer-events-none"/>

      <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20 relative">
        <p className="text-xs tracking-widest uppercase text-gold-400 font-bold">{p.category}</p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mt-3 leading-tight max-w-3xl">{p.title}</h1>
        <p className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">{p.tagline}</p>

        {p.heroBadge && (
          <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-300 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mt-5">
            ⚡ {p.heroBadge}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={p.primaryCta.to}
            className="px-7 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-xl transition-all flex items-center gap-2 shadow-bank">
            {p.primaryCta.label} <ArrowRight size={16}/>
          </Link>
          {p.secondaryCta && (
            <Link to={p.secondaryCta.to}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-xl transition-all backdrop-blur-sm">
              {p.secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Benefits / key bullets ────────────────────────────────────────────────
function Benefits({ p }: any) {
  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">What you get</p>
        <h2 className="font-serif text-3xl font-bold text-navy-600">Built for how you actually use your money</h2>

        <div className="mt-10 grid sm:grid-cols-2 gap-x-12 gap-y-4">
          {p.bullets.map((b: string) => (
            <div key={b} className="flex items-start gap-3 py-2 border-b border-gray-100">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={14}/>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Rates / pricing table ─────────────────────────────────────────────────
function Rates({ p }: any) {
  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Rates & fees</p>
          <h2 className="font-serif text-3xl font-bold text-navy-600">Clear pricing, no surprises</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {p.rates.map((r: any) => (
            <div key={r.label} className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs uppercase tracking-widest text-gray-500">{r.label}</p>
              <p className="font-serif text-2xl font-bold text-navy-600 mt-2">{r.value}</p>
              {r.sub && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.sub}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features grid ─────────────────────────────────────────────────────────
function Features({ p }: any) {
  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Features</p>
        <h2 className="font-serif text-3xl font-bold text-navy-600">Everything included</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {p.features.map((f: any) => {
            const Icon = ICONS[f.icon] || Check
            return (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-navy-600/40 hover:shadow-bank transition-all">
                <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-4">
                  <Icon size={20}/>
                </div>
                <h3 className="font-serif text-lg font-bold text-navy-600">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{f.blurb}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FAQs ──────────────────────────────────────────────────────────────────
function FAQs({ p }: any) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2 text-center">Common questions</p>
        <h2 className="font-serif text-3xl font-bold text-navy-600 text-center">Frequently asked</h2>

        <div className="mt-8 space-y-3">
          {p.faqs.map((f: any, i: number) => {
            const isOpen = open === i
            return (
              <div key={f.q} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left">
                  <span className="font-semibold text-gray-900">{f.q}</span>
                  {isOpen ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0"/>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Related products ──────────────────────────────────────────────────────
function Related({ p }: any) {
  if (!p.related?.length) return null
  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">You might also like</p>
        <h2 className="font-serif text-3xl font-bold text-navy-600">Other ways to grow with us</h2>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {p.related.map((slug: string) => {
            const r = PRODUCTS[slug]
            if (!r) return null
            return (
              <Link key={slug} to={`/products/${slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-navy-600/40 hover:shadow-bank transition-all">
                <p className="text-xs tracking-widest text-gold-600 uppercase font-bold">{r.category}</p>
                <h3 className="font-serif text-xl font-bold text-navy-600 mt-1">{r.title}</h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{r.tagline}</p>
                <p className="mt-4 text-sm font-semibold text-navy-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Learn more <ChevronRight size={14}/>
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Bottom CTA band ───────────────────────────────────────────────────────
function CTABand({ p }: any) {
  return (
    <section className="py-14 bg-[#0a1628] text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold">Ready to get started?</h2>
        <p className="text-white/70 mt-3 max-w-xl mx-auto">
          Open your account online in about 5 minutes. All you need is your ID and a few minutes of your time.
        </p>
        <div className="mt-7 flex justify-center gap-3 flex-wrap">
          <Link to={p.primaryCta.to}
            className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-xl transition-all flex items-center gap-2">
            {p.primaryCta.label} <ArrowRight size={16}/>
          </Link>
          <Link to="/login"
            className="px-8 py-3.5 border border-white/30 hover:border-white text-white font-semibold rounded-xl transition-all">
            I'm already a customer
          </Link>
        </div>
        {p.disclosure && (
          <p className="mt-10 text-xs text-white/40 max-w-3xl mx-auto leading-relaxed">{p.disclosure}</p>
        )}
      </div>
    </section>
  )
}
