import { Link } from 'react-router-dom'
import {
  ArrowRight, Building2, CreditCard, Banknote, ShieldCheck, BarChart3,
  Users, Smartphone, Headphones, FileText, Check, ChevronRight,
} from 'lucide-react'
import { MarketingHeader } from '../components/marketing/MarketingHeader'
import { MarketingFooter } from '../components/marketing/MarketingFooter'

export function BusinessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader section="business"/>
      <Hero/>
      <ChooseChecking/>
      <Lending/>
      <Payments/>
      <BusinessCards/>
      <Resources/>
      <FinalCTA/>
      <MarketingFooter/>
    </div>
  )
}

// ── Hero with two side-by-side promo cards ─────────────────────────────────
function Hero() {
  return (
    <section className="bg-[#0a1628] text-white">
      <div className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div>
          <p className="text-xs tracking-widest text-gold-400 uppercase font-bold mb-2">For Business</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">GV Union for Business</h1>
          <p className="mt-5 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
            From banking to payment acceptance to credit, we offer flexible solutions to help your business
            move forward — no matter the stage you're at.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="#checking" className="px-7 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-xl transition-all flex items-center gap-2">
              Explore solutions <ArrowRight size={16}/>
            </Link>
            <Link to="/login" className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-xl transition-all">
              Business sign-in
            </Link>
          </div>
        </div>

        {/* Right column — two side-by-side promo cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <PromoCard
            tag="New business customers"
            title="Earn up to $500"
            blurb="Open a new Business Complete Checking account with qualifying activities and receive a welcome bonus."
            cta="See offer details"
            variant="bonus"
            big="$500"
          />
          <PromoCard
            tag="Payment solutions"
            title="Accept payments anywhere"
            blurb="Process credit and debit cards in person, online, or on the go with GV Payments."
            cta="Learn about payments"
            variant="payments"
            icon={<CreditCard size={48} className="text-gold-400"/>}
          />
        </div>
      </div>
    </section>
  )
}

function PromoCard({ tag, title, blurb, cta, variant, big, icon }: any) {
  // Two refined variants — navy on cream with gold accents
  const visual = variant === 'bonus' ? (
    <div className="h-48 relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#1a2f4f] to-[#2c4570]">
      {/* Subtle pattern */}
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gold-500/10"/>
      <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-gold-500/10"/>
      <div className="relative h-full flex flex-col items-center justify-center text-white">
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400 font-bold mb-2">Welcome Bonus</p>
        <p className="font-serif font-bold text-6xl leading-none">
          <span className="text-gold-400">$</span>500
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/60 tracking-widest uppercase">
          <span className="w-6 h-px bg-gold-400/60"/> Limited offer <span className="w-6 h-px bg-gold-400/60"/>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-48 relative overflow-hidden bg-gradient-to-br from-[#1a2f4f] via-[#2c4570] to-[#3a5d7c]">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5"/>
      <div className="relative h-full flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-2">
          {icon}
        </div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400 font-bold">GV Payments</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl text-gray-900 overflow-hidden shadow-bank-lg flex flex-col border border-gray-100">
      {visual}
      <div className="p-6 flex-1 flex flex-col">
        <p className="text-[10px] tracking-widest font-bold text-gold-600 uppercase">{tag}</p>
        <h3 className="font-serif text-xl font-bold text-navy-600 mt-1 leading-tight">{title}</h3>
        <p className="text-sm text-gray-600 mt-2 flex-1 leading-relaxed">{blurb}</p>
        <a href="#" className="mt-4 text-sm font-semibold text-navy-600 hover:underline flex items-center gap-1">
          {cta} <ChevronRight size={14}/>
        </a>
      </div>
    </div>
  )
}

// ── Section: Choose a business checking account ────────────────────────────
function ChooseChecking() {
  const accounts = [
    {
      name: 'Complete Checking', monthly: '$15',
      blurb: 'Best for everyday operating accounts. Free for the first 3 months for new businesses.',
      perks: ['20 free monthly transactions', '$5,000 free cash deposits', 'Free Zelle, ACH, and bill pay', 'No minimum balance to open'],
      highlight: false,
    },
    {
      name: 'Performance Checking', monthly: '$30',
      blurb: 'For growing businesses with higher transaction volume.',
      perks: ['250 free monthly transactions', '$20,000 free cash deposits', 'Free domestic wires', 'Earn interest on idle balance'],
      highlight: true,
    },
    {
      name: 'Platinum Checking', monthly: '$95',
      blurb: 'Premium tier for established businesses with complex needs.',
      perks: ['500 free monthly transactions', '$25,000 free cash deposits', 'Free incoming + 4 outgoing wires', 'Dedicated relationship manager'],
      highlight: false,
    },
  ]
  return (
    <section id="checking" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Checking & more</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Choose a business checking account</h2>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Three tiers built around how much you transact each month. Switch anytime — no penalties.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {accounts.map(a => (
            <div key={a.name}
              className={`relative bg-white rounded-2xl border-2 p-7 transition-all
                ${a.highlight ? 'border-navy-600 shadow-bank-lg' : 'border-gray-100 hover:border-navy-600/40'}`}>
              {a.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-navy-600 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full">Most popular</span>
              )}
              <h3 className="font-serif text-2xl font-bold text-navy-600">{a.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-serif text-3xl font-bold text-gray-900">{a.monthly}</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a.blurb}</p>
              <ul className="mt-5 space-y-2">
                {a.perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-green-600 flex-shrink-0 mt-1"/>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className={`mt-7 w-full block text-center py-3 rounded-xl text-sm font-semibold transition-all
                  ${a.highlight ? 'bg-navy-600 hover:bg-[#1e3a5f] text-white' : 'border-2 border-navy-600 text-navy-600 hover:bg-navy-50'}`}>
                Open account →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Lending ────────────────────────────────────────────────────────────────
function Lending() {
  const loans = [
    { icon: <Banknote size={20}/>, title: 'SBA loans', blurb: 'Government-backed loans up to $5M for working capital, real estate, or equipment.' },
    { icon: <Building2 size={20}/>, title: 'Commercial real estate', blurb: 'Buy, build, or refinance commercial property with terms up to 25 years.' },
    { icon: <BarChart3 size={20}/>, title: 'Lines of credit', blurb: 'Flexible revolving credit from $25,000 to $5,000,000 with same-day funding.' },
    { icon: <FileText size={20}/>, title: 'Equipment financing', blurb: 'Finance the equipment your business needs with terms up to 7 years.' },
  ]
  return (
    <section id="loans" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Loans & financing</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Capital to grow your business</h2>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Approval decisions in as little as 24 hours. We work with a dedicated banker who actually knows your business.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {loans.map(l => (
            <div key={l.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-navy-600/40 hover:shadow-bank transition-all">
              <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-4">{l.icon}</div>
              <h3 className="font-serif text-lg font-bold text-navy-600">{l.title}</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{l.blurb}</p>
              <a href="#" className="mt-4 text-sm font-semibold text-navy-600 hover:underline inline-flex items-center gap-1">
                Apply <ChevronRight size={14}/>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Payments ───────────────────────────────────────────────────────────────
function Payments() {
  return (
    <section id="payments" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Accept payments</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Accept payments anywhere</h2>
          <p className="text-gray-600 mt-3 leading-relaxed">
            In-store, online, mobile, or invoiced — process payments with GV Merchant Services and
            see funds in your account as fast as the next business day.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Accept Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay',
              'Pricing as low as 2.6% + 10¢ per transaction',
              'POS hardware starting at $0 with qualifying volume',
              'Real-time deposits to your GV business checking',
              'PCI compliance and fraud monitoring included',
            ].map(b => (
              <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5"/>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link to="/register" className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold transition-all">
            Start accepting payments <ArrowRight size={14}/>
          </Link>
        </div>

        <div className="relative">
          <div className="bg-gradient-to-br from-navy-600 to-[#1e3a5f] rounded-2xl p-10 text-white">
            <Smartphone className="text-gold-400 mb-4" size={32}/>
            <p className="font-serif text-2xl font-bold">GV Tap to Pay</p>
            <p className="text-white/70 mt-2 text-sm">Turn any iPhone or Android into a card terminal — no extra hardware required.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-2xl font-serif font-bold">2.6%</p>
                <p className="text-[10px] text-white/60 mt-1">+ 10¢/tx</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-2xl font-serif font-bold">$0</p>
                <p className="text-[10px] text-white/60 mt-1">to start</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-2xl font-serif font-bold">1d</p>
                <p className="text-[10px] text-white/60 mt-1">to funds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Business credit cards ──────────────────────────────────────────────────
function BusinessCards() {
  const cards = [
    { name: 'Ink Business Cash',     rewards: '5% cash back on office supplies', annual: '$0',  blurb: 'Built for sole proprietors and small teams.' },
    { name: 'Ink Business Preferred', rewards: '3× points on travel + shipping', annual: '$95', blurb: 'Most popular among growing companies.' },
    { name: 'Ink Business Unlimited', rewards: '1.5% on every purchase',         annual: '$0',  blurb: 'Simple flat rewards on every dollar spent.' },
  ]
  return (
    <section id="credit" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Business credit cards</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">Cards that work as hard as you do</h2>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {cards.map(c => (
            <div key={c.name} className="bg-white rounded-2xl border border-gray-100 p-7 hover:border-navy-600/40 hover:shadow-bank transition-all">
              <CreditCard size={28} className="text-navy-600 mb-4"/>
              <h3 className="font-serif text-xl font-bold text-navy-600">{c.name}</h3>
              <p className="font-mono text-sm text-gray-500 mt-1">Annual fee: {c.annual}</p>
              <p className="font-semibold text-gray-900 mt-3">{c.rewards}</p>
              <p className="text-sm text-gray-600 mt-2">{c.blurb}</p>
              <Link to="/register" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:underline">
                Apply now <ChevronRight size={14}/>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Help & Resources ───────────────────────────────────────────────────────
function Resources() {
  const blocks = [
    { icon: <Headphones size={20}/>, title: '24/7 business support', blurb: 'Dedicated business banker hotline. No queues, no chatbots — real humans.' },
    { icon: <Users size={20}/>,      title: 'Local relationship managers', blurb: 'Meet in-person at any branch. We learn your industry and your goals.' },
    { icon: <ShieldCheck size={20}/>, title: 'Fraud protection', blurb: 'Real-time fraud alerts on every business card and ACH transaction.' },
  ]
  return (
    <section id="resources" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-widest text-gold-600 uppercase font-bold mb-2">Help & support</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-600">We're with you every step</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {blocks.map(b => (
            <div key={b.title} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-4">{b.icon}</div>
              <h3 className="font-serif text-lg font-bold text-navy-600">{b.title}</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{b.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Final CTA ──────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section id="open" className="py-16 bg-[#0a1628] text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold">Open a business account in 10 minutes</h2>
        <p className="text-white/70 mt-3 max-w-xl mx-auto">
          Tell us about your business and we'll get your operating account ready, often same-day.
        </p>
        <div className="mt-7 flex justify-center gap-3 flex-wrap">
          <Link to="/register" className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-600 font-semibold rounded-xl transition-all flex items-center gap-2">
            Open Business Account <ArrowRight size={16}/>
          </Link>
          <a href="tel:18004826226" className="px-8 py-3.5 border border-white/30 hover:border-white text-white font-semibold rounded-xl transition-all">
            Talk to a banker
          </a>
        </div>
      </div>
    </section>
  )
}
