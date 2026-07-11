import { Link } from 'react-router-dom'
import {
  ArrowRight, Building2, Banknote, TrendingUp, ShieldCheck, Globe2,
  Briefcase, Users, ChevronRight, Mail, Phone,
} from 'lucide-react'
import { MarketingHeader } from '../components/marketing/MarketingHeader'
import { MarketingFooter } from '../components/marketing/MarketingFooter'

export function CommercialPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader section="commercial" showProductNav={false}/>
      <Hero/>
      <SubNav/>
      <Solutions/>
      <WhoWeServe/>
      <ClientStories/>
      <StayConnected/>
      <MarketingFooter/>
    </div>
  )
}

// ── Hero (dark image background with title and Contact CTA) ────────────────
function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#1a1f2e] via-[#0a1628] to-[#1e3a5f] text-white overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-gold-500/10 blur-3xl"/>
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl"/>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">Commercial Banking</h1>
        <p className="mt-6 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">
          Explore our credit, financing, treasury and payments solutions for businesses of all sizes —
          including commercial real estate. Get industry-specific guidance from local bankers, backed by
          the strength and stability of GV Union Bank.
        </p>
        <Link to="#contact"
          className="mt-10 inline-flex items-center gap-2 px-10 py-4 bg-[#3d99b8] hover:bg-[#5db8d4] text-white font-semibold uppercase tracking-widest text-sm transition-all">
          Contact us <ArrowRight size={16}/>
        </Link>
      </div>
    </section>
  )
}

// ── Sub-nav (anchor links to sections) ─────────────────────────────────────
function SubNav() {
  const links = [
    { label: 'Commercial Banking solutions', to: '#solutions' },
    { label: 'Who we serve',                 to: '#who' },
    { label: 'Client stories and insights',  to: '#stories' },
    { label: 'Stay connected',               to: '#contact' },
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

// ── Solutions grid ─────────────────────────────────────────────────────────
function Solutions() {
  const solutions = [
    { icon: <Banknote size={22}/>, title: 'Credit & financing',
      blurb: 'Asset-based lending, revolving credit, term loans, and syndicated facilities up to $5 billion.' },
    { icon: <Building2 size={22}/>, title: 'Commercial real estate',
      blurb: 'Construction loans, permanent financing, and bridge facilities for multifamily, industrial, office, and retail.' },
    { icon: <TrendingUp size={22}/>, title: 'Treasury services',
      blurb: 'Cash management, liquidity solutions, payables and receivables automation, and intra-day reporting.' },
    { icon: <Globe2 size={22}/>, title: 'International banking',
      blurb: 'Trade finance, FX services, and multi-currency accounts across 100+ countries.' },
    { icon: <ShieldCheck size={22}/>, title: 'Risk & advisory',
      blurb: 'Interest rate, commodity and FX hedging strategies tailored to your operating exposures.' },
    { icon: <Briefcase size={22}/>, title: 'Investment banking',
      blurb: 'M&A advisory, capital markets, and strategic financing in partnership with GV Capital Markets.' },
  ]
  return (
    <section id="solutions" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Commercial Banking solutions</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Built for the complexity of your business</h2>
        <p className="text-gray-600 mt-3 max-w-3xl leading-relaxed">
          One relationship, one banker, every capability of a global institution. Our coverage teams work
          across industries to understand the dynamics that shape your business.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {solutions.map(s => (
            <div key={s.title} className="group bg-white border border-gray-100 rounded-2xl p-7 hover:border-navy-600/40 hover:shadow-bank transition-all">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-5 group-hover:bg-navy-600 group-hover:text-gold-400 transition-colors">{s.icon}</div>
              <h3 className="font-serif text-xl font-bold text-navy-600">{s.title}</h3>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{s.blurb}</p>
              <a href="#" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:underline">
                Learn more <ChevronRight size={14}/>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Who we serve ───────────────────────────────────────────────────────────
function WhoWeServe() {
  const industries = [
    'Real Estate', 'Healthcare', 'Technology', 'Manufacturing',
    'Energy & Renewables', 'Financial Sponsors', 'Higher Education',
    'Government', 'Nonprofit', 'Consumer & Retail', 'Media', 'Logistics',
  ]
  return (
    <section id="who" className="py-20 bg-[#f5f1e9]">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Who we serve</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Industry expertise that runs deep</h2>
        <p className="text-gray-600 mt-3 max-w-3xl leading-relaxed">
          Our industry teams have been embedded in their sectors for decades. They understand your
          regulatory environment, capital structures, and the trends shaping competitive dynamics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-10">
          {industries.map(ind => (
            <a key={ind} href="#"
              className="bg-white rounded-xl p-5 border border-gray-100 hover:border-navy-600 hover:shadow-bank transition-all flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-navy-600">{ind}</span>
              <ChevronRight size={14} className="text-gray-300"/>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Client stories ─────────────────────────────────────────────────────────
function ClientStories() {
  const stories = [
    { tag: 'Manufacturing', title: 'How a 4th-generation manufacturer financed a $200M expansion',
      blurb: 'A century-old family business in Ohio partnered with GV Union to fund a state-of-the-art facility.' },
    { tag: 'Real Estate',   title: 'Repositioning a Class B portfolio across the Sunbelt',
      blurb: 'A regional REIT used flexible bridge financing to acquire and reposition 14 properties in 18 months.' },
    { tag: 'Healthcare',    title: 'Scaling a multi-specialty practice across three states',
      blurb: 'A physician-owned group leveraged practice acquisition financing to grow from 12 to 47 locations.' },
  ]
  return (
    <section id="stories" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Client stories and insights</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">How we partner with leaders</h2>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {stories.map(s => (
            <a key={s.title} href="#" className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-bank-lg transition-all">
              <div className="h-44 bg-gradient-to-br from-navy-600 via-[#1e3a5f] to-[#3a5d7c] flex items-center justify-center text-white">
                <p className="font-serif text-xl font-bold opacity-60">{s.tag}</p>
              </div>
              <div className="p-6">
                <p className="text-xs tracking-widest text-gold-600 uppercase font-bold">{s.tag}</p>
                <h3 className="font-serif text-lg font-bold text-navy-600 mt-2 leading-snug">{s.title}</h3>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{s.blurb}</p>
                <p className="mt-4 text-sm font-semibold text-navy-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read the story <ChevronRight size={14}/>
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Stay connected / contact ───────────────────────────────────────────────
function StayConnected() {
  return (
    <section id="contact" className="py-20 bg-[#0a1628] text-white relative overflow-hidden">
      <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none"/>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative">
        <div>
          <p className="text-xs tracking-widest text-gold-400 uppercase font-bold mb-2">Stay connected</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold">Let's talk about your business</h2>
          <p className="text-white/70 mt-4 leading-relaxed max-w-lg">
            Our coverage bankers respond within one business day. Tell us a little about your business
            and we'll route your inquiry to the right industry specialist.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-white/80"><Phone size={14}/> <span className="font-mono">1-888-GVB-CMRC</span></div>
            <div className="flex items-center gap-3 text-white/80"><Mail size={14}/> commercial@gvunionbank.com</div>
            <div className="flex items-center gap-3 text-white/80"><Users size={14}/> 200+ commercial bankers across 30 US offices</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
          <h3 className="font-serif text-xl font-bold mb-5">Request a banker</h3>
          <form className="space-y-3" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-3">
              <input className="bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="First name"/>
              <input className="bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="Last name"/>
            </div>
            <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="Company"/>
            <input type="email" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="Work email"/>
            <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="Phone"/>
            <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm focus:border-gold-400 outline-none">
              <option value="">Annual revenue</option>
              <option>Under $20M</option>
              <option>$20M – $100M</option>
              <option>$100M – $500M</option>
              <option>$500M+</option>
            </select>
            <textarea rows={3} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm placeholder-white/50 focus:border-gold-400 outline-none" placeholder="Briefly describe what you're looking for"/>
            <button type="submit" className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-lg text-sm transition-all">
              Submit request
            </button>
          </form>
          <p className="text-xs text-white/50 mt-3">Your information is encrypted. A banker will contact you within one business day.</p>
        </div>
      </div>
    </section>
  )
}
