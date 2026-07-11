import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface OTPInputProps {
  value: string[]
  onChange: (val: string[]) => void
}

/**
 * 6-digit OTP entry. Masked by default (each digit renders as •).
 * Eye icon below the row toggles temporary reveal.
 */
export function OTPInput({ value, onChange }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [reveal, setReveal] = useState(false)

  const focusAt = (i: number) => { refs.current[i]?.focus() }

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const next = [...value]
    next[i] = v.slice(-1)
    onChange(next)
    if (v && i < 5) focusAt(i + 1)
  }

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) focusAt(i - 1)
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    onChange(next)
    focusAt(Math.min(pasted.length, 5))
  }

  return (
    <div className="flex flex-col items-center my-6">
      <div className="flex gap-3 justify-center" onPaste={handlePaste}>
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            // Use type=password to mask; reveal toggle flips to type=text.
            type={reveal ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[i] || ''}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            className={`w-12 h-14 text-center text-2xl font-bold font-mono border-2 rounded-xl outline-none transition-all
              ${value[i] ? 'border-navy-600 bg-navy-50 text-navy-600' : 'border-gray-200 bg-white'}
              focus:border-navy-600 focus:shadow-[0_0_0_3px_rgba(10,22,40,0.1)]`}
          />
        ))}
      </div>
      <button type="button" onClick={() => setReveal(r => !r)}
        className="mt-3 text-xs text-gray-400 hover:text-navy-600 transition-colors flex items-center gap-1">
        {reveal ? <><EyeOff size={12}/> Hide code</> : <><Eye size={12}/> Show code</>}
      </button>
    </div>
  )
}
