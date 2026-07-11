import { Link } from 'react-router-dom'
import {
  ArrowRight, ChevronRight, Briefcase, Building2, Heart, Globe2,
  Phone, Mail, Award, ShieldCheck, TrendingUp, Users,
} from 'lucide-react'
import { MarketingHeader } from '../components/marketing/MarketingHeader'
import { MarketingFooter } from '../components/marketing/MarketingFooter'

export function WealthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader section="wealth" showProductNav={false}/>
      <Hero/>
      <SubNav/>
      <Approach/>
      <Services/>
      <ForYou/>
      <Insights/>
      <Connect/>
      <MarketingFooter/>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#1a2538] via-[#2c3e5c] to-[#3d5170] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-25">
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-gold-500/15 blur-3xl"/>
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <p className="text-xs tracking-widest text-gold-400 uppercase font-bold mb-3">Private Wealth Management</p>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">Wealth, advised personally.</h1>
        <p className="mt-6 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">
          A senior banker. A dedicated investment team. A trust and estate specialist. One relationship
          that brings together everything that goes into preserving and growing what you've built.
        </p>
        <Link to="#connect" className="mt-10 inline-flex items-center gap-2 px-10 py-4 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold uppercase tracking-widest text-sm transition-all">
          Schedule a consultation <ArrowRight size={16}/>
        </Link>
      </div>
    </section>
  )
}

function SubNav() {
  const links = [
    { label: 'Our approach',       to: '#approach' },
    { label: 'Wealth services',    to: '#services' },
    { label: 'For families & individuals', to: '#for-you' },
    { label: 'Market insights',    to: '#insights' },
    { label: 'Connect with us',    to: '#connect' },
  ]
  return (
    <div className="bg-[#3a4254] text-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        {links.map(l => (
          <a key={l.to} href={l.to}
            className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400"/> {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function Approach() {
  return (
    <section id="approach" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
        <div>
          <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Our approach</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">A bank for life's biggest decisions</h2>
          <p className="text-gray-600 mt-4 leading-relaxed">
            We start with what matters most to you — your family, your business, your legacy — and design
            a plan that brings together banking, lending, investing, and trust services in one place.
          </p>
          <div className="mt-7 space-y-4">
            {[
              { v: '$10M+', l: 'Typical minimum relationship' },
              { v: '1:8',    l: 'Banker-to-client ratio' },
              { v: '24/7',   l: 'Concierge banking support' },
            ].map(s => (
              <div key={s.l} className="flex items-baseline gap-4 border-b border-gray-100 pb-3">
                <p className="font-serif text-2xl font-bold text-navy-600 w-24 flex-shrink-0">{s.v}</p>
                <p className="text-sm text-gray-600">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#f5f1e9] rounded-2xl p-10 lg:p-12">
          <Award className="text-gold-600 mb-4" size={32}/>
          <p className="font-serif text-2xl text-navy-600 leading-snug italic">
            "We don't sell products. We solve problems, often ones our clients haven't yet realized they have."
          </p>
          <p className="mt-5 text-sm font-semibold text-navy-600">Eleanor Vance</p>
          <p className="text-xs text-gray-500">Head of Private Wealth, GV Union Bank</p>
        </div>
      </div>
    </section>
  )
}

function Services() {
  const services = [
    { icon: <TrendingUp size={22}/>, title: 'Investment management',
      blurb: 'Custom portfolios across public and private markets, with strategies tailored to your tax situation and goals.' },
    { icon: <Briefcase size={22}/>, title: 'Banking & lending',
      blurb: 'Premium checking, premium credit, securities-based lending, and mortgages up to $50M.' },
    { icon: <Building2 size={22}/>, title: 'Trust & estate services',
      blurb: 'Estate planning, trustee services, family governance, and generation-skipping strategies.' },
    { icon: <Heart size={22}/>,     title: 'Philanthropy',
      blurb: 'Donor-advised funds, private foundation management, and impact investing strategies.' },
    { icon: <Globe2 size={22}/>,    title: 'International wealth',
      blurb: 'Cross-border planning, multi-currency accounts, and global investment access.' },
    { icon: <ShieldCheck size={22}/>, title: 'Family office services',
      blurb: 'Consolidated reporting, bill pay, household management, and security advisory for ultra-high-net-worth families.' },
  ]
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Wealth services</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">An integrated team for every dimension of your wealth</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {services.map(s => (
            <div key={s.title} className="bg-white rounded-2xl border border-gray-100 p-7 hover:border-navy-600/40 hover:shadow-bank transition-all">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-5">{s.icon}</div>
              <h3 className="font-serif text-lg font-bold text-navy-600">{s.title}</h3>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ForYou() {
  const segments = [
    { tag: 'Entrepreneurs & founders', title: 'Planning around a liquidity event' },
    { tag: 'Multi-generational families', title: 'Governance for the next generation' },
    { tag: 'Executives', title: 'Maximizing concentrated stock positions' },
    { tag: 'Inheritors', title: 'Building confidence as a wealth steward' },
  ]
  return (
    <section id="for-you" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">For families & individuals</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Tailored to where you are in life</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {segments.map(s => (
            <a key={s.tag} href="#" className="group bg-[#f5f1e9] rounded-2xl p-6 hover:bg-[#ece5d4] transition-colors">
              <p className="text-xs tracking-widest text-gold-600 uppercase font-bold">{s.tag}</p>
              <h3 className="font-serif text-lg font-bold text-navy-600 mt-2 leading-snug">{s.title}</h3>
              <p className="mt-4 text-sm font-semibold text-navy-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                Read more <ChevronRight size={14}/>
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function Insights() {
  return (
    <section id="insights" className="py-20 bg-[#0a1628] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-400 uppercase font-bold mb-2">Market insights</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold">Investment thinking from our strategists</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { date: 'June 2026', tag: 'Markets', title: 'Mid-year outlook: navigating a normalizing rate environment' },
            { date: 'May 2026',  tag: 'Tax',     title: 'Tax-efficient withdrawals in retirement' },
            { date: 'April 2026', tag: 'Estate',  title: 'Why now may be the right time to revisit your gifting strategy' },
          ].map(i => (
            <a key={i.title} href="#" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <p className="text-xs text-gold-400 font-semibold tracking-widest uppercase">{i.date} · {i.tag}</p>
              <h3 className="font-serif text-lg font-bold mt-2 leading-snug">{i.title}</h3>
              <p className="mt-4 text-sm font-semibold text-gold-400 flex items-center gap-1">
                Read insight <ChevronRight size={14}/>
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function Connect() {
  return (
    <section id="connect" className="py-20 bg-[#f5f1e9]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Connect with us</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Begin a conversation</h2>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto leading-relaxed">
          A Private Wealth advisor will reach out within one business day to learn about your situation
          and explore how we can help.
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link to="/register" className="px-8 py-3.5 bg-navy-600 hover:bg-[#1e3a5f] text-white font-semibold rounded-xl transition-all flex items-center gap-2">
            Request a consultation <ArrowRight size={16}/>
          </Link>
          <a href="tel:18004826226" className="px-8 py-3.5 border-2 border-navy-600 text-navy-600 hover:bg-navy-50 font-semibold rounded-xl transition-all">
            Call 1-800-GVB-WLTH
          </a>
        </div>
      </div>
    </section>
  )
}
