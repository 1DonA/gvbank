import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import {
  User, Mail, Phone, MapPin, ShieldCheck, KeyRound, Calendar, BadgeCheck, LogOut,
  Smartphone, Monitor, Bell, Activity, Trash2, Globe2, Pencil, Camera, X, Languages,
} from 'lucide-react'
import { LANGUAGES, LangCode, useLang } from '../i18n'

export function ProfilePage() {
  const { user, logout, setAuth, token } = useAuthStore()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => userAPI.me().then(r => r.data),
  })

  // Edit mode toggle for the personal info form
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', address: '' })
  const resetForm = (p: any) => setForm({
    first_name: p?.first_name || '',
    last_name:  p?.last_name  || '',
    phone:      p?.phone      || '',
    address:    p?.address    || '',
  })
  useEffect(() => { if (profile) resetForm(profile) }, [profile])

  const updateProfile = useMutation({
    mutationFn: (d: any) => userAPI.update(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      if (user && token) {
        setAuth({ ...user, name: `${form.first_name} ${form.last_name}` }, token)
      }
      toast.success('Profile updated')
      setEditing(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update profile')
  })

  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useMutation({
    mutationFn: (data_url: string) => userAPI.uploadAvatar(data_url),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile picture updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to upload')
  })
  const removeAvatar = useMutation({
    mutationFn: () => userAPI.removeAvatar(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile picture removed') }
  })

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 750_000) { toast.error('Please upload an image under 750 KB'); return }
    const reader = new FileReader()
    reader.onload = () => uploadAvatar.mutate(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Language preference
  const [lang, setLang] = useLang()
  const setLanguage = useMutation({
    mutationFn: (l: LangCode) => userAPI.setLanguage(l),
    onSuccess: (_d, l: any) => { setLang(l); toast.success('Language updated') }
  })

  // Password section
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const changePw = useMutation({
    mutationFn: (d: any) => userAPI.changePassword(d),
    onSuccess: () => {
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password changed successfully')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to change password')
  })

  const saveProfile = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Name fields cannot be empty'); return
    }
    updateProfile.mutate(form)
  }

  const submitPw = () => {
    if (!pw.current || !pw.next || !pw.confirm) { toast.error('All password fields are required'); return }
    if (pw.next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return }
    changePw.mutate({ current_password: pw.current, new_password: pw.next })
  }

  if (isLoading || !profile) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>
  }

  const initials = `${(profile.first_name || ' ')[0]}${(profile.last_name || ' ')[0]}`.trim()

  return (
    <div className="space-y-6">
      {/* Hero with avatar upload */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {profile.profile_picture ? (
            <img src={profile.profile_picture} alt=""
              className="w-16 h-16 rounded-2xl object-cover"/>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-600 to-[#1e3a5f] flex items-center justify-center text-white text-2xl font-serif font-bold">{initials}</div>
          )}
          <button onClick={() => fileRef.current?.click()}
            title="Change profile picture"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow text-navy-600 flex items-center justify-center hover:bg-gray-50">
            <Camera size={13}/>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
            {profile.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                <BadgeCheck size={12}/> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Calendar size={11}/> Member since {new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          {profile.profile_picture && (
            <button onClick={() => removeAvatar.mutate()}
              className="text-xs text-red-600 mt-1.5 hover:underline">Remove picture</button>
          )}
        </div>
      </div>

      {/* Personal information — read-only by default, edit toggles editable mode */}
      <Section title="Personal Information" icon={<User size={16}/>}
        action={
          !editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:underline">
              <Pencil size={13}/> Edit
            </button>
          ) : null
        }>
        {!editing ? (
          // VIEW mode
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <ViewField label="Legal name" value={`${profile.first_name} ${profile.last_name}`} icon={<User size={13}/>}/>
            <ViewField label="Email"      value={profile.email}                              icon={<Mail size={13}/>}/>
            <ViewField label="Phone"      value={profile.phone || 'Not on file'}            icon={<Phone size={13}/>}/>
            <ViewField label="Address"    value={profile.address || 'Not on file'}          icon={<MapPin size={13}/>}/>
          </div>
        ) : (
          // EDIT mode
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="First name">
                <input className="input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}/>
              </Field>
              <Field label="Last name">
                <input className="input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}/>
              </Field>
            </div>
            <Field label="Email" hint="Contact support to change your email">
              <div className="input bg-gray-50 text-gray-500 flex items-center gap-2 cursor-not-allowed">
                <Mail size={14}/> {profile.email}
              </div>
            </Field>
            <Field label="Phone">
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
              </div>
            </Field>
            <Field label="Mailing address">
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                <input className="input pl-9" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
              </div>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { resetForm(profile); setEditing(false) }} disabled={updateProfile.isPending}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-60">
                Cancel
              </button>
              <button onClick={saveProfile} disabled={updateProfile.isPending}
                className="px-6 py-2.5 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-60">
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Language preference */}
      <Section title="Language" icon={<Languages size={16}/>}>
        <p className="text-sm text-gray-500">Choose your preferred language for the GV Union Bank experience.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {LANGUAGES.map(l => (
            <button key={l.code}
              onClick={() => setLanguage.mutate(l.code as LangCode)}
              className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-left
                ${lang === l.code ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:border-gray-300'}`}>
              <span className="text-xl">{l.flag}</span>
              <span className={`text-sm font-semibold ${lang === l.code ? 'text-navy-600' : 'text-gray-700'}`}>{l.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={<ShieldCheck size={16}/>}>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3 text-sm">
          <ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-green-900">Two-factor authentication is on</p>
            <p className="text-xs text-green-800 mt-0.5">Every sign-in and every transfer requires a 6-digit code sent to your email and phone.</p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <KeyRound size={14}/> Change password
          </p>
          <div className="space-y-3">
            <Field label="Current password">
              <input type="password" className="input" value={pw.current}
                     onChange={e => setPw({...pw, current: e.target.value})} autoComplete="current-password"/>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="New password">
                <input type="password" className="input" value={pw.next}
                       onChange={e => setPw({...pw, next: e.target.value})} autoComplete="new-password"/>
              </Field>
              <Field label="Confirm new password">
                <input type="password" className="input" value={pw.confirm}
                       onChange={e => setPw({...pw, confirm: e.target.value})} autoComplete="new-password"/>
              </Field>
            </div>
            <p className="text-xs text-gray-400">Use at least 8 characters with mixed case and a number.</p>
            <div className="flex justify-end">
              <button onClick={submitPw} disabled={changePw.isPending}
                      className="px-6 py-2.5 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] transition-all disabled:opacity-60">
                {changePw.isPending ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Notification Preferences */}
      <NotificationsSection/>

      {/* Login activity */}
      <LoginActivitySection/>

      {/* Sign out */}
      <Section title="Session" icon={<LogOut size={16}/>}>
        <p className="text-sm text-gray-500">Sign out of this device. You can sign back in any time with your email, password, and a fresh verification code.</p>
        <div className="flex justify-end">
          <button onClick={logout}
                  className="px-6 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all">
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}

// ── Notification Preferences ──────────────────────────────────────────────
function NotificationsSection() {
  // Persisted to localStorage so toggles stick between sessions
  const KEY = 'gv_notif_prefs'
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || defaults() }
    catch { return defaults() }
  })

  function defaults() {
    return {
      transactions: { email: true,  sms: true,  push: true },
      security:     { email: true,  sms: true,  push: true },
      transfers:    { email: true,  sms: false, push: true },
      statements:   { email: true,  sms: false, push: false },
      marketing:    { email: false, sms: false, push: false },
    }
  }

  const set = (cat: string, ch: string, v: boolean) => {
    const next = { ...prefs, [cat]: { ...prefs[cat], [ch]: v } }
    setPrefs(next)
    localStorage.setItem(KEY, JSON.stringify(next))
    toast.success('Notification preferences saved', { id: 'notif' })
  }

  const rows = [
    { key: 'transactions', title: 'Card transactions',       sub: 'Every time your card is used' },
    { key: 'security',     title: 'Security alerts',          sub: 'Sign-ins, password changes, suspicious activity' },
    { key: 'transfers',    title: 'Transfers & deposits',     sub: 'Money in or out of your accounts' },
    { key: 'statements',   title: 'Monthly statements',       sub: 'Notice when statements are ready' },
    { key: 'marketing',    title: 'Offers & promotions',      sub: 'New products and rewards offers' },
  ]

  return (
    <Section title="Notification Preferences" icon={<Bell size={16}/>}>
      <p className="text-sm text-gray-500 mb-2">Choose how you'd like to be notified about activity on your account.</p>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-widest">
              <th className="text-left font-bold py-2">Activity</th>
              <th className="text-center font-bold py-2 px-2">Email</th>
              <th className="text-center font-bold py-2 px-2">SMS</th>
              <th className="text-center font-bold py-2 px-2">Push</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.key}>
                <td className="py-3 pr-3">
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.sub}</p>
                </td>
                {(['email','sms','push'] as const).map(ch => (
                  <td key={ch} className="text-center px-2">
                    <Switch on={prefs[r.key][ch]} onClick={() => set(r.key, ch, !prefs[r.key][ch])}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">Standard SMS rates may apply. You can update these settings at any time.</p>
    </Section>
  )
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative inline-block w-10 h-6 rounded-full transition-colors ${on ? 'bg-navy-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}/>
    </button>
  )
}

// ── Login activity (fetched from backend, admin-editable) ─────────────────
function LoginActivitySection() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => userAPI.sessions().then(r => r.data),
  })

  const relativeWhen = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = Date.now()
    const s = Math.floor((now - d.getTime()) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86_400) return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    if (s < 172_800) return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    if (s < 7 * 86_400) return `${Math.floor(s/86_400)} days ago, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <Section title="Login Activity" icon={<Activity size={16}/>}>
      <p className="text-sm text-gray-500">Recent sign-ins to your account. If you don't recognize one of these, change your password immediately and contact us.</p>
      <div className="divide-y divide-gray-100 border-t border-gray-100 mt-2">
        {isLoading && <p className="text-center text-sm text-gray-400 py-4">Loading…</p>}
        {!isLoading && sessions.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">No recent sign-ins recorded.</p>
        )}
        {sessions.map((s: any) => {
          const device = s.device || 'Unknown device'
          const Icon = device.startsWith('iPhone') || device.startsWith('Android') || device.toLowerCase().includes('phone')
            ? Smartphone : Monitor
          return (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${s.is_current ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <Icon size={16}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{device}</p>
                  {s.is_current && (
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Current session</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 flex-wrap">
                  <Globe2 size={11}/> {s.location || 'Unknown location'}
                  {s.ip && <> · IP {s.ip}</>}
                  {' · '}{relativeWhen(s.logged_at)}
                </p>
              </div>
              {!s.is_current && (
                <button onClick={() => toast.success('Session revoked')}
                  className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
                  <Trash2 size={12}/> Sign out
                </button>
              )}
            </div>
          )
        })}
      </div>
      {sessions.length > 1 && (
        <button onClick={() => toast.success('All other sessions signed out')}
          className="mt-3 text-sm font-semibold text-navy-600 hover:underline">
          Sign out of all other devices
        </button>
      )}
    </Section>
  )
}

function Section({ title, icon, children, action }: { title: string; icon: any; children: any; action?: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-navy-600">{icon}</span> {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function ViewField({ label, value, icon }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm text-gray-900 mt-1.5 flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>} {value}
      </p>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: any }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
