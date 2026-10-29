import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI } from '../services/api'
import { Search, Download, Filter, ArrowUpRight, ArrowDownLeft, X, Building2, Hash, Calendar, FileText, Printer, CreditCard, Globe } from 'lucide-react'

const fmt = (n: number) =>
  '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

const methodLabel = (m: string | null | undefined) => {
  if (!m) return '—'
  const map: Record<string, string> = {
    international_wire: 'International Wire',
    domestic_wire: 'Domestic Wire',
    wire: 'Wire Transfer',
    ach: 'ACH Transfer',
    internal: 'Internal Transfer',
    zelle: 'Zelle',
  }
  return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

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

function openOfficialReceipt(tx: Tx) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>GV Union Bank — Receipt ${tx.reference || tx.id.slice(0,8)}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #0a1628; margin: 0; padding: 40px; background: #fff; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #c9a84c; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-mark { width: 48px; height: 48px; background: linear-gradient(135deg, #c9a84c, #e8c97a); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; color: #0a1628; }
  .bank-name { font-size: 22px; font-weight: 700; color: #0a1628; }
  .tagline { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #c9a84c; margin-top: 2px; }
  .receipt-title { font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b6560; }
  .amount { font-size: 36px; font-weight: 700; margin: 8px 0 4px; }
  .amount.credit { color: #1a7a4a; }
  .amount.debit { color: #0a1628; }
  .desc { color: #6b6560; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #e4e2dc; vertical-align: top; }
  td.label { color: #6b6560; width: 40%; font-size: 13px; }
  td.value { font-weight: 600; text-align: right; font-size: 13px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e2dc; font-size: 11px; color: #9a9589; line-height: 1.6; }
  .badge { display: inline-block; background: #0a1628; color: #c9a84c; font-size: 10px; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 4px; margin-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-mark">G</div>
      <div>
        <div class="bank-name">GV Union Bank</div>
        <div class="tagline">Member FDIC · Equal Housing Lender</div>
      </div>
    </div>
    <div class="receipt-title">Official Receipt</div>
  </div>

  <div class="amount ${tx.amount > 0 ? 'credit' : 'debit'}">${tx.amount > 0 ? '+' : '−'}${fmt(tx.amount)}</div>
  <div class="desc">${tx.description}</div>
  <div class="badge">${tx.status.toUpperCase()}</div>

  <table>
    <tr><td class="label">Posted</td><td class="value">${fmtDateTime(tx.created_at)}</td></tr>
    <tr><td class="label">Type</td><td class="value">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td></tr>
    <tr><td class="label">Method</td><td class="value">${methodLabel(tx.transfer_method)}</td></tr>
    <tr><td class="label">Category</td><td class="value">${tx.category || '—'}</td></tr>
    ${tx.beneficiary_name ? `<tr><td class="label">Beneficiary</td><td class="value">${tx.beneficiary_name}</td></tr>` : ''}
    ${tx.beneficiary_bank ? `<tr><td class="label">Beneficiary Bank</td><td class="value">${tx.beneficiary_bank}</td></tr>` : ''}
    ${tx.fee && tx.fee > 0 ? `<tr><td class="label">Fee</td><td class="value">${fmt(tx.fee)}</td></tr>` : ''}
    ${tx.reference ? `<tr><td class="label">Reference</td><td class="value" style="font-family:monospace">${tx.reference}</td></tr>` : ''}
    <tr><td class="label">Confirmation ID</td><td class="value" style="font-family:monospace;font-size:11px">${tx.id}</td></tr>
    ${tx.memo ? `<tr><td class="label">Memo</td><td class="value">${tx.memo}</td></tr>` : ''}
  </table>

  <div class="footer">
    This is an official electronic receipt issued by GV Union Bank, N.A.<br/>
    For questions contact your account officer or security@gvunionbank.com<br/>
    Generated ${new Date().toLocaleString()} · Member FDIC
  </div>
</body>
</html>`
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }
}

export function StatementsPage() {
  const [accountId, setAccountId] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [method, setMethod] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Tx | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data) })
  const { data: allTx = [], isLoading } = useQuery({
    queryKey: ['all-tx'],
    queryFn: () => accountsAPI.allTransactions().then(r => r.data as Tx[]),
  })

  const filtered = useMemo(() => {
    return allTx.filter(t => {
      if (type !== 'all'   && t.type   !== type)   return false
      if (status !== 'all' && t.status !== status) return false
      if (method !== 'all' && t.transfer_method !== method) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${t.description} ${t.memo || ''} ${t.beneficiary_name || ''} ${t.beneficiary_bank || ''} ${t.reference || ''} ${t.category || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (from && t.created_at < from) return false
      if (to   && t.created_at > to + 'T23:59:59') return false
      return true
    })
  }, [allTx, type, status, method, search, from, to])

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1) }, [type, status, method, search, from, to])

  const totals = useMemo(() => {
    let credits = 0, debits = 0, fees = 0
    for (const t of filtered) {
      if (t.amount > 0) credits += t.amount
      else              debits  += Math.abs(t.amount)
      if (t.fee) fees += t.fee
    }
    return { credits, debits, net: credits - debits, fees, count: filtered.length }
  }, [filtered])

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>()
    for (const t of filtered) {
      const key = t.created_at.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Beneficiary', 'Bank', 'Method', 'Category', 'Status', 'Reference', 'Fee', 'Amount']
    const rows = filtered.map(t => [
      fmtDateTime(t.created_at),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.beneficiary_name || '').replace(/"/g, '""')}"`,
      `"${(t.beneficiary_bank || '').replace(/"/g, '""')}"`,
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
    setAccountId('all'); setType('all'); setStatus('all'); setMethod('all'); setSearch(''); setFrom(''); setTo('')
  }

  const hasFilters = accountId !== 'all' || type !== 'all' || status !== 'all' || method !== 'all' || search || from || to

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Statements & History</h2>
          <p className="text-sm text-gray-500">Full transaction history with search, filters, and official receipts.</p>
        </div>
        <button onClick={exportCSV} disabled={!filtered.length}
                className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-50">
          <Download size={14}/> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <p className="text-xs uppercase tracking-widest text-gray-400">Fees</p>
          <p className="font-serif text-xl font-bold text-gray-900 mt-1">{fmt(totals.fees)}</p>
          <p className="text-xs text-gray-400 mt-1">Total fees</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Net</p>
          <p className={`font-serif text-xl font-bold mt-1 ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totals.net >= 0 ? '+' : '−'}{fmt(totals.net)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totals.count} transactions</p>
        </div>
      </div>

      <MonthlyTrend transactions={filtered}/>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14}/> Filters
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-navy-600 font-semibold hover:underline flex items-center gap-1">
              <X size={12}/> Clear all
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-10" placeholder="Search description, memo, beneficiary, bank or reference…"
                 value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Method</label>
            <select className="input mt-1" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="all">All methods</option>
              <option value="international_wire">International Wire</option>
              <option value="domestic_wire">Domestic Wire</option>
              <option value="ach">ACH</option>
              <option value="wire">Wire</option>
              <option value="internal">Internal</option>
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

      <div className="space-y-4">
        {isLoading && <p className="text-center text-gray-400 text-sm py-10">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">No transactions match your filters</p>
          </div>
        )}
        {(() => {
          const start = (page - 1) * PAGE_SIZE
          const paged = filtered.slice(start, start + PAGE_SIZE)
          const pagedGrouped = new Map<string, Tx[]>()
          for (const t of paged) {
            const key = t.created_at.slice(0, 7)
            if (!pagedGrouped.has(key)) pagedGrouped.set(key, [])
            pagedGrouped.get(key)!.push(t)
          }
          return Array.from(pagedGrouped.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, txs]) => {
          const monthCredits = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
          const monthDebits = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
          const label = new Date(month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })
          return (
            <div key={month} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{label}</h3>
                <div className="text-xs text-gray-500 flex gap-3">
                  <span className="text-green-600">+{fmt(monthCredits)}</span>
                  <span className="text-red-600">−{fmt(monthDebits)}</span>
                  <span>{txs.length} txns</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {txs.map(tx => <TransactionRow key={tx.id} tx={tx} onSelect={() => setSelected(tx)}/>)}
              </div>
            </div>
          )
        })
      })()}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-2 py-3 text-sm">
            <span className="text-gray-500">Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 text-sm">Prev</button>
              <button disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 text-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-serif text-lg font-bold text-gray-900">Transaction Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
            </div>

            <div className="px-6 py-6 border-b border-gray-100 text-center">
              <p className={`font-serif text-4xl font-bold ${selected.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {selected.amount > 0 ? '+' : '−'}{fmt(selected.amount)}
              </p>
              <p className="text-sm text-gray-600 mt-2">{selected.description}</p>
              {selected.reference && (
                <p className="text-xs text-gray-400 font-mono mt-2">Ref {selected.reference}</p>
              )}
            </div>

            <div className="px-6 py-4 space-y-5">
              <Section title="Transaction">
                <DetailRow icon={<Calendar size={14}/>} label="Posted" value={fmtDateTime(selected.created_at)}/>
                <DetailRow icon={<FileText size={14}/>} label="Status" value={selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}/>
                <DetailRow label="Type" value={selected.type.charAt(0).toUpperCase() + selected.type.slice(1)}/>
                <DetailRow icon={<CreditCard size={14}/>} label="Method" value={methodLabel(selected.transfer_method)}/>
                <DetailRow label="Category" value={selected.category ? selected.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}/>
              </Section>

              {(selected.beneficiary_name || selected.beneficiary_bank) && (
                <Section title="Counterparty">
                  {selected.beneficiary_name && (
                    <DetailRow icon={<Building2 size={14}/>} label="Name" value={selected.beneficiary_name}/>
                  )}
                  {selected.beneficiary_bank && (
                    <DetailRow icon={<Globe size={14}/>} label="Bank" value={selected.beneficiary_bank}/>
                  )}
                </Section>
              )}

              <Section title="Amounts">
                <DetailRow label="Amount" value={`${selected.amount > 0 ? '+' : '−'}${fmt(selected.amount)}`}/>
                {selected.fee != null && selected.fee > 0 && (
                  <DetailRow label="Fee" value={fmt(selected.fee)} mono/>
                )}
              </Section>

              <Section title="References">
                {selected.reference && (
                  <DetailRow icon={<Hash size={14}/>} label="Reference" value={selected.reference} mono/>
                )}
                <DetailRow label="Confirmation" value={selected.id} mono small/>
                {selected.memo && <DetailRow label="Memo" value={selected.memo}/>}
              </Section>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
              <button onClick={() => openOfficialReceipt(selected)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f]">
                <Download size={14}/> Official PDF
              </button>
              <button onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Printer size={14}/> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono = false, small = false, icon }: any) {
  return (
    <div className="flex items-start justify-between py-3 px-3 gap-4 bg-white">
      <span className="text-gray-500 flex items-center gap-1.5 flex-shrink-0 text-sm">
        {icon}{label}
      </span>
      <span className={`font-semibold text-gray-900 text-right break-all text-sm ${mono ? 'font-mono text-xs' : ''} ${small ? 'text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

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
      className={`w-full text-left flex items-center gap-3 pl-3 pr-5 py-4 border-l-4 hover:bg-gray-50 transition-colors ${style.border}
        ${tx.status === 'blocked' ? 'bg-red-50/30' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
        ${tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-navy-600'}`}>
        {tx.amount > 0 ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
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
          {tx.transfer_method && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-600 font-semibold">
              {methodLabel(tx.transfer_method)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {fmtDate(tx.created_at)}
          {tx.beneficiary_name ? ` · ${tx.beneficiary_name}` : ''}
          {tx.beneficiary_bank ? ` · ${tx.beneficiary_bank}` : ''}
          {tx.reference ? ` · ${tx.reference}` : ''}
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
        {tx.fee && tx.fee > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">fee {fmt(tx.fee)}</p>
        )}
      </div>
    </button>
  )
}

function MonthlyTrend({ transactions }: { transactions: Tx[] }) {
  // Show last 12 months of actual data, or all months if fewer
  const months = useMemo(() => {
    const byMonth = new Map<string, { credits: number; debits: number }>()
    for (const t of transactions) {
      const key = t.created_at.slice(0, 7)
      if (!byMonth.has(key)) byMonth.set(key, { credits: 0, debits: 0 })
      const m = byMonth.get(key)!
      if (t.amount > 0) m.credits += t.amount
      else m.debits += Math.abs(t.amount)
    }
    const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    // Take last 12 months that have data
    const recent = sorted.slice(-12)
    return recent.map(([key, v]) => ({
      label: new Date(key + '-01').toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      key,
      credits: v.credits,
      debits: v.debits,
    }))
  }, [transactions])

  const peak = Math.max(...months.flatMap(m => [m.credits, m.debits]), 1)
  if (months.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">Activity overview</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded"/> Money in</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-gray-400 rounded"/> Money out</span>
        </div>
      </div>
      <div className="flex items-end gap-1 sm:gap-2 h-36 overflow-x-auto pb-1">
        {months.map(m => {
          const cH = Math.max(4, (m.credits / peak) * 100)
          const dH = Math.max(4, (m.debits  / peak) * 100)
          return (
            <div key={m.key} className="flex-1 min-w-[32px] flex flex-col items-center">
              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                <div className="w-1/2 bg-green-500 rounded-t" style={{ height: `${cH}%` }} title={'+€' + m.credits.toFixed(0)}/>
                <div className="w-1/2 bg-gray-400 rounded-t" style={{ height: `${dH}%` }} title={'−€' + m.debits.toFixed(0)}/>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 whitespace-nowrap">{m.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
