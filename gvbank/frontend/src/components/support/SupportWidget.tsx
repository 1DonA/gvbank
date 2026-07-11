import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle, X, Send, Phone, HeadphonesIcon, ChevronDown,
  CreditCard, Lock, ArrowRightLeft, PiggyBank, FileText, UserCircle,
} from 'lucide-react'
import { supportAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

// ── Quick-action presets ───────────────────────────────────────────────────
// These match the keys the backend knows about (support.py: QUICK_ACTION_REPLIES).
interface QuickAction {
  id: string
  icon: any
  label: string
  message: string        // exact text posted as the customer's message
}
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'card_lost',       icon: CreditCard,     label: 'Lost or stolen card',   message: "I need to report a lost or stolen card." },
  { id: 'account_locked',  icon: Lock,           label: "I'm locked out",         message: "I'm locked out of my account." },
  { id: 'transfer_help',   icon: ArrowRightLeft, label: 'Transfer question',      message: "I have a question about a transfer." },
  { id: 'open_account',    icon: PiggyBank,      label: 'Open a new account',     message: "How do I open a new account?" },
  { id: 'statement_help',  icon: FileText,       label: 'Statement help',         message: "I need help with a statement." },
  { id: 'talk_human',      icon: UserCircle,     label: 'Talk to a human',        message: "I'd like to talk to a human agent, please." },
]

/**
 * Floating chat button + panel for the customer.
 * - Bottom-right on desktop, bottom-sheet full-width on mobile.
 * - Polls /support/my-chat every 5s while open, every 30s while closed (for badge).
 */
export function SupportWidget() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  // Only for customers; admin gets the inbox in AdminDashboard
  if (!user || user.role === 'admin') return null

  return (
    <>
      {!open && <ClosedButton onOpen={() => setOpen(true)}/>}
      {open && <ChatPanel onClose={() => setOpen(false)}/>}
    </>
  )
}

// ── Collapsed button with unread badge ────────────────────────────────────
function ClosedButton({ onOpen }: { onOpen: () => void }) {
  const { data } = useQuery({
    queryKey: ['support-unread'],
    queryFn: () => supportAPI.unread().then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const unread = data?.unread || 0
  return (
    <button onClick={onOpen}
      className="fixed z-40 bottom-24 right-4 sm:bottom-6 sm:right-6 bg-navy-600 hover:bg-[#1e3a5f] text-white rounded-full w-14 h-14 shadow-bank-lg flex items-center justify-center transition-all hover:scale-105"
      aria-label="Open support chat">
      <MessageCircle size={22}/>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

// ── Open chat panel ───────────────────────────────────────────────────────
function ChatPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['support-chat'],
    queryFn: () => supportAPI.myChat().then(r => r.data),
    refetchInterval: 2_000,               // Poll every 2s while open
    refetchIntervalInBackground: true,    // Keep polling even if tab is in background
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  // Optimistic outbox: show the customer's message + typing indicator instantly.
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: ({ t, action }: { t: string; action?: string }) =>
      supportAPI.send(t, action).then(r => r.data),
    onMutate: ({ t }) => {
      setText('')
      setPendingUserMsg(t)
    },
    onSuccess: (res: any) => {
      // Optimistically inject the returned customer message + auto-reply
      // directly into the query cache so they appear instantly — no waiting
      // for a refetch or the next poll.
      qc.setQueryData(['support-chat'], (prev: any) => {
        if (!prev) return prev
        const existing = new Set((prev.messages || []).map((m: any) => m.id))
        const toAdd: any[] = []
        if (res?.message && !existing.has(res.message.id)) toAdd.push(res.message)
        if (res?.auto_reply && !existing.has(res.auto_reply.id)) toAdd.push(res.auto_reply)
        return { ...prev, messages: [...(prev.messages || []), ...toAdd] }
      })
      setPendingUserMsg(null)
      // Background refetch just to keep everything in sync.
      qc.invalidateQueries({ queryKey: ['support-chat'] })
    },
    onError: (e: any) => {
      setPendingUserMsg(null)
      const detail = e.response?.data?.detail
      const status = e.response?.status
      toast.error(
        detail ||
        (status
          ? `Send failed (HTTP ${status}). Please restart the backend and try again.`
          : 'Connection error — is the backend server running? (uvicorn app.main:app --reload --port 8000)')
      )
    },
  })

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [data?.messages?.length])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    send.mutate({ t })
  }

  const handleQuickAction = (a: QuickAction) => {
    send.mutate({ t: a.message, action: a.id })
  }

  // Have we heard from the customer yet? (Only the auto-welcome greeting)
  const hasCustomerMsg = (data?.messages || []).some((m: any) => m.sender_type === 'customer')

  // Human-connect state: customer asked for a human, no admin has replied YET.
  // Once any admin message arrives after the human-requested flag, we stop showing "Connecting…"
  const humanRequested = data?.human_requested === true
  const lastAdminIdx = (data?.messages || []).findIndex((m: any) => m.sender_type === 'admin')
  const hasAnyAdminMsg = lastAdminIdx !== -1
  const showConnecting = humanRequested && !hasAnyAdminMsg

  // Optimistic first-message shown before the API responds — never leaves the
  // user staring at "Connecting…".
  const optimisticWelcome = {
    id: '__welcome__',
    sender_type: 'system',
    sender_name: 'GV Support',
    text: `Hi ${user?.name?.split(' ')[0] || 'there'}! Welcome to GV Union Bank support. Tap a topic below or type your question — an agent will join in a moment.`,
    created_at: new Date().toISOString(),
  }
  const messages = data?.messages && data.messages.length > 0 ? data.messages : [optimisticWelcome]

  return (
    <div className="fixed z-50 inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[560px] sm:max-h-[calc(100vh-6rem)]
                    bg-white sm:rounded-2xl shadow-bank-lg flex flex-col sm:border sm:border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-600 to-[#1e3a5f] text-white p-4 sm:rounded-t-2xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <HeadphonesIcon size={20} className="text-gold-400"/>
          </div>
          <div>
            <p className="font-serif font-bold">GV Union Support</p>
            <p className="text-xs text-white/70 flex items-center gap-1.5">
              {data?.bot_muted && data?.assigned_agent ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-green-400"/> With {data.assigned_agent}</>
              ) : data?.support_online === false ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-gray-400"/> Currently offline</>
              ) : (
                <><span className="w-1.5 h-1.5 rounded-full bg-green-400"/> We're online now</>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
          aria-label="Close support chat">
          <ChevronDown size={20} className="sm:hidden"/>
          <X size={18} className="hidden sm:block"/>
        </button>
      </div>

      {/* Offline notice */}
      {data?.support_online === false && data?.offline_message && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs text-amber-900 leading-relaxed flex-shrink-0">
          {data.offline_message}
        </div>
      )}

      {/* Quick actions strip */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2 text-xs">
        <a href="tel:+498004822265" className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 rounded-full text-navy-600 font-semibold transition-colors">
          <Phone size={11}/> +49 800 GVB-BANK
        </a>
        <span className="text-gray-400 hidden sm:inline">·</span>
        <span className="text-gray-500 hidden sm:inline">Avg reply time: ~2 min</span>
      </div>

      {/* Messages list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((m: any) => <MessageBubble key={m.id} message={m}/>)}

        {/* Optimistic outbox: show the customer's message immediately */}
        {pendingUserMsg && (
          <MessageBubble message={{
            id: '__pending__',
            sender_type: 'customer',
            sender_name: 'You',
            text: pendingUserMsg,
            created_at: new Date().toISOString(),
          }}/>
        )}

        {/* Quick-action grid — visible until the customer has sent a message */}
        {!hasCustomerMsg && !pendingUserMsg && (
          <QuickActionsGrid onSelect={handleQuickAction} pending={send.isPending}/>
        )}

        {/* Connecting to a specialist — visible after "Talk to a human" until an admin actually replies */}
        {showConnecting && <ConnectingCard/>}

        {/* Typing dots. If the bot is muted (admin has replied before), show
            a subtle "specialist will reply" note instead of dots that never resolve. */}
        {send.isPending && !data?.bot_muted && <TypingIndicator/>}
        {send.isPending && data?.bot_muted && <SpecialistWillReplyNote agent={data?.assigned_agent}/>}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="border-t border-gray-100 p-3 flex items-end gap-2 bg-white sm:rounded-b-2xl flex-shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit(e as any)
            }
          }}
          placeholder="Or type your own question…"
          rows={1}
          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-navy-600 text-sm resize-none max-h-24"/>
        <button type="submit" disabled={!text.trim() || send.isPending}
          className="w-10 h-10 rounded-xl bg-navy-600 hover:bg-[#1e3a5f] text-white flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0">
          <Send size={16}/>
        </button>
      </form>
    </div>
  )
}

// ── Quick actions grid (shown before customer types anything) ─────────────
function QuickActionsGrid({ onSelect, pending }: { onSelect: (a: QuickAction) => void; pending: boolean }) {
  return (
    <div className="pt-2">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2 text-center">
        Or tap what you need
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(a => {
          const Icon = a.icon
          return (
            <button key={a.id} disabled={pending} onClick={() => onSelect(a)}
              className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-xl text-left hover:border-navy-600 hover:bg-navy-50 transition-all disabled:opacity-50">
              <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center flex-shrink-0">
                <Icon size={14}/>
              </div>
              <span className="text-xs font-semibold text-gray-900 leading-tight">{a.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Typing indicator (three animated dots) ────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0ms' }}/>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '150ms' }}/>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '300ms' }}/>
      </div>
    </div>
  )
}

// ── Small "specialist will reply" note (used after bot is muted) ─────────
function SpecialistWillReplyNote({ agent }: { agent?: string | null }) {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%]">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0ms' }}/>
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '200ms' }}/>
          </span>
          {agent ? `${agent} will reply shortly` : 'Your specialist will reply shortly'}
        </p>
      </div>
    </div>
  )
}

// ── "Connecting to a specialist" card ─────────────────────────────────────
// Shown after the customer taps "Talk to a human" until an actual admin reply
// arrives. Rotates through a few reassuring status messages.
function ConnectingCard() {
  const messages = [
    'Paging an available specialist…',
    'Verifying an agent is online…',
    'Connecting you to customer care…',
    'A specialist will join shortly.',
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2500)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="mx-auto max-w-[92%] bg-gradient-to-br from-navy-600 to-[#1e3a5f] text-white rounded-2xl px-5 py-4 shadow-bank">
      <div className="flex items-center gap-3">
        {/* Animated spinner ring */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-white/20"/>
          <div className="absolute inset-0 rounded-full border-2 border-t-gold-400 border-transparent animate-spin"/>
          <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
            <HeadphonesIcon size={12} className="text-gold-400"/>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Connecting to a specialist</p>
          <p className="text-xs text-white/70 mt-0.5">{messages[idx]}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {[0,1,2,3].map(i => (
          <span key={i}
            className={`h-0.5 flex-1 rounded-full transition-all duration-500
              ${i === idx ? 'bg-gold-400' : 'bg-white/20'}`}/>
        ))}
      </div>
      <p className="text-[10px] text-white/50 mt-2.5 text-center">You'll stay in the chat — no need to refresh.</p>
    </div>
  )
}

// ── One message bubble ───────────────────────────────────────────────────
function MessageBubble({ message }: { message: any }) {
  const isCustomer = message.sender_type === 'customer'
  const isSystem = message.sender_type === 'system'

  if (isSystem) {
    return (
      <div className="text-center">
        <div className="inline-block bg-white border border-gray-100 rounded-xl px-3 py-2 max-w-[90%]">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">{message.sender_name}</p>
          <p className="text-sm text-gray-700 text-left">{message.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCustomer ? 'order-2' : ''}`}>
        {!isCustomer && (
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5 ml-1">{message.sender_name}</p>
        )}
        <div className={`px-3.5 py-2 rounded-2xl text-sm break-words
          ${isCustomer
            ? 'bg-navy-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'}`}>
          {message.text}
        </div>
        <p className={`text-[10px] mt-1 ${isCustomer ? 'text-right' : ''} text-gray-400`}>
          {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
