import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  MessageCircle, Send, CheckCircle2, RotateCcw, Search, Circle, Clock,
  Settings, Trash2, Save, X,
} from 'lucide-react'

/** Admin support inbox: list + conversation view. Polls every 4s. */
export function AdminSupportInbox() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const { data: list } = useQuery({
    queryKey: ['admin-support-chats'],
    queryFn: () => supportAPI.listChats().then(r => r.data),
    refetchInterval: 10_000,
  })

  const chats = (list?.chats || []).filter((c: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.customer_name.toLowerCase().includes(q) ||
           c.customer_email.toLowerCase().includes(q) ||
           (c.last_preview || '').toLowerCase().includes(q)
  })

  return (
    <>
      <StatusBar onOpenSettings={() => setShowSettings(true)}/>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)}/>}
      <div className="grid md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-16rem)] min-h-[500px]">
      {/* Chat list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle size={16} className="text-navy-600"/>
          <h3 className="font-semibold text-gray-900 flex-1">Conversations</h3>
          {list?.total_unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{list.total_unread}</span>
          )}
        </div>
        <div className="px-3 pt-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy-600"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mt-2">
          {chats.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-16">No conversations yet</p>
          )}
          {chats.map((c: any) => {
            const active = c.chat_id === activeChatId
            return (
              <button key={c.chat_id} onClick={() => setActiveChatId(c.chat_id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3
                  ${active ? 'bg-navy-50 border-l-4 border-l-navy-600' : c.human_requested ? 'border-l-4 border-l-red-500' : ''}`}>
                {c.customer_avatar ? (
                  <img src={c.customer_avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-navy-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {c.customer_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.customer_name}</p>
                    {c.unread_by_admin > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                        {c.unread_by_admin}
                      </span>
                    )}
                    {c.human_requested && (
                      <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 uppercase tracking-widest">
                        Human wanted
                      </span>
                    )}
                    {c.status === 'resolved' && (
                      <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Resolved</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {c.last_sender === 'customer' ? '' : c.last_sender === 'admin' ? 'You: ' : ''}{c.last_preview}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={9}/> {relativeTime(c.last_message_at)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation view */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
        {activeChatId
          ? <ConversationView chatId={activeChatId}/>
          : <EmptyState/>
        }
      </div>
      </div>
    </>
  )
}

// ── Online/offline status strip ────────────────────────────────────────────
function StatusBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-support-settings'],
    queryFn: () => supportAPI.getSettings().then(r => r.data),
    refetchInterval: 30_000,
  })
  const online = !!data?.support_online

  const toggle = useMutation({
    mutationFn: () => supportAPI.updateSettings({ support_online: !online }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-settings'] })
      toast.success(online ? 'You are now offline' : 'You are now online')
    },
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}/>
        <p className="text-sm font-semibold text-gray-900">
          {online ? 'Support is online' : 'Support is offline'}
        </p>
      </div>
      <p className="text-xs text-gray-500 flex-1 min-w-0">
        {online
          ? 'Customers see a green dot and can send messages.'
          : "Customers see 'offline' and your away message. New messages still arrive."}
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => toggle.mutate()} disabled={toggle.isPending}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${online ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>
          {online ? 'Go offline' : 'Go online'}
        </button>
        <button onClick={onOpenSettings}
          className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
          <Settings size={15}/>
        </button>
      </div>
    </div>
  )
}

// ── Settings modal (welcome / offline messages) ────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-support-settings'],
    queryFn: () => supportAPI.getSettings().then(r => r.data),
  })
  const [welcome, setWelcome] = useState('')
  const [offline, setOffline] = useState('')

  useEffect(() => {
    if (data) {
      setWelcome(data.support_welcome_message)
      setOffline(data.support_offline_message)
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => supportAPI.updateSettings({
      support_welcome_message: welcome,
      support_offline_message: offline,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-settings'] })
      toast.success('Chat messages updated')
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-bank-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-gray-900">Chat messages</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Welcome message <span className="text-gray-400 normal-case font-normal">(shown when a customer opens chat for the first time)</span></label>
            <textarea rows={3} value={welcome} onChange={e => setWelcome(e.target.value)}
              className="input" placeholder="Hi {first_name}!"/>
            <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{first_name}'}</code> to insert the customer's name.</p>
          </div>
          <div>
            <label className="label">Offline / away message <span className="text-gray-400 normal-case font-normal">(shown while you're offline)</span></label>
            <textarea rows={3} value={offline} onChange={e => setOffline(e.target.value)}
              className="input" placeholder="Business hours: Mon-Fri 8-6 CET…"/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex-1 py-3 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Save size={14}/> {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
      <MessageCircle size={44} className="text-gray-300 mb-4"/>
      <p className="font-serif text-lg font-semibold text-gray-500">Choose a conversation</p>
      <p className="text-sm mt-1 max-w-xs">Pick a customer from the left to view and reply to their support messages.</p>
    </div>
  )
}

// ── Conversation view ─────────────────────────────────────────────────────
function ConversationView({ chatId }: { chatId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-chat', chatId],
    queryFn: () => supportAPI.getChat(chatId).then(r => r.data),
    refetchInterval: 2_500,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })

  const reply = useMutation({
    mutationFn: (t: string) => supportAPI.reply(chatId, t).then(r => r.data),
    onMutate: () => setText(''),
    onSuccess: (res: any) => {
      // Optimistically inject the new admin message into the cache immediately.
      qc.setQueryData(['admin-support-chat', chatId], (prev: any) => {
        if (!prev) return prev
        const already = (prev.messages || []).some((m: any) => m.id === res.id)
        if (already) return prev
        return { ...prev, messages: [...(prev.messages || []), res] }
      })
      qc.invalidateQueries({ queryKey: ['admin-support-chat', chatId] })
      qc.invalidateQueries({ queryKey: ['admin-support-chats'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to send'),
  })

  const toggleResolved = useMutation({
    mutationFn: () => supportAPI.toggleResolved(chatId),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin-support-chat', chatId] })
      qc.invalidateQueries({ queryKey: ['admin-support-chats'] })
      toast.success(res.data.status === 'resolved' ? 'Marked resolved' : 'Reopened')
    },
  })

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [data?.messages?.length])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    reply.mutate(t)
  }

  if (isLoading || !data) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  const c = data.customer

  return (
    <>
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
        {c.avatar ? (
          <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover"/>
        ) : (
          <div className="w-10 h-10 rounded-full bg-navy-600 text-white text-sm font-bold flex items-center justify-center">
            {c.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{c.name}</p>
            {data.human_requested && (
              <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                🔴 Human requested
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
        </div>
        <button onClick={() => toggleResolved.mutate()}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors
            ${data.status === 'resolved'
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          {data.status === 'resolved' ? <><RotateCcw size={12}/>Reopen</> : <><CheckCircle2 size={12}/>Resolve</>}
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {data.messages.map((m: any) => (
          <MessageBubble key={m.id} message={m} customerName={c.name.split(' ')[0]}
            onDelete={() => {
              if (confirm('Delete this message? It will be hidden from both sides.')) {
                supportAPI.deleteMessage(m.id).then(() => {
                  qc.invalidateQueries({ queryKey: ['admin-support-chat', chatId] })
                  toast.success('Message deleted')
                })
              }
            }}/>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="border-t border-gray-100 p-3 flex items-end gap-2 bg-white flex-shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e as any) }
          }}
          placeholder="Type your reply…"
          rows={1}
          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-navy-600 text-sm resize-none max-h-24"/>
        <button type="submit" disabled={!text.trim() || reply.isPending}
          className="px-4 py-2.5 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-40">
          <Send size={14}/> Reply
        </button>
      </form>
    </>
  )
}

function MessageBubble({ message, customerName, onDelete }: any) {
  const isAdmin = message.sender_type === 'admin'
  const isSystem = message.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="text-center">
        <div className="inline-block bg-white border border-gray-100 rounded-xl px-3 py-2 max-w-[80%]">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">System</p>
          <p className="text-sm text-gray-700 text-left">{message.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`group flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[75%]">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${isAdmin ? 'text-right' : ''} text-gray-400`}>
          {isAdmin ? 'You' : customerName}
        </p>
        <div className={`relative px-3.5 py-2 rounded-2xl text-sm break-words
          ${isAdmin
            ? 'bg-navy-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'}`}>
          {message.text}
          {onDelete && (
            <button onClick={onDelete} title="Delete message"
              className={`absolute -top-2 ${isAdmin ? '-left-2' : '-right-2'} w-6 h-6 rounded-full bg-white border border-gray-200 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 flex items-center justify-center transition-opacity shadow-sm`}>
              <Trash2 size={11}/>
            </button>
          )}
        </div>
        <p className={`text-[10px] mt-1 ${isAdmin ? 'text-right' : ''} text-gray-400`}>
          {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────
function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const s = Math.floor((now - then) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86_400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86_400)}d ago`
}
