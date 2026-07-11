import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, supportAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Users, CreditCard, ArrowRightLeft, TrendingUp, CheckCircle, PauseCircle, XCircle,
  Lock, Unlock, UserPlus, X, Eye, KeyRound, PlusCircle, ArrowDownToLine, ArrowUpFromLine,
  MoreVertical, Trash2, Camera, MessageCircle, Pencil, Calendar, Ban,
} from 'lucide-react'
import { AdminSupportInbox } from '../components/support/AdminSupportInbox'

const fmt = (n: number) => '€' + Math.abs(n).toLocaleString('en-DE', { minimumFractionDigits: 2 })

type AdminTab = 'overview' | 'users' | 'accounts' | 'transactions' | 'support'

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [txFilter, setTxFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [resetPwUser, setResetPwUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [openAcctUser, setOpenAcctUser] = useState<{ id: string; name: string } | null>(null)
  const [postingForAcct, setPostingForAcct] = useState<{ id: string; type: string; balance: number; owner: string } | null>(null)
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [showCreateTx, setShowCreateTx] = useState(false)
  const qc = useQueryClient()

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminAPI.stats().then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminAPI.users().then(r => r.data), enabled: tab === 'users' })
  const { data: accounts = [] } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => adminAPI.accounts().then(r => r.data),
    // Also needed on the Transactions tab so the Create Transaction picker has data.
    enabled: tab === 'accounts' || tab === 'transactions',
  })
  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-tx', txFilter],
    queryFn: () => adminAPI.transactions(txFilter === 'all' ? undefined : txFilter).then(r => r.data),
    enabled: tab === 'transactions' || tab === 'overview'
  })

  const blockUser = useMutation({
    mutationFn: (id: string) => adminAPI.blockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User status updated') }
  })

  const createUser = useMutation({
    mutationFn: (d: any) => adminAPI.createUser(d),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`Customer ${res.data.name} created`)
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create customer')
  })

  const resetPw = useMutation({
    mutationFn: ({ id, pw }: any) => adminAPI.resetPassword(id, pw),
    onSuccess: () => { toast.success('Password reset'); setResetPwUser(null) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to reset password')
  })

  const openAcct = useMutation({
    mutationFn: ({ id, payload }: any) => adminAPI.openAccountForUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] })
      toast.success('Account opened'); setOpenAcctUser(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to open account')
  })

  const postTx = useMutation({
    mutationFn: ({ id, payload }: any) => adminAPI.postTransaction(id, payload),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
      qc.invalidateQueries({ queryKey: ['admin-tx'] })
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(res.data.message)
      setPostingForAcct(null)
      setShowCreateTx(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to post transaction')
  })

  const deleteTx = useMutation({
    mutationFn: (id: string) => adminAPI.deleteTx(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
      qc.invalidateQueries({ queryKey: ['admin-tx'] })
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Transaction deleted')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete transaction')
  })

  const updateTx = useMutation({
    mutationFn: ({ id, payload }: any) => adminAPI.updateTx(id, payload),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
      qc.invalidateQueries({ queryKey: ['admin-tx'] })
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(res.data?.message || 'Transaction updated')
      setEditingTx(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update transaction')
  })

  const moderateTx = useMutation({
    mutationFn: ({ id, action, note }: any) => adminAPI.moderateTx(id, action, note),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-tx'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`Transaction ${v.action}d`)
    }
  })

  const suspendAcct = useMutation({
    mutationFn: (id: string) => adminAPI.suspendAccount(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-accounts'] }); toast.success('Account status updated') }
  })

  // Support inbox unread badge
  const { data: supportList } = useQuery({
    queryKey: ['admin-support-chats'],
    queryFn: () => supportAPI.listChats().then(r => r.data),
    refetchInterval: 15_000,
  })
  const supportUnread = supportList?.total_unread || 0

  const TABS = [
    { id: 'overview',     label: 'Overview',     icon: <TrendingUp size={16}/> },
    { id: 'users',        label: 'Customers',    icon: <Users size={16}/> },
    { id: 'accounts',     label: 'Accounts',     icon: <CreditCard size={16}/> },
    { id: 'transactions', label: 'Transactions', icon: <ArrowRightLeft size={16}/> },
    { id: 'support',      label: 'Support',      icon: <MessageCircle size={16}/>, badge: supportUnread },
  ]

  const filteredUsers = users.filter((u: any) =>
    !userSearch || (u.name + u.email).toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">⚠ Restricted Access</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id as AdminTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 relative
              ${tab === t.id ? 'bg-white text-navy-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: stats?.total_customers ?? '—', icon: '👥', color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Assets', value: stats ? fmt(stats.total_assets) : '—', icon: '💰', color: 'bg-green-50 text-green-600' },
              { label: 'Pending Reviews', value: stats?.pending_reviews ?? '—', icon: '⏸', color: 'bg-orange-50 text-orange-600' },
              { label: 'Total Transactions', value: stats?.total_transactions ?? '—', icon: '📋', color: 'bg-purple-50 text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
                <p className="font-serif text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pending transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Pending Transactions</h3>
              <button onClick={() => setTab('transactions')} className="text-xs text-navy-600 font-semibold">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {transactions.filter((t: any) => t.status === 'pending' || t.status === 'held').slice(0, 5).map((tx: any) => (
                <TxRow key={tx.id} tx={tx}
                  onAction={(action) => moderateTx.mutate({ id: tx.id, action })}
                  onEdit={() => setEditingTx(tx)}
                  onDelete={() => { if (confirm('Permanently delete this transaction? If it was completed, its balance impact will be reversed.')) deleteTx.mutate(tx.id) }}/>
              ))}
              {transactions.filter((t: any) => t.status === 'pending' || t.status === 'held').length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No pending transactions</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 flex-1">All Customers</h3>
            <input placeholder="Search…" value={userSearch} onChange={e => setUserSearch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy-600 w-48" />
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-[#1e3a5f] transition-all whitespace-nowrap">
              <UserPlus size={14}/>Add Customer
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Customer','Email','Balance','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">{u.name}</span>
                    </div></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{fmt(u.total_balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${u.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setDetailUserId(u.id)}
                          title="View details"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                          <Eye size={12}/>View
                        </button>
                        <button onClick={() => setOpenAcctUser({ id: u.id, name: u.name })}
                          title="Open additional account"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                          <PlusCircle size={12}/>Account
                        </button>
                        <button onClick={() => setResetPwUser({ id: u.id, name: u.name, email: u.email })}
                          title="Reset password"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">
                          <KeyRound size={12}/>PW
                        </button>
                        <button onClick={() => blockUser.mutate(u.id)}
                          title={u.is_active ? 'Block' : 'Unblock'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                            ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {u.is_active ? <><Lock size={12}/>Block</> : <><Unlock size={12}/>Unblock</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accounts */}
      {tab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">All Accounts</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Account','Owner','Type','Balance','APY','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.number}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{a.owner}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{a.type}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{fmt(a.balance)}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{a.apy}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${a.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setPostingForAcct({ id: a.id, type: a.type, balance: a.balance, owner: a.owner })}
                          title="Post a manual credit or debit"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-all">
                          <ArrowDownToLine size={12}/>Post
                        </button>
                        <button onClick={() => suspendAcct.mutate(a.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all">
                          {a.status === 'active' ? '🛑 Block' : '✓ Unblock'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          {/* Header with prominent Create Transaction button */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">All transactions</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manually create, edit, backdate, hold, block or delete any transaction.
              </p>
            </div>
            <button onClick={() => setShowCreateTx(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold transition-all whitespace-nowrap">
              <PlusCircle size={16}/> Create transaction
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all','pending','held','blocked','completed','rejected'].map(f => (
              <button key={f} onClick={() => setTxFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                  ${txFilter === f ? 'bg-navy-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-navy-600'}`}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {transactions.map((tx: any) => (
                <TxRow key={tx.id} tx={tx}
                  onAction={(action) => moderateTx.mutate({ id: tx.id, action })}
                  onEdit={() => setEditingTx(tx)}
                  onDelete={() => { if (confirm('Permanently delete this transaction? If it was completed, its balance impact will be reversed.')) deleteTx.mutate(tx.id) }}/>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-12">No transactions</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support */}
      {tab === 'support' && <AdminSupportInbox/>}

      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onSubmit={(payload) => createUser.mutate(payload)}
          pending={createUser.isPending}
        />
      )}

      {detailUserId && (
        <UserDetailDrawer
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onPost={(acct) => setPostingForAcct(acct)}
        />
      )}

      {resetPwUser && (
        <ResetPasswordModal
          user={resetPwUser}
          pending={resetPw.isPending}
          onClose={() => setResetPwUser(null)}
          onSubmit={(pw: string) => resetPw.mutate({ id: resetPwUser.id, pw })}
        />
      )}

      {openAcctUser && (
        <OpenAccountModal
          user={openAcctUser}
          pending={openAcct.isPending}
          onClose={() => setOpenAcctUser(null)}
          onSubmit={(payload: any) => openAcct.mutate({ id: openAcctUser.id, payload })}
        />
      )}

      {postingForAcct && (
        <PostTransactionModal
          account={postingForAcct}
          pending={postTx.isPending}
          onClose={() => setPostingForAcct(null)}
          onSubmit={(payload: any) => postTx.mutate({ id: postingForAcct.id, payload })}
        />
      )}

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          pending={updateTx.isPending}
          onClose={() => setEditingTx(null)}
          onSubmit={(payload: any) => updateTx.mutate({ id: editingTx.id, payload })}
        />
      )}

      {showCreateTx && (
        <CreateTransactionModal
          accounts={accounts}
          pending={postTx.isPending}
          onClose={() => setShowCreateTx(false)}
          onSubmit={(account_id: string, payload: any) => postTx.mutate({ id: account_id, payload })}
        />
      )}
    </div>
  )
}

function CreateCustomerModal({ onClose, onSubmit, pending }: {
  onClose: () => void
  onSubmit: (payload: any) => void
  pending: boolean
}) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    address: '',
    initial_checking_balance: '',
    initial_savings_balance: '',
    joined_at: '',
  })

  const submit = () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error('First name, last name, email and password are required'); return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return
    }
    onSubmit({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      password: form.password,
      address: form.address.trim(),
      initial_checking_balance: parseFloat(form.initial_checking_balance || '0') || 0,
      initial_savings_balance: parseFloat(form.initial_savings_balance || '0') || 0,
      joined_at: form.joined_at || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-serif text-lg font-bold text-gray-900">Create New Customer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={form.first_name}
                     onChange={e => setForm({...form, first_name: e.target.value})} placeholder="Jane"/>
            </div>
            <div>
              <label className="label">Last name *</label>
              <input className="input" value={form.last_name}
                     onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Doe"/>
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email}
                   onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@email.com"/>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone}
                   onChange={e => setForm({...form, phone: e.target.value})} placeholder="+15551234567"/>
          </div>
          <div>
            <label className="label">Temporary password * <span className="text-gray-400 normal-case font-normal">(min 6 chars)</span></label>
            <input type="text" className="input font-mono" value={form.password}
                   onChange={e => setForm({...form, password: e.target.value})} placeholder="Welcome2026!"/>
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address}
                   onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St, City, ST"/>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="label">Opening Checking $</label>
              <input type="number" min="0" step="0.01" className="input" value={form.initial_checking_balance}
                     onChange={e => setForm({...form, initial_checking_balance: e.target.value})} placeholder="0.00"/>
            </div>
            <div>
              <label className="label">Opening Savings $</label>
              <input type="number" min="0" step="0.01" className="input" value={form.initial_savings_balance}
                     onChange={e => setForm({...form, initial_savings_balance: e.target.value})} placeholder="0.00"/>
            </div>
          </div>
          <div>
            <label className="label">Member since (optional)</label>
            <input type="date" className="input max-w-xs"
                   value={form.joined_at}
                   max={new Date().toISOString().slice(0,10)}
                   onChange={e => setForm({...form, joined_at: e.target.value})}/>
            <p className="text-xs text-gray-400 mt-1">Leave blank to use today's date.</p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            New customer will be created with these accounts and can log in immediately with the temporary password.
            Savings account is only created if the opening balance is greater than 0.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={pending}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60">
            Cancel
          </button>
          <button onClick={submit} disabled={pending}
                  className="flex-1 py-3 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-60">
            {pending ? 'Creating…' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User detail drawer ─────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onPost }: {
  userId: string
  onClose: () => void
  onPost: (acct: { id: string; type: string; balance: number; owner: string }) => void
}) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => adminAPI.userDetail(userId).then(r => r.data),
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const setAvatar = useMutation({
    mutationFn: (data_url: string) => adminAPI.setUserAvatar(userId, data_url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Profile picture updated')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to upload')
  })

  const editUser = useMutation({
    mutationFn: (payload: any) => adminAPI.updateUser(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Customer updated')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update')
  })
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Image files only'); return }
    if (file.size > 750_000) { toast.error('Please choose an image under 750 KB'); return }
    const reader = new FileReader()
    reader.onload = () => setAvatar.mutate(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-bank-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-serif text-lg font-bold text-gray-900">Customer Detail</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        {isLoading || !data ? (
          <p className="text-center text-gray-400 text-sm py-16">Loading…</p>
        ) : (
          <div className="p-6 space-y-5">
            {/* User identity */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {data.user.profile_picture ? (
                  <img src={data.user.profile_picture} alt="" className="w-14 h-14 rounded-2xl object-cover"/>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-600 to-[#1e3a5f] flex items-center justify-center text-white font-serif font-bold text-xl">
                    {data.user.first_name[0]}{data.user.last_name[0]}
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()} title="Set profile picture"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow text-navy-600 flex items-center justify-center hover:bg-gray-50">
                  <Camera size={11}/>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick}/>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-xl font-bold text-gray-900">{data.user.first_name} {data.user.last_name}</h4>
                <p className="text-sm text-gray-500 truncate">{data.user.email}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${data.user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {data.user.is_active ? 'Active' : 'Blocked'}
                  </span>
                  {data.user.is_verified && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">Verified</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Phone"   value={data.user.phone || '—'}/>
              <EditableJoined
                current={data.user.created_at}
                pending={editUser.isPending}
                onSave={(iso: string) => editUser.mutate({ joined_at: iso })}/>
              <Detail label="Address" value={data.user.address || '—'} full/>
            </div>

            {/* Totals */}
            <div className="bg-navy-600 rounded-2xl p-5 text-white">
              <p className="text-xs uppercase tracking-widest text-white/60">Total balance across all accounts</p>
              <p className="font-serif text-3xl font-bold mt-1">{fmt(data.totals.balance)}</p>
              <p className="text-xs text-white/60 mt-1">{data.totals.account_count} accounts · {data.totals.transaction_count} recent transactions</p>
            </div>

            {/* Accounts */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Accounts</h4>
              <div className="space-y-2">
                {data.accounts.map((a: any) => (
                  <div key={a.id} className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 capitalize">{a.type}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                      </div>
                      <p className="text-xs font-mono text-gray-500 mt-1">{a.masked_number} · {a.apy}% APY</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-gray-900">{fmt(a.balance)}</p>
                      <button onClick={() => onPost({ id: a.id, type: a.type, balance: a.balance, owner: `${data.user.first_name} ${data.user.last_name}` })}
                        className="text-xs text-navy-600 font-semibold hover:underline mt-1">
                        Post credit / debit
                      </button>
                    </div>
                  </div>
                ))}
                {data.accounts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No accounts</p>}
              </div>
            </div>

            {/* Login sessions (editable) */}
            <AdminLoginSessions userId={data.user.id}/>

            {/* Recent transactions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Recent activity</h4>
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
                {data.transactions.slice(0, 15).map((t: any) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}{t.reference ? ` · ${t.reference}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      t.status === 'completed' ? 'bg-green-50 text-green-700' :
                      t.status === 'pending'   ? 'bg-yellow-50 text-yellow-700' :
                      t.status === 'held'      ? 'bg-purple-50 text-purple-700' :
                      'bg-red-50 text-red-700'}`}>{t.status}</span>
                    <span className={`font-mono font-bold text-sm ${t.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
                {data.transactions.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No transactions</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value, full = false }: any) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

// ── Login sessions manager (admin CRUD over customer's login activity) ────
function AdminLoginSessions({ userId }: { userId: string }) {
  const qc = useQueryClient()
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-user-sessions', userId],
    queryFn: () => adminAPI.listSessions(userId).then(r => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-user-sessions', userId] })
  }

  const createSess = useMutation({
    mutationFn: (payload: any) => adminAPI.createSession(userId, payload),
    onSuccess: () => { invalidate(); toast.success('Session added') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to add session'),
  })
  const updateSess = useMutation({
    mutationFn: ({ id, payload }: any) => adminAPI.updateSession(id, payload),
    onSuccess: () => { invalidate(); toast.success('Session updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update'),
  })
  const deleteSess = useMutation({
    mutationFn: (id: string) => adminAPI.deleteSession(id),
    onSuccess: () => { invalidate(); toast.success('Session removed') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete'),
  })

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const quickPresets = [
    { device: 'Windows · Chrome',    location: 'Frankfurt, Germany',    ip: '78.94.•••.•••' },
    { device: 'iPhone · GV App',     location: 'Munich, Germany',       ip: '84.12.•••.•••' },
    { device: 'MacBook · Safari',    location: 'Berlin, Germany',       ip: '109.42.•••.•••' },
    { device: 'Android · GV App',    location: 'London, UK',            ip: '212.58.•••.•••' },
    { device: 'iPad · Safari',       location: 'Amsterdam, Netherlands',ip: '145.17.•••.•••' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">Login sessions</h4>
        <button onClick={() => setShowAdd(true)}
          className="text-xs px-2.5 py-1.5 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-lg font-semibold flex items-center gap-1">
          <PlusCircle size={12}/> Add
        </button>
      </div>

      <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
        {isLoading && <p className="text-center text-gray-400 text-sm py-4">Loading…</p>}
        {!isLoading && sessions.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No login sessions yet — click Add to create one.</p>
        )}
        {sessions.map((s: any) => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.device || 'Unknown'}</p>
                {s.is_current && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {s.location || '—'} · IP {s.ip || '—'} · {s.logged_at ? new Date(s.logged_at).toLocaleString() : '—'}
              </p>
            </div>
            <button onClick={() => setEditing(s)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-1">
              <Pencil size={11}/>
            </button>
            <button onClick={() => { if (confirm('Delete this session?')) deleteSess.mutate(s.id) }}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-lg font-semibold">
              <Trash2 size={11}/>
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <SessionModal
          title="Add login session" presets={quickPresets}
          pending={createSess.isPending}
          onClose={() => setShowAdd(false)}
          onSubmit={(p: any) => { createSess.mutate(p, { onSuccess: () => setShowAdd(false) }) }}/>
      )}
      {editing && (
        <SessionModal
          title="Edit login session" initial={editing}
          pending={updateSess.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(p: any) => updateSess.mutate({ id: editing.id, payload: p }, { onSuccess: () => setEditing(null) })}/>
      )}
    </div>
  )
}

// ── Session add/edit modal ────────────────────────────────────────────────
function SessionModal({ title, initial, presets, pending, onClose, onSubmit }: any) {
  const now = new Date()
  const [device, setDevice] = useState<string>(initial?.device || '')
  const [location, setLocation] = useState<string>(initial?.location || '')
  const [ip, setIp] = useState<string>(initial?.ip || '')
  const [isCurrent, setIsCurrent] = useState<boolean>(!!initial?.is_current)
  const [when, setWhen] = useState<string>(
    initial?.logged_at
      ? new Date(initial.logged_at).toISOString().slice(0, 16)
      : now.toISOString().slice(0, 16)
  )

  const submit = () => {
    onSubmit({
      device: device.trim() || null,
      location: location.trim() || null,
      ip: ip.trim() || null,
      is_current: isCurrent,
      logged_at: when ? `${when}:00` : null,
    })
  }

  const applyPreset = (p: any) => {
    setDevice(p.device); setLocation(p.location); setIp(p.ip)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-3">
          {presets && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p: any, i: number) => (
                <button key={i} onClick={() => applyPreset(p)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700">
                  {p.device.split(' · ')[0]}
                </button>
              ))}
            </div>
          )}
          <div>
            <label className="label">Device</label>
            <input className="input" value={device} onChange={e => setDevice(e.target.value)}
              placeholder="Windows · Chrome"/>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Frankfurt, Germany"/>
          </div>
          <div>
            <label className="label">IP address</label>
            <input className="input font-mono" value={ip} onChange={e => setIp(e.target.value)}
              placeholder="78.94.•••.•••"/>
          </div>
          <div>
            <label className="label">When</label>
            <input type="datetime-local" className="input"
              value={when} max={now.toISOString().slice(0,16)}
              onChange={e => setWhen(e.target.value)}/>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
            <input type="checkbox" checked={isCurrent} onChange={e => setIsCurrent(e.target.checked)}
              className="w-4 h-4 accent-navy-600"/>
            <span>Mark as current active session</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline-editable "Joined" date ─────────────────────────────────────────
function EditableJoined({ current, pending, onSave }: { current: string; pending: boolean; onSave: (iso: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(new Date(current).toISOString().slice(0, 10))
  useEffect(() => { setValue(new Date(current).toISOString().slice(0, 10)) }, [current])

  const todayISO = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest">Joined</p>
      {!editing ? (
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-gray-900">
            {new Date(current).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button onClick={() => setEditing(true)}
            className="text-navy-600 hover:bg-navy-50 rounded p-0.5"
            title="Change join date">
            <Pencil size={11}/>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-1">
          <input type="date" value={value} max={todayISO}
            onChange={e => setValue(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-navy-600 flex-1 min-w-0"/>
          <button onClick={() => { onSave(value); setEditing(false) }} disabled={pending}
            className="text-xs px-2 py-1 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded font-semibold disabled:opacity-60">
            {pending ? '…' : 'Save'}
          </button>
          <button onClick={() => { setValue(new Date(current).toISOString().slice(0,10)); setEditing(false) }}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// ── Reset password modal ───────────────────────────────────────────────────
function ResetPasswordModal({ user, pending, onClose, onSubmit }: any) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')

  const submit = () => {
    if (pw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (pw !== confirm) { toast.error('Passwords do not match'); return }
    onSubmit(pw)
  }

  // Random temp password helper
  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
    setPw(out); setConfirm(out)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-gray-900">Reset Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">For <span className="font-semibold">{user.name}</span> ({user.email})</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            ⚠ Admin password reset. The customer will need to use the new password on their next sign-in.
            Make sure to share it through a secure channel.
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">New password</label>
              <button onClick={generate} className="text-xs text-navy-600 font-semibold hover:underline">Generate strong password</button>
            </div>
            <input type="text" className="input font-mono" value={pw} onChange={e => setPw(e.target.value)} placeholder="Type or generate"/>
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="text" className="input font-mono" value={confirm} onChange={e => setConfirm(e.target.value)}/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-3 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-60">
            {pending ? 'Resetting…' : 'Reset password'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Open additional account modal ─────────────────────────────────────────
function OpenAccountModal({ user, pending, onClose, onSubmit }: any) {
  const [account_type, setType] = useState('checking')
  const [initial_balance, setBal] = useState('')
  const [apy, setApy] = useState('')

  const submit = () => {
    const bal = parseFloat(initial_balance || '0') || 0
    if (bal < 0) { toast.error('Initial balance must be non-negative'); return }
    onSubmit({
      account_type,
      initial_balance: bal,
      apy: apy ? parseFloat(apy) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-gray-900">Open New Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Opening account for <span className="font-semibold">{user.name}</span></p>
          <div>
            <label className="label">Account type</label>
            <select className="input" value={account_type} onChange={e => setType(e.target.value)}>
              <option value="checking">Checking — 0.01% APY</option>
              <option value="savings">High-Yield Savings — 5.20% APY</option>
              <option value="investment">Investment — 4.10% APY</option>
            </select>
          </div>
          <div>
            <label className="label">Opening deposit ($)</label>
            <input type="number" min="0" step="0.01" className="input" value={initial_balance}
              onChange={e => setBal(e.target.value)} placeholder="0.00"/>
            <p className="text-xs text-gray-400 mt-1">Recorded as an opening-deposit credit transaction.</p>
          </div>
          <div>
            <label className="label">APY override % <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
            <input type="number" min="0" step="0.01" className="input" value={apy}
              onChange={e => setApy(e.target.value)} placeholder="Leave blank to use default"/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-3 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-60">
            {pending ? 'Opening…' : 'Open account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post manual transaction modal ─────────────────────────────────────────
function PostTransactionModal({ account, pending, onClose, onSubmit }: any) {
  const [action, setAction] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [memo, setMemo] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const todayISO = new Date().toISOString().slice(0,10)
  const [postedDate, setPostedDate] = useState(todayISO)
  const [postedTime, setPostedTime] = useState(new Date().toTimeString().slice(0,5))
  const [status, setStatus] = useState<'completed' | 'pending' | 'held'>('completed')

  const presets = action === 'credit'
    ? ['Cash deposit', 'Check deposit', 'ATM deposit', 'Fee reversal', 'Promotional credit', 'Error correction credit']
    : ['Cash withdrawal', 'ATM withdrawal', 'Monthly maintenance fee', 'Wire fee', 'Overdraft fee', 'Error correction debit']

  const submit = () => {
    const a = parseFloat(amount)
    if (!a || a <= 0) { toast.error('Enter a positive amount'); return }
    if (!description.trim()) { toast.error('Description is required for audit'); return }
    if (status === 'completed' && action === 'debit' && a > account.balance) {
      toast.error(`Cannot debit more than balance ($${account.balance.toFixed(2)})`); return
    }
    const posted_at = `${postedDate}T${postedTime}:00`
    onSubmit({
      action, amount: a,
      description: description.trim(),
      memo: memo || null,
      admin_note: adminNote || null,
      posted_at,
      status,
    })
  }

  const backdated = postedDate !== todayISO

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-serif text-lg font-bold text-gray-900">Post Transaction</h3>
            <p className="text-xs text-gray-500 mt-0.5">{account.owner} · {account.type} (balance {fmt(account.balance)})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Action selector */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('credit')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'credit' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownToLine size={16} className={action === 'credit' ? 'text-green-600' : 'text-gray-500'}/>
                <span className="font-semibold text-sm">Credit (deposit)</span>
              </div>
              <p className="text-xs text-gray-500">Add funds to the account</p>
            </button>
            <button onClick={() => setAction('debit')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'debit' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpFromLine size={16} className={action === 'debit' ? 'text-red-600' : 'text-gray-500'}/>
                <span className="font-semibold text-sm">Debit (withdraw)</span>
              </div>
              <p className="text-xs text-gray-500">Remove funds from the account</p>
            </button>
          </div>

          <div>
            <label className="label">Amount ($)</label>
            <input type="number" min="0.01" step="0.01" className="input text-2xl font-serif"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
          </div>

          <div>
            <label className="label">Description *</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Shown on customer statement" maxLength={100}/>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map(p => (
                <button key={p} onClick={() => setDescription(p)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Memo <span className="text-gray-400 normal-case font-normal">(visible to customer)</span></label>
            <input className="input" value={memo} onChange={e => setMemo(e.target.value)}/>
          </div>

          <div>
            <label className="label">Internal admin note <span className="text-gray-400 normal-case font-normal">(audit only)</span></label>
            <input className="input" value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder="e.g. branch deposit slip #1234"/>
          </div>

          {/* Posting date (backdate) + status */}
          <div className="grid sm:grid-cols-[1.2fr_0.8fr_1fr] gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label">Posting date</label>
              <input type="date" className="input" value={postedDate} max={todayISO}
                onChange={e => setPostedDate(e.target.value)}/>
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={postedTime}
                onChange={e => setPostedTime(e.target.value)}/>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="completed">Completed (posts funds)</option>
                <option value="pending">Pending (no funds yet)</option>
                <option value="held">Held (admin review)</option>
              </select>
            </div>
          </div>

          {backdated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <span>⚠</span>
              <span>You are <strong>backdating</strong> this transaction to {new Date(postedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                The customer's statement will reflect this date.</span>
            </div>
          )}

          {amount && parseFloat(amount) > 0 && status === 'completed' && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Current balance</span><span className="font-mono">{fmt(account.balance)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{action === 'credit' ? 'Credit' : 'Debit'}</span><span className={`font-mono ${action === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{action === 'credit' ? '+' : '−'}{fmt(parseFloat(amount))}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-gray-200"><span className="font-semibold">New balance</span><span className="font-mono font-bold">{fmt(account.balance + (action === 'credit' ? parseFloat(amount) : -parseFloat(amount)))}</span></div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60">Cancel</button>
          <button onClick={submit} disabled={pending}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60
              ${action === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {pending ? 'Posting…' : action === 'credit' ? 'Post credit' : 'Post debit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create transaction modal ──────────────────────────────────────────────
// Standalone flow to post a new transaction to any account. Includes searchable
// account picker at the top. Same posting engine as the per-account Post button.
function CreateTransactionModal({ accounts, pending, onClose, onSubmit }: any) {
  const [accountId, setAccountId] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [memo, setMemo] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)
  const [postedDate, setPostedDate] = useState(todayISO)
  const [postedTime, setPostedTime] = useState(now.toTimeString().slice(0, 5))
  const [status, setStatus] = useState<'completed' | 'pending' | 'held'>('completed')

  const selectedAccount = (accounts || []).find((a: any) => a.id === accountId)
  const backdated = postedDate !== todayISO

  const filteredAccounts = (accounts || []).filter((a: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.owner || '').toLowerCase().includes(q) ||
           (a.owner_email || '').toLowerCase().includes(q) ||
           (a.number || '').includes(q) ||
           (a.type || '').toLowerCase().includes(q)
  })

  const presets = action === 'credit'
    ? ['Cash deposit', 'Check deposit', 'ATM deposit', 'Wire deposit', 'Fee reversal', 'Promotional credit', 'Error correction credit']
    : ['Cash withdrawal', 'ATM withdrawal', 'Monthly maintenance fee', 'Wire fee', 'Overdraft fee', 'Chargeback', 'Error correction debit']

  const submit = () => {
    if (!accountId) { toast.error('Please pick an account'); return }
    const a = parseFloat(amount)
    if (!a || a <= 0) { toast.error('Enter a positive amount'); return }
    if (!description.trim()) { toast.error('Description is required for audit'); return }
    if (status === 'completed' && action === 'debit' && selectedAccount && a > selectedAccount.balance) {
      toast.error(`Cannot debit more than balance (${'€' + selectedAccount.balance.toFixed(2)})`); return
    }
    const posted_at = `${postedDate}T${postedTime}:00`
    onSubmit(accountId, {
      action, amount: a,
      description: description.trim(),
      memo: memo || null,
      admin_note: adminNote || null,
      posted_at,
      status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-serif text-lg font-bold text-gray-900">Create Transaction</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manually post a credit or debit to any customer account.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Account picker */}
          <div>
            <label className="label">Account *</label>
            {!accountId ? (
              <>
                <input placeholder="Search by name, email, account number…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="input mb-2"/>
                <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredAccounts.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No accounts match</p>
                  )}
                  {filteredAccounts.slice(0, 20).map((a: any) => (
                    <button key={a.id} onClick={() => setAccountId(a.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 capitalize">
                        {(a.type || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.owner}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{a.number} · {a.type}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-gray-900">{fmt(a.balance)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="border-2 border-navy-600 bg-navy-50 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 capitalize">
                  {(selectedAccount?.type || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedAccount?.owner}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {selectedAccount?.number} · {selectedAccount?.type} · balance {fmt(selectedAccount?.balance || 0)}
                  </p>
                </div>
                <button onClick={() => setAccountId('')} className="text-xs text-navy-600 font-semibold hover:underline">Change</button>
              </div>
            )}
          </div>

          {/* Action selector */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('credit')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'credit' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownToLine size={16} className={action === 'credit' ? 'text-green-600' : 'text-gray-500'}/>
                <span className="font-semibold text-sm">Credit (deposit)</span>
              </div>
              <p className="text-xs text-gray-500">Add funds to the account</p>
            </button>
            <button onClick={() => setAction('debit')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${action === 'debit' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpFromLine size={16} className={action === 'debit' ? 'text-red-600' : 'text-gray-500'}/>
                <span className="font-semibold text-sm">Debit (withdraw)</span>
              </div>
              <p className="text-xs text-gray-500">Remove funds from the account</p>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (€) *</label>
            <input type="number" min="0.01" step="0.01" className="input text-2xl font-serif"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Shown on customer statement" maxLength={100}/>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map(p => (
                <button key={p} onClick={() => setDescription(p)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Memo + admin note */}
          <div>
            <label className="label">Memo <span className="text-gray-400 normal-case font-normal">(visible to customer)</span></label>
            <input className="input" value={memo} onChange={e => setMemo(e.target.value)}/>
          </div>
          <div>
            <label className="label">Internal admin note <span className="text-gray-400 normal-case font-normal">(audit only)</span></label>
            <input className="input" value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder="e.g. branch deposit slip #1234"/>
          </div>

          {/* Posting date + status */}
          <div className="grid sm:grid-cols-[1.2fr_0.8fr_1fr] gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label">Posting date</label>
              <input type="date" className="input" value={postedDate} max={todayISO}
                onChange={e => setPostedDate(e.target.value)}/>
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={postedTime}
                onChange={e => setPostedTime(e.target.value)}/>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="held">Held</option>
              </select>
            </div>
          </div>

          {backdated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <span>⚠</span>
              <span>You are <strong>backdating</strong> this transaction to {new Date(postedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                The customer's statement will reflect this date.</span>
            </div>
          )}

          {amount && parseFloat(amount) > 0 && status === 'completed' && selectedAccount && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Current balance</span><span className="font-mono">{fmt(selectedAccount.balance)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{action === 'credit' ? 'Credit' : 'Debit'}</span><span className={`font-mono ${action === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{action === 'credit' ? '+' : '−'}{fmt(parseFloat(amount))}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-gray-200"><span className="font-semibold">New balance</span><span className="font-mono font-bold">{fmt(selectedAccount.balance + (action === 'credit' ? parseFloat(amount) : -parseFloat(amount)))}</span></div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={submit} disabled={pending}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60
              ${action === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {pending ? 'Posting…' : action === 'credit' ? 'Post credit' : 'Post debit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit transaction modal ────────────────────────────────────────────────
// Change status to any state, backdate to any past date, add an audit note.
function EditTransactionModal({ tx, pending, onClose, onSubmit }: any) {
  // "blocked" is stored as HELD + a special admin_note marker, but we surface
  // it here as its own status choice.
  const initialStatus = tx.status === 'held' && (tx.admin_note || '').startsWith('🛑 BLOCKED')
    ? 'blocked' : (tx.status || 'pending')

  const [status, setStatus] = useState<string>(initialStatus)
  const [note, setNote] = useState<string>(tx.admin_note || '')

  const initialDate = new Date(tx.created_at)
  const [postedDate, setPostedDate] = useState<string>(initialDate.toISOString().slice(0, 10))
  const [postedTime, setPostedTime] = useState<string>(initialDate.toTimeString().slice(0, 5))
  const [backdate, setBackdate] = useState<boolean>(false)

  const submit = () => {
    const payload: any = { action: status, note: note || null }
    if (backdate) {
      payload.posted_at = `${postedDate}T${postedTime}:00`
    }
    onSubmit(payload)
  }

  const STATUS_OPTIONS: { v: string; label: string; sub: string; tone: string; icon: any }[] = [
    { v: 'completed', label: 'Completed', sub: 'Funds moved. Customer sees success.', tone: 'green',  icon: <CheckCircle size={14}/> },
    { v: 'pending',   label: 'Pending',   sub: 'Awaiting action. No funds moved yet.', tone: 'yellow', icon: <Calendar size={14}/> },
    { v: 'held',      label: 'Held',      sub: 'Under review by ops team.',            tone: 'purple', icon: <PauseCircle size={14}/> },
    { v: 'blocked',   label: 'Blocked',   sub: 'Prevented from processing.',           tone: 'red',    icon: <Ban size={14}/> },
    { v: 'rejected',  label: 'Rejected',  sub: 'Denied. If completed, funds reverse.', tone: 'red',    icon: <XCircle size={14}/> },
  ]

  const toneClass = (tone: string, active: boolean) => {
    if (!active) return 'border-gray-200 hover:border-gray-300'
    const map: any = {
      green:  'border-green-500 bg-green-50',
      yellow: 'border-yellow-500 bg-yellow-50',
      purple: 'border-purple-500 bg-purple-50',
      red:    'border-red-500 bg-red-50',
    }
    return map[tone] || 'border-navy-600 bg-navy-50'
  }

  const now = new Date()
  const preview = backdate
    ? new Date(`${postedDate}T${postedTime}:00`).toLocaleString()
    : initialDate.toLocaleString()

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-serif text-lg font-bold text-gray-900">Edit Transaction</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
              {tx.description || tx.id}{tx.user ? ` · ${tx.user}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current summary */}
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Amount</p>
              <p className={`font-mono font-bold mt-0.5 ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Current status</p>
              <p className="font-semibold text-gray-900 capitalize mt-0.5">{initialStatus}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-widest text-gray-400">Currently dated</p>
              <p className="text-gray-900 mt-0.5">{initialDate.toLocaleString()}</p>
            </div>
          </div>

          {/* Status selector */}
          <div>
            <p className="label !mb-2">Change status to</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.v} onClick={() => setStatus(opt.v)}
                  className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-2.5
                    ${toneClass(opt.tone, status === opt.v)}`}>
                  <span className={`mt-0.5 text-${opt.tone}-600`}>{opt.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 leading-tight mt-0.5">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Backdate */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={backdate} onChange={e => setBackdate(e.target.checked)}
                className="accent-navy-600 w-4 h-4"/>
              <span className="text-sm font-semibold text-gray-900">Backdate this transaction</span>
            </label>
            {backdate && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={postedDate} max={now.toISOString().slice(0,10)}
                    onChange={e => setPostedDate(e.target.value)}/>
                </div>
                <div>
                  <label className="label">Time</label>
                  <input type="time" className="input" value={postedTime}
                    onChange={e => setPostedTime(e.target.value)}/>
                </div>
              </div>
            )}
            {backdate && (
              <p className="text-xs text-gray-500 mt-2">Statement will show: <span className="font-semibold text-gray-900">{preview}</span></p>
            )}
          </div>

          {/* Admin note */}
          <div>
            <label className="label">Admin note <span className="text-gray-400 normal-case font-normal">(internal, audit only)</span></label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Refund per case #4821"/>
          </div>

          {/* Impact hint */}
          {status === 'completed' && initialStatus !== 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-900 flex gap-2">
              <span>✓</span>
              <span>Marking as completed will POST the funds to the account ({tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}).</span>
            </div>
          )}
          {initialStatus === 'completed' && status !== 'completed' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex gap-2">
              <span>⚠</span>
              <span>Moving away from completed will REVERSE the balance impact ({tx.amount > 0 ? '−' : '+'}{fmt(tx.amount)}).</span>
            </div>
          )}
          {status === 'blocked' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 flex gap-2">
              <span>🛑</span>
              <span>Blocked transactions are visible to the customer as "Blocked" and cannot proceed without further admin action.</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={pending}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TxRow({ tx, onAction, onDelete, onEdit }: { tx: any; onAction: (a: string) => void; onDelete?: () => void; onEdit?: () => void }) {
  const statusColors: any = {
    completed: 'bg-green-50 text-green-600',
    pending:   'bg-yellow-50 text-yellow-700',
    held:      'bg-purple-50 text-purple-600',
    blocked:   'bg-red-100 text-red-700',
    failed:    'bg-red-50 text-red-600',
    rejected:  'bg-red-50 text-red-600',
  }
  return (
    <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900 truncate">{tx.description}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusColors[tx.status] || 'bg-gray-100 text-gray-600'}`}>{tx.status}</span>
          {tx.status === 'held' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">⏸ HELD</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{tx.user} · {new Date(tx.created_at).toLocaleString()}</p>
      </div>
      <span className={`font-mono font-bold text-sm flex-shrink-0 ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString('en-US',{minimumFractionDigits:2})}
      </span>
      {(tx.status === 'pending' || tx.status === 'held') && (
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => onAction('approve')} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-semibold transition-all">
            <CheckCircle size={12}/>Approve
          </button>
          {tx.status === 'pending' && (
            <button onClick={() => onAction('hold')} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-all">
              <PauseCircle size={12}/>Hold
            </button>
          )}
          <button onClick={() => onAction('reject')} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all">
            <XCircle size={12}/>Reject
          </button>
        </div>
      )}
      {onEdit && (
        <button onClick={onEdit} title="Edit / change status / backdate"
          className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 text-gray-600 hover:bg-navy-50 hover:text-navy-600 rounded-lg text-xs font-semibold transition-all flex-shrink-0">
          <Pencil size={12}/>
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} title="Delete transaction"
          className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-semibold transition-all flex-shrink-0">
          <Trash2 size={12}/>
        </button>
      )}
    </div>
  )
}
