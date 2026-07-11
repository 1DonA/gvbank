import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { BRAND } from '../../brand'

export function MarketingFooter() {
  const cols = [
    { title: 'Personal', links: [
      { label: 'Checking',         to: '/products/checking' },
      { label: 'Savings & CDs',    to: '/products/savings' },
      { label: 'Credit cards',     to: '/products/credit-cards' },
      { label: 'Home loans',       to: '/products/home-loans' },
      { label: 'Auto loans',       to: '/products/auto' },
      { label: 'Investing',        to: '/products/investing' },
    ]},
    { title: 'Business', links: [
      { label: 'Business checking', to: '/business#checking' },
      { label: 'Loans & financing', to: '/business#loans' },
      { label: 'Accept payments',   to: '/business#payments' },
      { label: 'Business credit',   to: '/business#credit' },
    ]},
    { title: 'Wealth & Commercial', links: [
      { label: 'Wealth Management', to: '/wealth' },
      { label: 'Commercial Banking', to: '/commercial' },
      { label: 'Investing',          to: '/products/investing' },
    ]},
    { title: 'Help', links: [
      { label: 'Customer service',   to: '#' },
      { label: 'Branch locator',     to: '#' },
      { label: 'Lost or stolen card', to: '#' },
      { label: 'Accessibility',      to: '#' },
      { label: 'Site map',           to: '#' },
    ]},
  ]
  return (
    <footer className="bg-white border-t border-gray-200 pt-14 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-100">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold">G</div>
              <div>
                <p className="font-serif font-bold text-navy-600 leading-none">{BRAND.name}</p>
                <p className="text-[10px] tracking-widest text-gold-600 uppercase">Regulated by {BRAND.regulator}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              Serving customers across the European Union and the United Kingdom. {BRAND.deposit_protection}.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-500">
              <p className="flex items-center gap-2"><Phone size={13}/> {BRAND.phone_display}</p>
              <p className="flex items-center gap-2"><Mail size={13}/> {BRAND.support_email}</p>
              <p className="flex items-center gap-2"><MapPin size={13}/> {BRAND.offices.slice(0,3).join(' · ')}</p>
            </div>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <p className="font-bold text-sm text-navy-600 mb-3">{c.title}</p>
              <ul className="space-y-2 text-sm text-gray-500">
                {c.links.map(l => (
                  <li key={l.label}>
                    {l.to.startsWith('/') ? (
                      <Link to={l.to} className="hover:text-navy-600 transition-colors">{l.label}</Link>
                    ) : (
                      <a href={l.to} className="hover:text-navy-600 transition-colors">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 {BRAND.legal_name}. All rights reserved. Regulated by {BRAND.regulator} · {BRAND.license_id}. {BRAND.deposit_protection}.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-navy-600">Privacy</a>
            <a href="#" className="hover:text-navy-600">Terms</a>
            <a href="#" className="hover:text-navy-600">Accessibility</a>
            <a href="#" className="hover:text-navy-600">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
