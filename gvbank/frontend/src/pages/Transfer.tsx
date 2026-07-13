import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { accountsAPI, transferAPI, authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { OTPInput } from '../components/ui/OTPInput'
import toast from 'react-hot-toast'
import {
  Building2, Globe2, Repeat, Send, ChevronRight, ChevronLeft,
  Shield, Printer, CheckCircle2, AlertTriangle, Info, Clock, User,
} from 'lucide-react'

// ── Money formatter ────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Transfer methods ───────────────────────────────────────────────────────
type Method = 'internal' | 'ach' | 'domestic_wire' | 'international_wire' | 'zelle'

const METHODS: Record<Method, {
  label: string
  blurb: string
  fee: number
  cutoff: string
  speed: string
  icon: any
  per_tx_limit: number
  daily_limit: number
}> = {
  internal: {
    label: 'Between My Accounts', blurb: 'Move funds between your own GV Union Bank accounts',
    fee: 0, cutoff: 'Instant', speed: 'Posts immediately', icon: Repeat,
    per_tx_limit: 1_000_000, daily_limit: 1_000_000,
  },
  ach: {
    label: 'ACH Transfer', blurb: 'Send to a US bank using routing & account number',
    fee: 0, cutoff: '5:00 PM ET', speed: '1–3 business days', icon: Send,
    per_tx_limit: 25_000, daily_limit: 25_000,
  },
  zelle: {
    label: 'Zelle', blurb: 'Send to a US contact using email or phone',
    fee: 0, cutoff: 'Anytime', speed: 'Minutes (US banks only)', icon: Send,
    per_tx_limit: 2_000, daily_limit: 5_000,
  },
  domestic_wire: {
    label: 'Domestic Wire', blurb: 'US wire transfer via Fedwire — same-day final settlement',
    fee: 25, cutoff: '4:00 PM ET', speed: 'Same business day', icon: Building2,
    per_tx_limit: 250_000, daily_limit: 500_000,
  },
  international_wire: {
    label: 'International Wire', blurb: 'SWIFT wire to a foreign bank — fully tracked',
    fee: 45, cutoff: '3:00 PM ET', speed: '1–4 business days', icon: Globe2,
    per_tx_limit: 100_000, daily_limit: 250_000,
  },
}

// Extract recent unique recipients from past completed transfers for quick re-send.
interface RecentRecipient {
  name: string
  method: Method
  to_destination: string
  beneficiary_bank?: string
  beneficiary_account?: string
  beneficiary_routing?: string
  beneficiary_address?: string
  last_used: string
}

function deriveRecentRecipients(transactions: any[]): RecentRecipient[] {
  const seen = new Map<string, RecentRecipient>()
  for (const t of transactions) {
    if (!t.transfer_method || t.transfer_method === 'internal') continue
    if (!t.beneficiary_name && !t.to_account) continue
    const key = `${t.transfer_method}::${t.beneficiary_name || t.to_account}`
    if (seen.has(key)) continue
    seen.set(key, {
      name: t.beneficiary_name || t.to_account,
      method: t.transfer_method,
      to_destination: t.to_account || '',
      beneficiary_bank: t.beneficiary_bank,
      last_used: t.created_at,
    })
    if (seen.size >= 6) break
  }
  return Array.from(seen.values())
}

type Step = 'method' | 'beneficiary' | 'amount' | 'review' | 'authorize' | 'receipt'

interface FormState {
  // method & source
  method: Method
  from_account_id: string

  // amount + details
  amount: string
  wire_purpose: string
  memo: string

  // destination
  to_destination: string          // either internal Account.id OR external label / contact
  beneficiary_name: string
  beneficiary_bank: string
  beneficiary_account: string     // account number OR IBAN
  beneficiary_routing: string     // routing OR SWIFT/BIC
  beneficiary_address: string

  // currency conversion
  target_currency: string         // ISO code e.g. USD, GBP, JPY (default EUR = no conversion)
}

const initialForm = (): FormState => ({
  method: 'internal',
  from_account_id: '',
  amount: '',
  wire_purpose: '',
  memo: '',
  to_destination: '',
  beneficiary_name: '',
  beneficiary_bank: '',
  beneficiary_account: '',
  beneficiary_routing: '',
  beneficiary_address: '',
  target_currency: 'EUR',
})

// ──────────────────────────────────────────────────────────────────────────
export function TransferPage() {
  const { user } = useAuthStore()
  const [step, setStep] = useState<Step>('method')
  const [form, setForm] = useState<FormState>(initialForm())
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [pin, setPin] = useState<string>('')
  const [receipt, setReceipt] = useState<any>(null)
  const [txRef, setTxRef] = useState('')

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsAPI.list().then(r => r.data),
  })
  const { data: allTx = [] } = useQuery({
    queryKey: ['all-tx'],
    queryFn: () => accountsAPI.allTransactions().then(r => r.data),
  })
  const recentRecipients = useMemo(() => deriveRecentRecipients(allTx), [allTx])
  const { data: fxData } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => transferAPI.currencies().then(r => r.data),
    staleTime: 5 * 60_000,       // cache for 5 minutes
  })
  const currencies: Record<string, any> = fxData?.rates || { EUR: { rate: 1, name: 'Euro', symbol: '€', country: 'Eurozone' } }

  const sourceAccount = useMemo(
    () => accounts.find((a: any) => a.id === form.from_account_id),
    [accounts, form.from_account_id]
  )

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const amountNum = parseFloat(form.amount || '0') || 0
  const feeAmount = METHODS[form.method].fee
  const totalDebit = amountNum + feeAmount

  // ── Mutations ────────────────────────────────────────────────────────────
  const initMutation = useMutation({
    mutationFn: (payload: any) => transferAPI.initiate(payload),
    onSuccess: (res) => {
      setTxRef(res.data.transfer_ref)
      setStep('authorize')
      toast.success(res.data.message || 'Authorization code sent')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to initiate transfer'),
  })

  const verifyMutation = useMutation({
    mutationFn: (payload: any) => transferAPI.verify(payload),
    onSuccess: (res) => {
      setReceipt(res.data)
      setStep('receipt')
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.detail || 'Invalid authorization code')
      setOtp(Array(6).fill(''))
    },
  })

  // ── Step transitions ─────────────────────────────────────────────────────
  const goToBeneficiary = () => {
    if (!form.from_account_id) { toast.error('Select a source account'); return }
    setStep('beneficiary')
  }

  const goToAmount = () => {
    const m = form.method
    if (m === 'internal') {
      if (!form.to_destination) { toast.error('Select a destination account'); return }
    } else if (m === 'zelle') {
      if (!form.beneficiary_name.trim()) { toast.error('Recipient name required'); return }
      if (!form.to_destination.trim()) { toast.error('Email or phone required'); return }
    } else {
      if (!form.beneficiary_name.trim()) { toast.error('Beneficiary name required'); return }
      if (!form.beneficiary_bank.trim()) { toast.error('Beneficiary bank required'); return }
      if (!form.beneficiary_account.trim()) { toast.error('Account number / IBAN required'); return }
      if (!form.beneficiary_routing.trim()) {
        toast.error(m === 'international_wire' ? 'SWIFT/BIC required' : 'Routing number required'); return
      }
      if (m === 'international_wire' && !form.beneficiary_address.trim()) {
        toast.error('Beneficiary address required for international wires'); return
      }
    }
    setStep('amount')
  }

  const goToReview = () => {
    if (!amountNum || amountNum <= 0) { toast.error('Enter a valid amount'); return }
    if (sourceAccount && totalDebit > sourceAccount.balance) {
      toast.error(`Insufficient funds. Need ${fmt(totalDebit)}, available ${fmt(sourceAccount.balance)}`); return
    }
    if ((form.method === 'domestic_wire' || form.method === 'international_wire') && !form.wire_purpose.trim()) {
      toast.error('Wire purpose / reference required (regulatory)'); return
    }
    setStep('review')
  }

  const submitTransfer = () => {
    initMutation.mutate({
      from_account_id: form.from_account_id,
      transfer_method: form.method,
      amount: amountNum,
      to_destination:
        form.method === 'internal' ? form.to_destination : (form.to_destination || form.beneficiary_account),
      beneficiary_name:     form.beneficiary_name     || null,
      beneficiary_bank:     form.beneficiary_bank     || null,
      beneficiary_account:  form.beneficiary_account  || null,
      beneficiary_routing:  form.beneficiary_routing  || null,
      beneficiary_address:  form.beneficiary_address  || null,
      wire_purpose:         form.wire_purpose         || null,
      memo:                 form.memo                 || null,
      target_currency:      form.target_currency      || 'EUR',
      pin:                  pin || null,
    })
  }

  const submitOtp = () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    verifyMutation.mutate({ transfer_ref: txRef, otp_code: code })
  }

  const resendOtp = async () => {
    try {
      await authAPI.resendOTP(user?.email || '', 'transfer')
      toast.success('New authorization code sent')
    } catch { toast.error('Failed to resend code') }
  }

  const startOver = () => {
    setForm(initialForm())
    setOtp(Array(6).fill(''))
    setPin('')
    setReceipt(null)
    setTxRef('')
    setStep('method')
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Move Money</h2>
          <p className="text-sm text-gray-500">Send funds securely. All transfers require two-factor authorization.</p>
        </div>
        <Stepper step={step}/>
      </div>

      {step === 'method'      && <MethodStep form={form} accounts={accounts} upd={upd} next={goToBeneficiary}/>}
      {step === 'beneficiary' && <BeneficiaryStep form={form} accounts={accounts} upd={upd} setForm={setForm} recents={recentRecipients} back={() => setStep('method')} next={goToAmount}/>}
      {step === 'amount'      && <AmountStep form={form} source={sourceAccount} amountNum={amountNum} feeAmount={feeAmount} totalDebit={totalDebit} upd={upd} currencies={currencies} back={() => setStep('beneficiary')} next={goToReview}/>}
      {step === 'review'      && <ReviewStep form={form} accounts={accounts} amountNum={amountNum} feeAmount={feeAmount} totalDebit={totalDebit} sending={initMutation.isPending} pin={pin} setPin={setPin} back={() => setStep('amount')} confirm={submitTransfer}/>}
      {step === 'authorize'   && <AuthorizeStep otp={otp} setOtp={setOtp} pending={verifyMutation.isPending} submit={submitOtp} resend={resendOtp} cancel={() => setStep('review')}/>}
      {step === 'receipt'     && receipt && <ReceiptStep form={form} receipt={receipt} startOver={startOver}/>}
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ['method', 'beneficiary', 'amount', 'review', 'authorize', 'receipt']
  const idx = steps.indexOf(step)
  return (
    <div className="flex items-center gap-1">
      {steps.slice(0, 5).map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all
          ${i < idx ? 'bg-green-500 w-6' : i === idx ? 'bg-navy-600 w-10' : 'bg-gray-200 w-6'}`}/>
      ))}
    </div>
  )
}

// ── Step 1: choose method ──────────────────────────────────────────────────
function MethodStep({ form, accounts, upd, next }: any) {
  const anyBlocked = accounts.some((a: any) => a.status !== 'active')
  return (
    <div className="space-y-6">
      {anyBlocked && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🛑</span>
          <div className="text-sm">
            <p className="font-bold text-red-900">Some of your accounts are blocked</p>
            <p className="text-red-800 mt-0.5 leading-relaxed text-xs">
              Blocked accounts cannot be used to send or receive money. Please contact
              your <span className="font-semibold">account officer</span> to have the block reviewed.
            </p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">From which account?</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {accounts.map((a: any) => {
            const blocked = a.status !== 'active'
            return (
              <button key={a.id}
                onClick={() => {
                  if (blocked) return
                  upd('from_account_id', a.id)
                }}
                disabled={blocked}
                className={`relative text-left p-4 rounded-xl border-2 transition-all
                  ${blocked
                    ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-70'
                    : form.from_account_id === a.id ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-widest text-gray-400">{a.type}</p>
                  {blocked && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      🛑 {a.status}
                    </span>
                  )}
                </div>
                <p className={`font-serif text-xl font-bold mt-1 ${blocked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {fmt(a.balance)}
                </p>
                <p className="text-xs font-mono text-gray-500 mt-1">{a.number}</p>
                {blocked && (
                  <p className="text-xs text-red-700 mt-2 font-semibold">Transfers disabled — contact support</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">How would you like to send?</h3>
        <div className="space-y-2">
          {(Object.keys(METHODS) as Method[]).map(k => {
            const m = METHODS[k]
            const Icon = m.icon
            const selected = form.method === k
            return (
              <button key={k} onClick={() => upd('method', k)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4
                  ${selected ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:border-gray-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${selected ? 'bg-navy-600 text-white' : 'bg-gray-100 text-navy-600'}`}>
                  <Icon size={20}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{m.label}</p>
                    <p className="text-xs font-mono text-gray-500">
                      {m.fee > 0 ? `${fmt(m.fee)} fee` : 'No fee'} • {m.speed}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{m.blurb}</p>
                </div>
                <ChevronRight size={18} className={selected ? 'text-navy-600' : 'text-gray-300'}/>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0"/>
          Daily limits apply. Wire cut-off times are in Eastern Time. Same-day execution requires submission before cut-off.
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={next} className="px-8 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all flex items-center gap-2">
          Continue <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  )
}

// ── Step 2: beneficiary details ────────────────────────────────────────────
function BeneficiaryStep({ form, accounts, upd, setForm, recents, back, next }: any) {
  const m = form.method as Method
  const matchingRecents = (recents as RecentRecipient[]).filter(r => r.method === m)

  const fillFromRecipient = (r: RecentRecipient) => {
    setForm((prev: FormState) => ({
      ...prev,
      beneficiary_name: r.name,
      beneficiary_bank: r.beneficiary_bank || '',
      beneficiary_account: r.beneficiary_account || '',
      beneficiary_routing: r.beneficiary_routing || '',
      beneficiary_address: r.beneficiary_address || '',
      to_destination: r.to_destination || r.name,
    }))
    toast.success(`Filled details for ${r.name}`)
  }

  return (
    <div className="space-y-6">
      {/* Recent recipients quick-pick */}
      {matchingRecents.length > 0 && m !== 'internal' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-navy-600"/>
            <h3 className="font-semibold text-gray-900 text-sm">Recent recipients</h3>
            <span className="text-xs text-gray-400">tap to fill in</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {matchingRecents.map((r, i) => (
              <button key={i} onClick={() => fillFromRecipient(r)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-navy-600 hover:bg-navy-50 transition-all">
                <div className="w-7 h-7 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center flex-shrink-0">
                  <User size={13}/>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-900">{r.name}</p>
                  <p className="text-[10px] text-gray-500">{r.beneficiary_bank || METHODS[r.method].label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Recipient Information</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {m === 'internal' && 'Choose one of your own GV Union Bank accounts as the destination.'}
            {m === 'ach' && 'Standard ACH transfer to a US bank — funds typically settle in 1–3 business days.'}
            {m === 'zelle' && 'Sending to a Zelle-registered contact using their email or US mobile number.'}
            {m === 'domestic_wire' && 'Domestic wire via Fedwire. Final, irrevocable once authorized.'}
            {m === 'international_wire' && 'SWIFT international wire. Provide full beneficiary details for compliance.'}
          </p>
        </div>

        {m === 'internal' && (
          <div>
            <label className="label">Destination account</label>
            <select className="input" value={form.to_destination} onChange={e => upd('to_destination', e.target.value)}>
              <option value="">Select an account…</option>
              {accounts
                .filter((a: any) => a.id !== form.from_account_id && a.status === 'active')
                .map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.type.charAt(0).toUpperCase() + a.type.slice(1)} — {a.number} ({fmt(a.balance)})
                  </option>
                ))}
              {accounts.filter((a: any) => a.status !== 'active').map((a: any) => (
                <option key={a.id} value="" disabled>
                  🛑 {a.type} {a.number} — {a.status.toUpperCase()} (blocked)
                </option>
              ))}
            </select>
          </div>
        )}

        {m === 'zelle' && (
          <div className="space-y-4">
            <div>
              <label className="label">Recipient name</label>
              <input className="input" value={form.beneficiary_name}
                     onChange={e => upd('beneficiary_name', e.target.value)} placeholder="Jane Doe"/>
            </div>
            <div>
              <label className="label">Email or US mobile number</label>
              <input className="input" value={form.to_destination}
                     onChange={e => upd('to_destination', e.target.value)} placeholder="jane@email.com or +1 555 123 4567"/>
            </div>
          </div>
        )}

        {(m === 'ach' || m === 'domestic_wire' || m === 'international_wire') && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Beneficiary name *</label>
                <input className="input" value={form.beneficiary_name}
                       onChange={e => upd('beneficiary_name', e.target.value)}
                       placeholder="Legal name as on bank account"/>
              </div>
              <div>
                <label className="label">Beneficiary bank *</label>
                <input className="input" value={form.beneficiary_bank}
                       onChange={e => upd('beneficiary_bank', e.target.value)}
                       placeholder={m === 'international_wire' ? 'e.g. Barclays Bank UK PLC' : 'e.g. JPMorgan Chase Bank, N.A.'}/>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{m === 'international_wire' ? 'IBAN / Account number *' : 'Account number *'}</label>
                <input className="input font-mono" value={form.beneficiary_account}
                       onChange={e => upd('beneficiary_account', e.target.value)}
                       placeholder={m === 'international_wire' ? 'GB29 NWBK 6016 1331 9268 19' : '1234567890'}/>
              </div>
              <div>
                <label className="label">{m === 'international_wire' ? 'SWIFT / BIC code *' : 'Routing (ABA) number *'}</label>
                <input className="input font-mono" value={form.beneficiary_routing}
                       onChange={e => upd('beneficiary_routing', e.target.value)}
                       placeholder={m === 'international_wire' ? 'BARCGB22XXX' : '021000021'} maxLength={m === 'international_wire' ? 11 : 9}/>
              </div>
            </div>
            <div>
              <label className="label">Beneficiary address {m === 'international_wire' && '*'}</label>
              <input className="input" value={form.beneficiary_address}
                     onChange={e => upd('beneficiary_address', e.target.value)}
                     placeholder="Street, City, State/Province, Postal code, Country"/>
              {m === 'international_wire' && (
                <p className="text-xs text-gray-400 mt-1">Required by FinCEN for international transfers $3,000+</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={next} className="px-8 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all flex items-center gap-2">
          Continue <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  )
}

// ── Step 3: amount & purpose ───────────────────────────────────────────────
function AmountStep({ form, source, amountNum, feeAmount, totalDebit, upd, currencies, back, next }: any) {
  const isWire = form.method === 'domestic_wire' || form.method === 'international_wire'
  const method = METHODS[form.method as Method]
  const overLimit = amountNum > method.per_tx_limit
  const showFx = form.method === 'international_wire'
  const targetCode = (form.target_currency || 'EUR') as string
  const targetInfo = currencies?.[targetCode] || { rate: 1, symbol: '€', name: 'Euro', country: 'Eurozone' }
  const convertedAmount = amountNum * (targetInfo.rate || 1)

  return (
    <div className="space-y-6">
      {/* Limits banner */}
      <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Per transaction</p>
          <p className="font-mono font-semibold text-navy-600 text-sm mt-0.5">{fmt(method.per_tx_limit)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Daily limit</p>
          <p className="font-mono font-semibold text-navy-600 text-sm mt-0.5">{fmt(method.daily_limit)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Fee</p>
          <p className="font-mono font-semibold text-navy-600 text-sm mt-0.5">{method.fee === 0 ? 'No fee' : fmt(method.fee)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Settles</p>
          <p className="font-semibold text-navy-600 text-sm mt-0.5">{method.speed.split('(')[0].trim()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Amount</h3>

        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-serif text-3xl">€</span>
          <input type="number" inputMode="decimal" min="0.01" step="0.01"
            className="w-full pl-12 pr-4 py-6 border-2 border-gray-200 rounded-2xl font-serif text-4xl font-bold outline-none focus:border-navy-600 transition-all"
            placeholder="0.00" value={form.amount}
            onChange={e => upd('amount', e.target.value)}/>
        </div>

        {source && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Available in {source.type}</span>
            <span className="font-mono font-semibold text-gray-900">{fmt(source.balance)}</span>
          </div>
        )}

        {/* Currency conversion (international wires) */}
        {showFx && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">Recipient receives in</label>
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <select className="input"
                      value={form.target_currency}
                      onChange={e => upd('target_currency', e.target.value)}>
                {Object.entries(currencies || {}).map(([code, info]: any) => (
                  <option key={code} value={code}>
                    {info.symbol} {code} — {info.name} ({info.country})
                  </option>
                ))}
              </select>
              <div className="input bg-gray-50 flex items-center justify-end text-right">
                {targetCode !== 'EUR' ? (
                  <span className="font-mono font-bold text-navy-600 text-base">
                    {targetInfo.symbol}{convertedAmount.toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">no conversion</span>
                )}
              </div>
            </div>
            {targetCode !== 'EUR' && amountNum > 0 && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <span>Rate: 1 EUR = {targetInfo.rate} {targetCode}</span>
                <span className="text-gray-300">·</span>
                <span>Includes 0.5% retail FX markup</span>
              </p>
            )}
          </div>
        )}

        {feeAmount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-mono text-gray-900">{fmt(amountNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{METHODS[form.method as Method].label} fee</span>
              <span className="font-mono text-gray-900">{fmt(feeAmount)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Total debit</span>
              <span className="font-mono font-bold text-gray-900">{fmt(totalDebit)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {isWire && (
          <div>
            <label className="label">Purpose of wire * <span className="text-gray-400 normal-case font-normal">(required by OFAC)</span></label>
            <select className="input" value={form.wire_purpose} onChange={e => upd('wire_purpose', e.target.value)}>
              <option value="">Select a purpose…</option>
              <option value="family_support">Family support / personal remittance</option>
              <option value="goods_services">Payment for goods or services</option>
              <option value="property_purchase">Property / real-estate purchase</option>
              <option value="investment">Investment / brokerage funding</option>
              <option value="tuition">Tuition or education expense</option>
              <option value="medical">Medical / healthcare expense</option>
              <option value="payroll">Payroll / contractor payment</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Memo / reference for recipient <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <input className="input" value={form.memo} onChange={e => upd('memo', e.target.value)}
                 placeholder="Invoice #1234 / Rent August" maxLength={140}/>
        </div>
      </div>

      {overLimit && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-red-900">
            Amount exceeds the per-transaction limit of {fmt(method.per_tx_limit)} for {method.label}.
            Either lower the amount, or split into multiple transfers.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={back} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={next} disabled={overLimit}
          className="px-8 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50 flex items-center gap-2">
          Review →
        </button>
      </div>
    </div>
  )
}

// ── Step 4: review & confirm ──────────────────────────────────────────────
function ReviewStep({ form, accounts, amountNum, feeAmount, totalDebit, sending, pin, setPin, back, confirm }: any) {
  const m = form.method as Method
  const source = accounts.find((a: any) => a.id === form.from_account_id)
  const destAcc = m === 'internal' ? accounts.find((a: any) => a.id === form.to_destination) : null

  const Row = ({ label, value, mono = false }: any) => (
    <div className="flex items-start justify-between py-2.5 gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-gray-900 text-right break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-navy-600 text-white px-6 py-5">
          <p className="text-white/60 text-xs uppercase tracking-widest">You are sending</p>
          <p className="font-serif text-4xl font-bold mt-1">{fmt(amountNum)}</p>
          <p className="text-white/70 text-sm mt-1">via {METHODS[m].label}</p>
        </div>
        <div className="px-6 py-2 divide-y divide-gray-100">
          <Row label="From"     value={source ? `${source.type[0].toUpperCase()+source.type.slice(1)} ${source.number}` : ''} mono/>
          {m === 'internal' ? (
            <Row label="To"     value={destAcc ? `${destAcc.type[0].toUpperCase()+destAcc.type.slice(1)} ${destAcc.number}` : ''} mono/>
          ) : (
            <>
              <Row label="Beneficiary"          value={form.beneficiary_name}/>
              {m === 'zelle'
                ? <Row label="Send to"          value={form.to_destination} mono/>
                : <>
                    <Row label="Bank"           value={form.beneficiary_bank}/>
                    <Row label={m === 'international_wire' ? 'IBAN / Account' : 'Account number'} value={form.beneficiary_account} mono/>
                    <Row label={m === 'international_wire' ? 'SWIFT / BIC' : 'Routing (ABA)'}      value={form.beneficiary_routing} mono/>
                    {form.beneficiary_address && <Row label="Address" value={form.beneficiary_address}/>}
                  </>
              }
            </>
          )}
          {form.target_currency && form.target_currency !== 'EUR' && (
            <Row label="Recipient currency" value={form.target_currency}/>
          )}
          {form.wire_purpose && <Row label="Purpose" value={form.wire_purpose.replace(/_/g,' ')}/>}
          {form.memo         && <Row label="Memo"    value={form.memo}/>}
        </div>
        <div className="bg-gray-50 px-6 py-4 space-y-1.5 text-sm border-t border-gray-100">
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-mono">{fmt(amountNum)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Fee</span><span className="font-mono">{fmt(feeAmount)}</span></div>
          <div className="flex justify-between pt-1.5 border-t border-gray-200"><span className="font-semibold">Total debit</span><span className="font-mono font-bold">{fmt(totalDebit)}</span></div>
        </div>
      </div>

      {(m === 'domestic_wire' || m === 'international_wire') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18}/>
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Wire transfers are final.</p>
            <p className="text-amber-800 mt-0.5">
              Once authorized, this wire cannot be reversed by GV Union Bank. Please verify the beneficiary details carefully.
              Federal regulations require us to disclose this notice.
            </p>
          </div>
        </div>
      )}

      {/* 4-digit transaction PIN (required if admin has set one) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900">Transaction PIN</span>
          <span className="text-xs text-gray-500">— required if your account has a PIN set</span>
        </div>
        <div className="flex gap-3">
          {[0,1,2,3].map(i => (
            <input
              key={i}
              id={`tx-pin-${i}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={pin[i] || ''}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '')
                const arr = (pin || '').padEnd(4, ' ').split('')
                arr[i] = v || ' '
                setPin(arr.join('').replace(/ /g, ''))
                if (v && i < 3) {
                  const el = document.getElementById(`tx-pin-${i+1}`) as HTMLInputElement | null
                  el?.focus()
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !(pin[i]) && i > 0) {
                  const el = document.getElementById(`tx-pin-${i-1}`) as HTMLInputElement | null
                  el?.focus()
                }
              }}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-navy-600 focus:outline-none"
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Leave blank if you have not been issued a PIN.</p>
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={confirm} disabled={sending}
                className="px-8 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-60 flex items-center gap-2">
          {sending ? 'Sending authorization code…' : <>Authorize Transfer <ChevronRight size={16}/></>}
        </button>
      </div>
    </div>
  )
}

// ── Step 5: OTP authorize ─────────────────────────────────────────────────
function AuthorizeStep({ otp, setOtp, pending, submit, resend, cancel }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mx-auto mb-4">
        <Shield className="text-gold-400" size={28}/>
      </div>
      <h3 className="font-serif text-2xl font-bold text-navy-600 mb-1">Authorize Transfer</h3>
      <p className="text-gray-500 text-sm mb-6">Enter the 6-digit authorization code we sent to your email and phone.</p>

      <OTPInput value={otp} onChange={setOtp}/>

      <button onClick={submit} disabled={pending || otp.join('').length < 6}
              className="w-full py-4 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all disabled:opacity-50 text-sm mt-2">
        {pending ? 'Verifying…' : 'Confirm & Send →'}
      </button>

      <div className="flex items-center justify-between gap-3 mt-4 text-sm">
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600">Cancel</button>
        <button onClick={resend} className="text-navy-600 font-semibold hover:underline">Resend code</button>
      </div>
      <p className="text-xs text-gray-400 mt-3">Code expires in 10 minutes</p>
    </div>
  )
}

// ── Step 6: receipt ────────────────────────────────────────────────────────
function ReceiptStep({ form, receipt, startOver }: any) {
  const m = form.method as Method
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
        <div className="bg-green-50 px-6 py-5 flex items-center gap-3 border-b border-green-100">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <CheckCircle2 size={20}/>
          </div>
          <div>
            <p className="font-serif text-lg font-bold text-green-900">Transfer Authorized</p>
            <p className="text-xs text-green-700">Reference {receipt.reference}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs uppercase tracking-widest text-gray-400">Amount sent</p>
          <p className="font-serif text-4xl font-bold text-gray-900 mt-1">{fmt(receipt.amount)}</p>
          <p className="text-sm text-gray-500 mt-1">to <span className="font-semibold text-gray-900">{receipt.beneficiary}</span></p>
        </div>

        <div className="px-6 pb-4 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Method</span><span className="font-semibold">{METHODS[m].label}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Status</span><span className="text-green-600 font-semibold">Completed</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Expected settlement</span><span className="font-semibold">{METHODS[m].speed}</span></div>
          {receipt.target_currency && receipt.target_currency !== 'EUR' && (
            <>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">Recipient receives</span>
                <span className="font-mono font-bold text-navy-600">
                  {receipt.target_currency} {(receipt.target_amount || 0).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-gray-500">Exchange rate</span>
                <span className="font-mono text-xs">1 EUR = {receipt.exchange_rate} {receipt.target_currency}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Fee</span><span className="font-mono">{fmt(receipt.fee)}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Total debited</span><span className="font-mono font-bold">{fmt(receipt.total)}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">New balance</span><span className="font-mono font-bold">{fmt(receipt.new_balance)}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Reference number</span><span className="font-mono">{receipt.reference}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Confirmation ID</span><span className="font-mono text-xs">{receipt.transaction_id}</span></div>
          <div className="flex justify-between py-2.5"><span className="text-gray-500">Date</span><span>{new Date().toLocaleString()}</span></div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
          Keep this receipt for your records. For wire transfers, the beneficiary's bank may take additional time to credit
          the recipient's account depending on local cut-off times and intermediary banks.
        </div>
      </div>

      <div className="flex justify-between gap-3 flex-wrap">
        <button onClick={() => window.print()}
                className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2">
          <Printer size={16}/> Print receipt
        </button>
        <button onClick={startOver}
                className="px-8 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-[#1e3a5f] transition-all">
          Make Another Transfer →
        </button>
      </div>
    </div>
  )
}
