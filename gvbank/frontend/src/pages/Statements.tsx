import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI } from '../services/api'
import { Search, Download, Filter, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react'

const fmt = (n: number) =>
  '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

type Tx = {
  id: string
  type: string
  status: string
  amount: number
  description: string
  memo: string | null
  category: string | null
  transfer_method: string | null
  beneficiary_name: string | null
  beneficiary_bank: string | null
  fee: number | null
  reference: string | null
  created_at: string
}

export function StatementsPage() {
  const [accountId, setAccountId] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Tx | null>(null)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data) })
  const { data: allTx = [], isLoading } = useQuery({
    queryKey: ['all-tx'],
    queryFn: () => accountsAPI.allTransactions().then(r => r.data as Tx[]),
  })

  const filtered = useMemo(() => {
    return allTx.filter(t => {
      if (type !== 'all'   && t.type   !== type)   return false
      if (status !== 'all' && t.status !== status) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${t.description} ${t.memo || ''} ${t.beneficiary_name || ''} ${t.reference || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (from && t.created_at < from) return false
      if (to   && t.created_at > to + 'T23:59:59') return false
      return true
    })
  }, [allTx, type, status, search, from, to, accountId])

  const totals = useMemo(() => {
    let credits = 0, debits = 0
    for (const t of filtered) {
      if (t.amount > 0) credits += t.amount
      else              debits  += Math.abs(t.amount)
    }
    return { credits, debits, net: credits - debits }
  }, [filtered])

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Beneficiary', 'Method', 'Category', 'Status', 'Reference', 'Fee', 'Amount']
    const rows = filtered.map(t => [
      fmtDateTime(t.created_at),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.beneficiary_name || '').replace(/"/g, '""')}"`,
      t.transfer_method || '',
      t.category || '',
      t.status,
      t.reference || '',
      (t.fee ?? 0).toFixed(2),
      t.amount.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gvbank-statement-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setAccountId('all'); setType('all'); setStatus('all'); setSearch(''); setFrom(''); setTo('')
  }

  const hasFilters = accountId !== 'all' || type !== 'all' || status !== 'all' || search || from || to

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Statements & History</h2>
          <p className="text-sm text-gray-500">Search, filter and export your transaction history.</p>
        </div>
        <button onClick={exportCSV} disabled={!filtered.length}
                className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-50">
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Credits</p>
          <p className="font-serif text-xl font-bold text-green-600 mt-1">+{fmt(totals.credits)}</p>
          <p className="text-xs text-gray-400 mt-1">Money in</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Debits</p>
          <p className="font-serif text-xl font-bold text-red-600 mt-1">−{fmt(totals.debits)}</p>
          <p className="text-xs text-gray-400 mt-1">Money out</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Net</p>
          <p className={`font-serif text-xl font-bold mt-1 ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totals.net >= 0 ? '+' : '−'}{fmt(totals.net)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} transactions</p>
        </div>
      </div>

      {/* Monthly trend bar chart */}
      <MonthlyTrend transactions={filtered}/>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14}/> Filters
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-navy-600 font-semibold hover:underline flex items-center gap-1">
              <X size={12}/> Clear
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-10" placeholder="Search description, memo, beneficiary or reference…"
                 value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account</label>
            <select className="input mt-1" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.type.charAt(0).toUpperCase()+a.type.slice(1)} {a.number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type</label>
            <select className="input mt-1" value={type} onChange={e => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="transfer">Transfer</option>
              <option value="wire">Wire</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</label>
            <select className="input mt-1" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="held">Held</option>
              <option value="blocked">Blocked</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">From</label>
              <input type="date" className="input mt-1" value={from} onChange={e => setFrom(e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">To</label>
              <input type="date" className="input mt-1" value={to} onChange={e => setTo(e.target.value)}/>
            </div>
          </div>
        </div>
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center gap-3 sm:gap-5 overflow-x-auto text-xs">
        <span className="text-gray-500 font-semibold uppercase tracking-widest whitespace-nowrap">Statuses</span>
        {[
          { label: 'Completed', color: 'bg-green-500'  },
          { label: 'Pending',   color: 'bg-amber-500'  },
          { label: 'Held',      color: 'bg-purple-500' },
          { label: 'Blocked',   color: 'bg-red-500'    },
          { label: 'Rejected',  color: 'bg-gray-500'   },
        ].map(s => (
          <span key={s.label} className="flex items-center gap-1.5 text-gray-600 whitespace-nowrap">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`}/> {s.label}
          </span>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {isLoading && <p className="text-center text-gray-400 text-sm py-10">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">No transactions match your filters</p>
          )}
          {filtered.map(tx => <TransactionRow key={tx.id} tx={tx} onSelect={() => setSelected(tx)}/>)}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-serif text-lg font-bold text-gray-900">Transaction Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>
            <div className="px-6 py-4">
              <p className={`font-serif text-3xl font-bold ${selected.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {selected.amount > 0 ? '+' : '−'}{fmt(selected.amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{selected.description}</p>
            </div>
            <div className="px-6 pb-4 divide-y divide-gray-100 text-sm">
              <Row label="Status"          value={selected.status}/>
              <Row label="Type"            value={selected.type}/>
              <Row label="Method"          value={selected.transfer_method || '—'}/>
              <Row label="Category"        value={selected.category || '—'}/>
              {selected.beneficiary_name && <Row label="Beneficiary" value={selected.beneficiary_name}/>}
              {selected.beneficiary_bank && <Row label="Bank"        value={selected.beneficiary_bank}/>}
              {selected.fee != null && selected.fee > 0 && <Row label="Fee" value={fmt(selected.fee)} mono/>}
              {selected.reference && <Row label="Reference" value={selected.reference} mono/>}
              <Row label="Confirmation ID" value={selected.id} mono small/>
              <Row label="Date"            value={fmtDateTime(selected.created_at)}/>
              {selected.memo && <Row label="Memo" value={selected.memo}/>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Enhanced transaction row with prominent status display ────────────────
const STATUS_STYLES: Record<string, { border: string; badge: string; label: string; icon?: string }> = {
  completed: { border: 'border-l-green-500',  badge: 'bg-green-50 text-green-700 border border-green-100',  label: 'Completed' },
  pending:   { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',  label: 'Pending', icon: '⏳' },
  held:      { border: 'border-l-purple-500', badge: 'bg-purple-50 text-purple-700 border border-purple-100', label: 'On hold', icon: '⏸' },
  blocked:   { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-700 border border-red-200',        label: 'Blocked', icon: '🛑' },
  failed:    { border: 'border-l-gray-400',   badge: 'bg-gray-100 text-gray-600 border border-gray-200',    label: 'Failed',  icon: '✕' },
  rejected:  { border: 'border-l-gray-500',   badge: 'bg-gray-100 text-gray-700 border border-gray-200',    label: 'Rejected', icon: '✕' },
}

function TransactionRow({ tx, onSelect }: { tx: Tx; onSelect: () => void }) {
  const style = STATUS_STYLES[tx.status] || STATUS_STYLES.completed
  const isPending = tx.status === 'pending' || tx.status === 'held'
  return (
    <button onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 pl-3 pr-5 py-3.5 border-l-4 hover:bg-gray-50 transition-colors ${style.border}
        ${tx.status === 'blocked' ? 'bg-red-50/30' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-navy-600'}`}>
        {tx.amount > 0 ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${
            tx.status === 'blocked' || tx.status === 'rejected' || tx.status === 'failed'
              ? 'text-gray-600 line-through decoration-1'
              : 'text-gray-900'
          }`}>{tx.description}</p>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${style.badge}`}>
            {style.icon && <span>{style.icon}</span>}
            {style.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {fmtDate(tx.created_at)}{tx.reference ? ` · ${tx.reference}` : ''}
          {isPending && ' · funds not yet moved'}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold font-mono ${
          tx.status === 'blocked' || tx.status === 'rejected' || tx.status === 'failed'
            ? 'text-gray-400 line-through'
            : tx.amount > 0 ? 'text-green-600' : 'text-gray-900'
        }`}>
          {tx.amount > 0 ? '+' : '−'}{fmt(tx.amount)}
        </p>
      </div>
    </button>
  )
}

function Row({ label, value, mono = false, small = false }: any) {
  return (
    <div className="flex items-start justify-between py-2.5 gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold text-gray-900 text-right break-all ${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''}`}>{value}</span>
    </div>
  )
}

// ── Monthly trend bar chart ───────────────────────────────────────────────
function MonthlyTrend({ transactions }: { transactions: Tx[] }) {
  const months = useMemo(() => {
    const now = new Date()
    const arr: { label: string; key: string; credits: number; debits: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push({
        label: d.toLocaleString('en-US', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        credits: 0, debits: 0,
      })
    }
    for (const t of transactions) {
      const key = t.created_at.slice(0, 7)
      const m = arr.find(x => x.key === key)
      if (!m) continue
      if (t.amount > 0) m.credits += t.amount
      else              m.debits  += Math.abs(t.amount)
    }
    return arr
  }, [transactions])

  const peak = Math.max(...months.flatMap(m => [m.credits, m.debits]), 1)
  const hasData = months.some(m => m.credits || m.debits)

  if (!hasData) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">Last 6 months</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded"/> Money in</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-400 rounded"/> Money out</span>
        </div>
      </div>
      <div className="flex items-end gap-2 sm:gap-4 h-32">
        {months.map(m => {
          const cH = Math.max(2, (m.credits / peak) * 100)
          const dH = Math.max(2, (m.debits  / peak) * 100)
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end justify-center gap-1 h-full">
                <div className="w-1/2 bg-green-500 rounded-t" style={{ height: `${cH}%` }} title={'+$' + m.credits.toFixed(0)}/>
                <div className="w-1/2 bg-gray-400 rounded-t" style={{ height: `${dH}%` }} title={'−$' + m.debits.toFixed(0)}/>
              </div>
              <p className="text-xs text-gray-500 mt-2">{m.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
