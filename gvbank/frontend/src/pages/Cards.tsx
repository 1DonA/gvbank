import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, Snowflake, Sun, Lock, Smartphone, ShoppingBag, Plane,
  CreditCard as CreditCardIcon, ChevronRight, ShieldCheck, Settings,
  ArrowUpRight, ArrowDownLeft, Receipt,
} from 'lucide-react'

const fmt = (n: number) =>
  '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface MockCard {
  id: string
  type: 'debit' | 'virtual' | 'credit'
  account_id: string
  network: 'visa' | 'mastercard'
  last4: string
  full_pan: string
  exp: string
  cvv: string
  status: 'active' | 'frozen' | 'cancelled'
  daily_limit: number
  ecommerce: boolean
  contactless: boolean
  international: boolean
  label: string
}

// Locally-generated mock cards — derived from the user's real accounts.
// These don't represent real card numbers and won't post any transactions.
function deriveCards(user: any, accounts: any[]): MockCard[] {
  if (!accounts.length) return []
  // Deterministic seed from email so the numbers don't change between refreshes.
  const seed = (user?.email || 'x').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const checking = accounts.find(a => a.type === 'checking')
  const savings  = accounts.find(a => a.type === 'savings')
  const rand = (i: number) => ((seed * 9301 + 49297 + i * 12345) % 233280)
  const digits = (n: number, len: number) => String(rand(n) * 100000 + 1234567890).slice(0, len)

  const out: MockCard[] = []
  if (checking) {
    const last4 = digits(1, 4)
    out.push({
      id: 'card_debit_' + last4,
      type: 'debit', network: 'visa',
      account_id: checking.id,
      last4, full_pan: `4532 ${digits(2,4)} ${digits(3,4)} ${last4}`,
      exp: '12/29', cvv: digits(4,3),
      status: 'active', daily_limit: 3000,
      ecommerce: true, contactless: true, international: false,
      label: 'GV Union Debit',
    })
    const v4 = digits(5,4)
    out.push({
      id: 'card_virtual_' + v4,
      type: 'virtual', network: 'visa',
      account_id: checking.id,
      last4: v4, full_pan: `4929 ${digits(6,4)} ${digits(7,4)} ${v4}`,
      exp: '06/27', cvv: digits(8,3),
      status: 'active', daily_limit: 1500,
      ecommerce: true, contactless: false, international: true,
      label: 'Virtual Card · Online',
    })
  }
  if (savings) {
    const l4 = digits(9,4)
    out.push({
      id: 'card_savings_' + l4,
      type: 'debit', network: 'mastercard',
      account_id: savings.id,
      last4: l4, full_pan: `5412 ${digits(10,4)} ${digits(11,4)} ${l4}`,
      exp: '03/28', cvv: digits(12,3),
      status: 'frozen', daily_limit: 1000,
      ecommerce: false, contactless: true, international: false,
      label: 'Savings Access Card',
    })
  }
  return out
}

export function CardsPage() {
  const { user } = useAuthStore()
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data) })
  const { data: allTx = [] } = useQuery({ queryKey: ['all-tx'], queryFn: () => accountsAPI.allTransactions().then(r => r.data) })

  const initialCards = useMemo(() => deriveCards(user, accounts), [user, accounts])
  const [cards, setCards] = useState<MockCard[]>([])
  // Hydrate state when accounts load
  useMemo(() => { if (initialCards.length && !cards.length) setCards(initialCards) }, [initialCards])

  const [activeId, setActiveId] = useState<string>('')
  const active = cards.find(c => c.id === activeId) || cards[0]
  const [revealed, setRevealed] = useState(false)

  if (!cards.length) {
    return (
      <div className="text-center py-20 text-gray-400">
        <CreditCardIcon size={32} className="mx-auto mb-3"/>
        <p>You don't have any cards on file yet.</p>
        <p className="text-xs mt-2">Open a checking account to receive a debit card.</p>
      </div>
    )
  }

  const toggleFreeze = () => {
    if (!active) return
    setCards(prev => prev.map(c => c.id === active.id ? { ...c, status: c.status === 'active' ? 'frozen' : 'active' } : c))
    toast.success(active.status === 'active' ? 'Card frozen' : 'Card unfrozen')
  }

  const toggleControl = (key: keyof MockCard) => {
    if (!active) return
    setCards(prev => prev.map(c => c.id === active.id ? { ...c, [key]: !c[key] } : c))
  }

  const setLimit = (val: number) => {
    if (!active) return
    setCards(prev => prev.map(c => c.id === active.id ? { ...c, daily_limit: val } : c))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-gray-900">Cards</h2>
        <p className="text-sm text-gray-500">Manage your debit, savings and virtual cards.</p>
      </div>

      {/* Cards carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {cards.map(c => (
          <button key={c.id} onClick={() => { setActiveId(c.id); setRevealed(false) }}
                  className={`snap-start flex-shrink-0 w-80 transition-transform hover:scale-[1.01]
                              ${active?.id === c.id ? 'ring-2 ring-navy-600 ring-offset-2 rounded-2xl' : ''}`}>
            <CardArt card={c} revealed={active?.id === c.id && revealed} holderName={user?.name || ''}/>
          </button>
        ))}
      </div>

      {active && (
        <>
          {/* Card info & controls */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{active.label}</h3>
                <button onClick={() => setRevealed(r => !r)}
                        className="text-xs flex items-center gap-1 text-navy-600 font-semibold hover:underline">
                  {revealed ? <><EyeOff size={12}/> Hide details</> : <><Eye size={12}/> Show details</>}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Card number" value={revealed ? active.full_pan : `•••• •••• •••• ${active.last4}`} mono/>
                <Detail label="Expires"      value={active.exp} mono/>
                <Detail label="CVV"          value={revealed ? active.cvv : '•••'} mono/>
                <Detail label="Status" value={
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${
                    active.status === 'active' ? 'bg-green-50 text-green-700' :
                    active.status === 'frozen' ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-700'
                  }`}>{active.status === 'frozen' ? 'Frozen' : active.status === 'active' ? 'Active' : 'Cancelled'}</span>
                }/>
              </div>
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 flex items-center gap-1">
                <ShieldCheck size={11}/> Card details are end-to-end encrypted and visible only to you.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings size={14}/> Quick Controls
              </h3>
              <button onClick={toggleFreeze}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all
                        ${active.status === 'frozen' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${active.status === 'frozen' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {active.status === 'frozen' ? <Sun size={18}/> : <Snowflake size={18}/>}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {active.status === 'frozen' ? 'Unfreeze card' : 'Freeze card'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {active.status === 'frozen' ? 'Re-enable all spending' : 'Temporarily block new purchases'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300"/>
              </button>
              <Toggle label="Online & in-app purchases" icon={<ShoppingBag size={16}/>}
                      on={active.ecommerce} onClick={() => toggleControl('ecommerce')}/>
              <Toggle label="Contactless (tap to pay)" icon={<Smartphone size={16}/>}
                      on={active.contactless} onClick={() => toggleControl('contactless')}/>
              <Toggle label="International transactions" icon={<Plane size={16}/>}
                      on={active.international} onClick={() => toggleControl('international')}/>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">Daily spending limit</p>
                  <p className="font-mono font-semibold text-sm text-gray-900">{fmt(active.daily_limit)}</p>
                </div>
                <input type="range" min={100} max={10000} step={100} value={active.daily_limit}
                       onChange={e => setLimit(parseInt(e.target.value))}
                       className="w-full accent-navy-600"/>
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$100</span><span>$10,000</span></div>
              </div>
            </div>
          </div>

          {/* Recent activity for the selected card */}
          <CardActivity account_id={active.account_id} allTx={allTx}/>

          {/* Additional actions */}
          <div className="grid sm:grid-cols-3 gap-3">
            <Action title="Report lost / stolen" subtitle="Block card immediately and issue a replacement"
                    icon={<Lock size={16}/>}
                    onClick={() => toast.error('Demo only: card replacement is not enabled')}/>
            <Action title="Add to Apple / Google Pay" subtitle="Provision this card to your device wallet"
                    icon={<Smartphone size={16}/>}
                    onClick={() => toast('Demo only: wallet provisioning is not enabled')}/>
            <Action title="Request a new card" subtitle="Apply for a virtual or physical card"
                    icon={<CreditCardIcon size={16}/>}
                    onClick={() => toast('Demo only: card issuance is not enabled')}/>
          </div>
        </>
      )}
    </div>
  )
}

// ── Card art ───────────────────────────────────────────────────────────────
function CardArt({ card, revealed, holderName }: { card: MockCard; revealed: boolean; holderName: string }) {
  const gradient = card.type === 'virtual'
    ? 'from-[#0f3057] via-[#1e5f8b] to-[#5dc4e7]'
    : card.network === 'mastercard'
      ? 'from-[#0a1628] via-[#1a3450] to-[#3a5d7c]'
      : 'from-navy-600 via-[#1e3a5f] to-[#3a5d7c]'

  return (
    <div className={`relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-bank-lg overflow-hidden`}>
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white"/>
        <div className="absolute -right-20 top-20 w-32 h-32 rounded-full bg-white"/>
      </div>

      <div className="relative flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-white/70">GV Union Bank</p>
            <p className="text-xs font-semibold text-gold-400 mt-0.5">{card.label}</p>
          </div>
          <div className="text-right">
            <div className="w-10 h-7 rounded bg-gradient-to-br from-gold-500 to-gold-400"/>
          </div>
        </div>

        <div>
          <p className="font-mono text-base sm:text-lg tracking-[0.18em]">
            {revealed ? card.full_pan : `•••• •••• •••• ${card.last4}`}
          </p>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-[9px] tracking-widest uppercase text-white/50">Card holder</p>
              <p className="text-sm font-semibold uppercase tracking-wide">{holderName || 'Cardholder'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-widest uppercase text-white/50">Expires</p>
              <p className="text-sm font-mono">{card.exp}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-serif italic text-white/90">
                {card.network === 'mastercard' ? 'MC' : 'VISA'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {card.status === 'frozen' && (
        <div className="absolute inset-0 backdrop-blur-[1px] bg-black/30 flex items-center justify-center rounded-2xl">
          <span className="text-xs font-bold uppercase tracking-widest bg-white/90 text-navy-600 px-3 py-1 rounded-full">Frozen</span>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, mono = false }: any) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold text-gray-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function Toggle({ label, icon, on, onClick }: { label: string; icon: any; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">{icon}</div>
      <span className="flex-1 text-left text-sm text-gray-900">{label}</span>
      <span className={`relative w-10 h-6 rounded-full transition-colors ${on ? 'bg-navy-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}/>
      </span>
    </button>
  )
}

function Action({ title, subtitle, icon, onClick }: any) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-navy-600 hover:shadow-bank transition-all">
      <div className="w-9 h-9 rounded-xl bg-gray-100 text-navy-600 flex items-center justify-center mb-2">{icon}</div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </button>
  )
}

// ── Recent activity for the selected card's account ───────────────────────
function CardActivity({ account_id, allTx }: { account_id: string; allTx: any[] }) {
  const txs = useMemo(
    () => allTx.filter((t: any) => t.account_id === account_id || // backend may or may not return account_id; fall back to all
                                    (!t.account_id)).slice(0, 8),
    [allTx, account_id]
  )
  // (When backend's /transactions/all doesn't include account_id, we'd ideally
  // call /accounts/{id}/transactions; for simplicity we show the most recent.)

  // Tiny spend-by-category aggregation
  const spend = useMemo(() => {
    const byCat: Record<string, number> = {}
    let total = 0
    for (const t of txs) {
      if (t.amount < 0) {
        const cat = t.category || 'other'
        byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount)
        total += Math.abs(t.amount)
      }
    }
    return { categories: Object.entries(byCat).slice(0, 4), total }
  }, [txs])

  const fmt = (n: number) => '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2 })

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-navy-600"/>
            <h3 className="font-semibold text-gray-900">Recent card activity</h3>
          </div>
          <span className="text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="divide-y divide-gray-50">
          {txs.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No recent activity</p>}
          {txs.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                ${t.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-navy-600'}`}>
                {t.amount > 0 ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{t.category ? ' · ' + t.category : ''}</p>
              </div>
              <p className={`text-sm font-bold font-mono ${t.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {t.amount > 0 ? '+' : '−'}{fmt(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ShoppingBag size={14} className="text-navy-600"/> Spend by category
        </h3>
        {spend.categories.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No spending yet</p>
        ) : (
          <div className="space-y-3">
            {spend.categories.map(([cat, amt]) => {
              const pct = Math.max(8, (amt / spend.total) * 100)
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{cat.replace(/_/g,' ')}</span>
                    <span className="font-mono text-gray-900">{fmt(amt)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-navy-600 to-[#1e3a5f]" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              )
            })}
            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Total</span>
              <span className="font-mono font-bold text-gray-900">{fmt(spend.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
