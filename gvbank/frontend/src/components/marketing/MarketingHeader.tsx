import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Wallet, PiggyBank, CreditCard, Home, Car, LineChart, GraduationCap, Plane,
  Phone, ChevronDown, Search, Globe,
} from 'lucide-react'
import { useT, useLang, LANGUAGES, LangCode } from '../../i18n'
import { BRAND } from '../../brand'

type Section = 'personal' | 'business' | 'commercial' | 'wealth'

interface MarketingHeaderProps {
  section?: Section
  showProductNav?: boolean
}

export function MarketingHeader({ section = 'personal', showProductNav = true }: MarketingHeaderProps) {
  return (
    <>
      <UtilityBar section={section}/>
      <MainBar section={section} showProductNav={showProductNav}/>
    </>
  )
}

function UtilityBar({ section }: { section: Section }) {
  const t = useT()
  const tabs: { tKey: any; to: string; key: Section }[] = [
    { tKey: 'nav.personal',   to: '/',           key: 'personal'   },
    { tKey: 'nav.business',   to: '/business',   key: 'business'   },
    { tKey: 'nav.wealth',     to: '/wealth',     key: 'wealth'     },
    { tKey: 'nav.commercial', to: '/commercial', key: 'commercial' },
  ]
  return (
    <div className="hidden md:block bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs">
        <div className="flex">
          {tabs.map(tab => {
            const active = section === tab.key
            return (
              <Link key={tab.key} to={tab.to}
                className={`px-3 py-2.5 font-semibold tracking-wide transition-colors border-b-2
                  ${active ? 'text-navy-600 border-navy-600' : 'text-gray-500 hover:text-navy-600 border-transparent'}`}>
                {t(tab.tKey)}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-5 text-gray-500">
          <a href="#" className="hover:text-navy-600">{t('cta.schedule_meeting')}</a>
          <a href="#" className="hover:text-navy-600 flex items-center gap-1">
            {t('cta.customer_service')} <ChevronDown size={12}/>
          </a>
          <LanguageSwitcher/>
          <button className="hover:text-navy-600"><Search size={13}/></button>
        </div>
      </div>
    </div>
  )
}

// ── Language switcher dropdown ────────────────────────────────────────────
function LanguageSwitcher() {
  const [lang, setLang] = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', click)
    return () => window.removeEventListener('click', click)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="hover:text-navy-600 flex items-center gap-1">
        <Globe size={12}/> <span>{current.label}</span> <ChevronDown size={12}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white shadow-bank-lg border border-gray-100 rounded-xl py-1 min-w-[160px] z-50">
          {LANGUAGES.map(l => (
            <button key={l.code}
              onClick={() => { setLang(l.code as LangCode); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2
                ${l.code === lang ? 'text-navy-600 font-semibold bg-navy-50' : 'text-gray-700'}`}>
              <span>{l.flag}</span> {l.label}
              {l.code === lang && <span className="ml-auto text-navy-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MainBar({ section, showProductNav }: { section: Section; showProductNav: boolean }) {
  const location = useLocation()
  const t = useT()

  const PERSONAL_NAV = [
    { tKey: 'nav.checking',      to: '/products/checking' },
    { tKey: 'nav.savings',       to: '/products/savings' },
    { tKey: 'nav.credit_cards',  to: '/products/credit-cards' },
    { tKey: 'nav.home_loans',    to: '/products/home-loans' },
    { tKey: 'nav.auto',          to: '/products/auto' },
    { tKey: 'nav.investing',     to: '/products/investing' },
    { tKey: 'nav.education',     to: '/products/education' },
    { tKey: 'nav.travel',        to: '/products/travel' },
  ] as const

  const BUSINESS_NAV = [
    { label: 'Checking & more',   to: '/business#checking' },
    { label: 'Loans & financing', to: '/business#loans' },
    { label: 'Accept payments',   to: '/business#payments' },
    { label: 'Business credit',   to: '/business#credit' },
    { label: 'Help & support',    to: '/business#help' },
    { label: 'Resource center',   to: '/business#resources' },
  ]

  const brandSuffix =
    section === 'business'   ? <span className="hidden sm:inline text-sm text-gray-500 ml-2 italic">for Business</span> :
    section === 'commercial' ? <span className="hidden sm:inline text-sm text-gray-500 ml-2 italic">Commercial</span> :
    section === 'wealth'     ? <span className="hidden sm:inline text-sm text-gray-500 ml-2 italic">Private Wealth</span> :
    null

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
        <Link to={section === 'business' ? '/business' : section === 'commercial' ? '/commercial' : section === 'wealth' ? '/wealth' : '/'}
              className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold text-lg shadow-bank">G</div>
          <div className="hidden sm:flex items-baseline">
            <p className="font-serif text-lg font-bold text-navy-600 leading-none">GV Union Bank</p>
            {brandSuffix}
          </div>
        </Link>

        {showProductNav && (
          <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
            {section === 'business'
              ? BUSINESS_NAV.map(n => {
                  const active = location.pathname === n.to
                  return (
                    <Link key={n.label} to={n.to}
                      className={`text-sm font-semibold px-3 py-2 rounded-lg transition-all
                        ${active ? 'text-navy-600 bg-gray-50' : 'text-gray-700 hover:text-navy-600 hover:bg-gray-50'}`}>
                      {n.label}
                    </Link>
                  )
                })
              : PERSONAL_NAV.map(n => {
                  const active = location.pathname === n.to
                  return (
                    <Link key={n.tKey} to={n.to}
                      className={`text-sm font-semibold px-3 py-2 rounded-lg transition-all
                        ${active ? 'text-navy-600 bg-gray-50' : 'text-gray-700 hover:text-navy-600 hover:bg-gray-50'}`}>
                      {t(n.tKey)}
                    </Link>
                  )
                })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          <a href={`tel:${BRAND.phone_tel}`} className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-navy-600 transition-colors">
            <Phone size={14}/> <span className="font-semibold">{BRAND.phone_display}</span>
          </a>
          <Link to="/login" className="hidden sm:inline-block text-sm font-semibold text-navy-600 hover:underline">
            {t('cta.sign_in')}
          </Link>
          <Link to={section === 'business' ? '/business#open' : '/register'}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-navy-600 text-white hover:bg-[#1e3a5f] transition-all whitespace-nowrap">
            {section === 'business' ? 'Open Business Account' : t('cta.open_account')}
          </Link>
        </div>
      </div>
    </header>
  )
}
