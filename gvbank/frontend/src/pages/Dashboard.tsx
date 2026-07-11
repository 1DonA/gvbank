import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp, TrendingDown,
  PiggyBank, Bell, ShieldCheck, ChevronRight, CreditCard, FileText,
} from 'lucide-react'

const fmt = (n: number) => '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Status styling shared with Statements — keeps visual language consistent.
const DASH_STATUS: Record<string, { border: string; badge: string; label: string; icon?: string }> = {
  completed: { border: 'border-l-green-500',  badge: 'bg-green-50 text-green-700 border border-green-100',  label: 'Completed' },
  pending:   { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',  label: 'Pending', icon: '⏳' },
  held:      { border: 'border-l-purple-500', badge: 'bg-purple-50 text-purple-700 border border-purple-100', label: 'On hold', icon: '⏸' },
  blocked:   { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-700 border border-red-200',        label: 'Blocked', icon: '🛑' },
  failed:    { border: 'border-l-gray-400',   badge: 'bg-gray-100 text-gray-600 border border-gray-200',    label: 'Failed',  icon: '✕' },
  rejected:  { border: 'border-l-gray-500',   badge: 'bg-gray-100 text-gray-700 border border-gray-200',    label: 'Rejected', icon: '✕' },
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsAPI.list().then(r => r.data) })
  const { data: transactions = [] } = useQuery({ queryKey: ['all-tx'], queryFn: () => accountsAPI.allTransactions().then(r => r.data) })

  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0)
  const checking = accounts.find((a: any) => a.type === 'checking')
  const savings  = accounts.find((a: any) => a.type === 'savings')

  // ── This-month insights ────────────────────────────────────────────────
  const insights = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thisMonth = transactions.filter((t: any) =>
      t.created_at >= monthStart && t.status === 'completed'
    )

    let income = 0, spending = 0
    const byCategory: Record<string, number> = {}
    for (const t of thisMonth) {
      if (t.amount > 0) income += t.amount
      else {
        spending += Math.abs(t.amount)
        const cat = t.category || 'other'
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount)
      }
    }
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - spending) / income) * 100)) : 0
    const categories = Object.entries(byCategory)
      .map(([k, v]) => ({ name: k, amount: v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return { income, spending, savingsRate, categories, txCount: thisMonth.length }
  }, [transactions])

  const monthName = new Date().toLocaleString('en-US', { month: 'long' })
  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-navy-600 to-[#1e3a5f] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/60 text-sm">{greeting()},</p>
            <h2 className="font-serif text-2xl font-bold mt-0.5">{firstName || user?.name} 👋</h2>
          </div>
          <Link to="/profile" className="text-xs bg-white/10 hover:bg-white/20 transition-colors text-white px-3 py-1.5 rounded-full">
            Account verified ✓
          </Link>
        </div>
        <div className="mt-5 flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest">Total Portfolio</p>
            <p className="font-serif text-4xl font-bold mt-1">{fmt(totalBalance)}</p>
          </div>
          <Link to="/statements" className="text-xs text-white/80 hover:text-white transition-colors flex items-center gap-1">
            View statements <ChevronRight size={14}/>
          </Link>
        </div>
      </div>

      {/* Blocked account banner — highest priority */}
      {accounts.some((a: any) => a.status !== 'active') && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold">
            🛑
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-900">
              {accounts.filter((a: any) => a.status !== 'active').length === 1
                ? 'One of your accounts is blocked'
                : `${accounts.filter((a: any) => a.status !== 'active').length} of your accounts are blocked`}
            </p>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              {accounts.filter((a: any) => a.status !== 'active').map((a: any) => (
                <span key={a.id} className="inline-block mr-3">
                  <span className="capitalize font-semibold">{a.type}</span> <span className="font-mono">{a.number}</span> — <span className="uppercase font-bold">{a.status}</span>
                </span>
              ))}
              <br/>Transfers from and to blocked accounts are disabled. Please contact support at <a href="tel:+498004822265" className="font-semibold underline">+49 800 GVB-BANK</a> for assistance.
            </p>
          </div>
        </div>
      )}

      {/* Alert strip */}
      {insights.txCount === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Bell size={18} className="text-blue-600 flex-shrink-0 mt-0.5"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Start using your account</p>
            <p className="text-xs text-blue-800 mt-0.5">
              No transactions this month yet. <Link to="/transfer" className="font-semibold underline">Send your first transfer</Link> or set up direct deposit.
            </p>
          </div>
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {checking && <AccountCard a={checking} color="from-navy-600 to-[#1e3a5f]" label="Checking"/>}
        {savings && <AccountCard a={savings} color="from-[#1a4a3a] to-[#2a7a5a]" label={`Savings · ${savings.apy}% APY`}/>}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <ArrowUpRight size={18}/>, label: 'Send Money', to: '/transfer' },
          { icon: <ArrowDownLeft size={18}/>, label: 'Deposit', to: '/transfer' },
          { icon: <CreditCard size={18}/>, label: 'Cards', to: '/cards' },
          { icon: <FileText size={18}/>, label: 'Statements', to: '/statements' },
        ].map(a => (
          <Link key={a.label} to={a.to}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-navy-600 hover:shadow-bank transition-all">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-navy-600">{a.icon}</div>
            <span className="text-xs font-semibold text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Insights row */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* This month income vs spending */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{monthName} insights</h3>
            <Link to="/statements" className="text-xs text-navy-600 font-semibold hover:underline">Details →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Metric label="Income"   value={`+${fmt(insights.income)}`} tone="green" icon={<TrendingUp size={14}/>}/>
            <Metric label="Spending" value={`−${fmt(insights.spending)}`} tone="red"   icon={<TrendingDown size={14}/>}/>
            <Metric label="Saved"    value={`${insights.savingsRate.toFixed(0)}%`} tone="navy" icon={<PiggyBank size={14}/>}/>
          </div>
          {insights.categories.length > 0 ? (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Top spending categories</p>
              <div className="space-y-2.5">
                {insights.categories.map((c, i) => {
                  const pct = Math.max(5, (c.amount / insights.spending) * 100)
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{c.name.replace(/_/g,' ')}</span>
                        <span className="font-mono text-gray-900">{fmt(c.amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy-600" style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-400 py-8">No spending data yet this month.</p>
          )}
        </div>

        {/* Side column: balance trend + alerts + security */}
        <div className="space-y-4">
          <BalanceTrend totalBalance={totalBalance} transactions={transactions}/>
          <SmartAlerts insights={insights} accounts={accounts} checking={checking}/>
          <div className="bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] rounded-2xl p-5 text-white">
            <ShieldCheck size={20} className="text-gold-400 mb-2"/>
            <p className="font-semibold">Security tip</p>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Never share your verification code with anyone — not even GV Union Bank support.
              We will never ask for it.
            </p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent transactions</h3>
          <Link to="/statements" className="text-xs text-navy-600 font-semibold hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {transactions.slice(0, 8).map((tx: any) => {
            const s = DASH_STATUS[tx.status] || DASH_STATUS.completed
            const struck = tx.status === 'blocked' || tx.status === 'rejected' || tx.status === 'failed'
            return (
              <Link key={tx.id} to="/statements"
                className={`flex items-center gap-3 pl-3 pr-5 py-3.5 border-l-4 ${s.border}
                  ${tx.status === 'blocked' ? 'bg-red-50/30' : ''} hover:bg-gray-50 transition-colors`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-navy-600'}`}>
                  {tx.amount > 0 ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold truncate ${struck ? 'text-gray-600 line-through decoration-1' : 'text-gray-900'}`}>
                      {tx.description}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${s.badge}`}>
                      {s.icon && <span>{s.icon}</span>}{s.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {tx.reference ? ` · ${tx.reference}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold font-mono ${struck ? 'text-gray-400 line-through' : (tx.amount > 0 ? 'text-green-600' : 'text-gray-900')}`}>
                    {tx.amount > 0 ? '+' : '−'}{fmt(tx.amount)}
                  </p>
                </div>
              </Link>
            )
          })}
          {transactions.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountCard({ a, color, label }: any) {
  const blocked = a.status !== 'active'
  return (
    <div className={`relative bg-gradient-to-br ${color} rounded-2xl p-5 text-white overflow-hidden ${blocked ? 'grayscale opacity-90' : ''}`}>
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/5"/>
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">{label}</p>
          {blocked && (
            <span className="text-[10px] font-bold uppercase tracking-widest bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
              🛑 {a.status}
            </span>
          )}
        </div>
        <p className="font-serif text-2xl font-bold">{fmt(a.balance)}</p>
        <div className="flex items-center justify-between mt-3">
          <p className="text-white/40 font-mono text-xs">{a.number}</p>
          {blocked ? (
            <span className="text-xs bg-red-500/30 text-white/80 px-2.5 py-1 rounded-full cursor-not-allowed">
              Transfers disabled
            </span>
          ) : (
            <Link to="/transfer" className="text-xs bg-white/10 hover:bg-white/20 transition-colors px-2.5 py-1 rounded-full">
              <RefreshCw size={11} className="inline mr-1"/>Transfer
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone, icon }: any) {
  const tones: any = {
    green: 'text-green-600 bg-green-50',
    red:   'text-red-600 bg-red-50',
    navy:  'text-navy-600 bg-navy-50',
  }
  return (
    <div className="text-center">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>
        {icon} {label}
      </div>
      <p className="font-serif text-xl font-bold text-gray-900 mt-1.5">{value}</p>
    </div>
  )
}

// ── Balance trend (last 30 days, reconstructed from transactions) ──────────
function BalanceTrend({ totalBalance, transactions }: { totalBalance: number; transactions: any[] }) {
  // Reconstruct daily ending balance for the last 30 days by walking transactions backwards.
  const series = useMemo(() => {
    const days = 30
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // bucket transactions by day
    const byDay: Record<string, number> = {}
    for (const t of transactions) {
      if (t.status !== 'completed' && t.status !== 'pending') continue
      const d = new Date(t.created_at)
      const key = d.toISOString().slice(0, 10)
      byDay[key] = (byDay[key] || 0) + t.amount
    }

    // Walk forward from N days ago, computing the cumulative balance ending at totalBalance today.
    // Strategy: start with totalBalance today, walk *backwards*, subtracting each day's net flow.
    const endings: { date: Date; bal: number }[] = []
    let running = totalBalance
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * dayMs)
      endings.push({ date: d, bal: running })
      const key = d.toISOString().slice(0, 10)
      running -= byDay[key] || 0
    }
    return endings.reverse()
  }, [totalBalance, transactions])

  const max = Math.max(...series.map(p => p.bal), 1)
  const min = Math.min(...series.map(p => p.bal), 0)
  const range = Math.max(max - min, 1)
  const W = 280, H = 90

  const points = series.map((p, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * W
    const y = H - ((p.bal - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const areaPoints = `0,${H} ${points} ${W},${H}`

  const fmt = (n: number) => '€' + Math.round(n).toLocaleString('en-DE')
  const first = series[0]?.bal ?? totalBalance
  const last = series[series.length - 1]?.bal ?? totalBalance
  const delta = last - first
  const deltaPct = first ? (delta / Math.abs(first)) * 100 : 0
  const positive = delta >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs uppercase tracking-widest text-gray-400">30-day trend</p>
        <span className={`text-xs font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
      <p className="font-serif text-xl font-bold text-gray-900">{fmt(last)}</p>
      <p className="text-xs text-gray-500">{positive ? '+' : '−'}{fmt(Math.abs(delta))} this month</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 mt-3 overflow-visible">
        <defs>
          <linearGradient id="bal-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#0a1628" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#0a1628" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#bal-grad)"/>
        <polyline points={points} fill="none" stroke="#0a1628" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ── Smart alerts ───────────────────────────────────────────────────────────
function SmartAlerts({ insights, accounts, checking }: any) {
  const alerts: { tone: 'info' | 'warn' | 'good'; icon: string; title: string; body: string }[] = []

  if (checking && checking.balance < 200) {
    alerts.push({ tone: 'warn', icon: '⚠', title: 'Low checking balance',
                  body: `Your checking account is below $200. Consider transferring from savings.` })
  }
  if (insights.spending > insights.income && insights.income > 0) {
    alerts.push({ tone: 'warn', icon: '📊', title: 'Spending exceeds income',
                  body: 'You\'ve spent more than you\'ve received this month so far.' })
  }
  if (insights.savingsRate >= 30) {
    alerts.push({ tone: 'good', icon: '🎯', title: 'Strong savings rate',
                  body: `You're saving ${insights.savingsRate.toFixed(0)}% of your income this month. Keep it up.` })
  }
  // Always include a generic suggestion
  alerts.push({ tone: 'info', icon: '💡', title: 'Set up a savings goal',
                body: 'Reach your goals faster by automating transfers to savings.' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Smart insights</p>
      <div className="space-y-2.5">
        {alerts.slice(0, 3).map((a, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border
            ${a.tone === 'warn' ? 'bg-amber-50 border-amber-100' :
              a.tone === 'good' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
            <span className="text-base flex-shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${
                a.tone === 'warn' ? 'text-amber-900' :
                a.tone === 'good' ? 'text-green-900' : 'text-gray-900'}`}>{a.title}</p>
              <p className={`text-xs mt-0.5 leading-relaxed ${
                a.tone === 'warn' ? 'text-amber-800' :
                a.tone === 'good' ? 'text-green-800' : 'text-gray-600'}`}>{a.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
