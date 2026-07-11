// Lightweight i18n. Persists choice to localStorage, exposes a `useT()` hook.
// No external dependencies.

import { useState, useEffect, useCallback } from 'react'

export type LangCode = 'en' | 'es' | 'fr' | 'zh'

export const LANGUAGES: { code: LangCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English',  flag: '🇺🇸' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
]

const STORAGE_KEY = 'gv_language'

type TranslationKey = keyof typeof TRANSLATIONS

// English is the source / fallback. Spanish, French, Chinese override what's translated.
const TRANSLATIONS = {
  // Header / nav
  'nav.personal':         { en: 'Personal',     es: 'Personal',         fr: 'Personnel',     zh: '个人' },
  'nav.business':         { en: 'Business',     es: 'Empresas',         fr: 'Entreprise',    zh: '企业' },
  'nav.wealth':           { en: 'Wealth Management', es: 'Gestión de Patrimonio', fr: 'Gestion de Fortune', zh: '财富管理' },
  'nav.commercial':       { en: 'Commercial',   es: 'Comercial',        fr: 'Commercial',    zh: '商业' },
  'nav.checking':         { en: 'Checking',     es: 'Cuenta corriente', fr: 'Compte chèque', zh: '支票账户' },
  'nav.savings':          { en: 'Savings & CDs', es: 'Ahorros y CDs',   fr: 'Épargne et CDs', zh: '储蓄与定期' },
  'nav.credit_cards':     { en: 'Credit cards', es: 'Tarjetas de crédito', fr: 'Cartes de crédit', zh: '信用卡' },
  'nav.home_loans':       { en: 'Home loans',   es: 'Préstamos hipotecarios', fr: 'Prêts immobiliers', zh: '房屋贷款' },
  'nav.auto':             { en: 'Auto',         es: 'Automóvil',        fr: 'Auto',          zh: '汽车贷款' },
  'nav.investing':        { en: 'Investing',    es: 'Inversiones',      fr: 'Investissement',zh: '投资' },
  'nav.education':        { en: 'Education',    es: 'Educación',        fr: 'Éducation',     zh: '教育' },
  'nav.travel':           { en: 'Travel',       es: 'Viajes',           fr: 'Voyages',       zh: '旅行' },

  // Header CTAs
  'cta.sign_in':          { en: 'Sign in',         es: 'Iniciar sesión', fr: 'Se connecter', zh: '登录' },
  'cta.open_account':     { en: 'Open Account',    es: 'Abrir cuenta',   fr: 'Ouvrir un compte', zh: '开户' },
  'cta.customer_service': { en: 'Customer service', es: 'Servicio al cliente', fr: 'Service client', zh: '客服' },
  'cta.schedule_meeting': { en: 'Schedule a meeting', es: 'Programar una reunión', fr: 'Planifier un rendez-vous', zh: '预约会议' },

  // Login page
  'login.title':          { en: 'Sign in to GV Union Bank', es: 'Iniciar sesión en GV Union Bank', fr: 'Connectez-vous à GV Union Bank', zh: '登录 GV Union Bank' },
  'login.subtitle':       { en: 'Access your accounts, move money, and manage cards.', es: 'Accede a tus cuentas, mueve dinero y gestiona tarjetas.', fr: 'Accédez à vos comptes, transférez de l\'argent et gérez vos cartes.', zh: '访问您的账户、转账和管理银行卡。' },
  'login.username':       { en: 'Username / Email', es: 'Usuario / Email', fr: 'Identifiant / E-mail', zh: '用户名 / 邮箱' },
  'login.password':       { en: 'Password', es: 'Contraseña', fr: 'Mot de passe', zh: '密码' },
  'login.forgot':         { en: 'Forgot password?', es: '¿Olvidaste tu contraseña?', fr: 'Mot de passe oublié ?', zh: '忘记密码？' },
  'login.remember':       { en: 'Remember my username on this device', es: 'Recordar mi usuario en este dispositivo', fr: 'Mémoriser mon identifiant sur cet appareil', zh: '在此设备上记住我的用户名' },
  'login.secure_badge':   { en: 'Secure Sign-In · 256-bit Encryption', es: 'Acceso seguro · Cifrado de 256 bits', fr: 'Connexion sécurisée · Chiffrement 256 bits', zh: '安全登录 · 256位加密' },

  // Landing hero
  'hero.bonus':           { en: 'Limited-Time Offer', es: 'Oferta por tiempo limitado', fr: 'Offre à durée limitée', zh: '限时优惠' },
  'hero.headline':        { en: 'bonus points', es: 'puntos de bonificación', fr: 'points bonus', zh: '奖励积分' },
  'hero.cta_details':     { en: 'See details', es: 'Ver detalles', fr: 'Voir les détails', zh: '查看详情' },
  'hero.cta_compare':     { en: 'Compare cards', es: 'Comparar tarjetas', fr: 'Comparer les cartes', zh: '比较卡片' },

  // Generic
  'common.member_fdic':   { en: 'Member FDIC', es: 'Miembro FDIC', fr: 'Membre FDIC', zh: 'FDIC 会员' },
  'common.learn_more':    { en: 'Learn more',   es: 'Más información', fr: 'En savoir plus', zh: '了解更多' },
  'common.continue':      { en: 'Continue',     es: 'Continuar', fr: 'Continuer', zh: '继续' },
  'common.back':          { en: 'Back',         es: 'Atrás', fr: 'Retour', zh: '返回' },
  'common.cancel':        { en: 'Cancel',       es: 'Cancelar', fr: 'Annuler', zh: '取消' },
  'common.save':          { en: 'Save changes', es: 'Guardar cambios', fr: 'Enregistrer', zh: '保存' },
  'common.edit':          { en: 'Edit',         es: 'Editar', fr: 'Modifier', zh: '编辑' },
}

function readStoredLang(): LangCode {
  if (typeof window === 'undefined') return 'en'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'en' || v === 'es' || v === 'fr' || v === 'zh') return v
  // Fall back to browser preference if it matches one of our supported locales
  const b = (navigator.language || 'en').slice(0, 2)
  return (b === 'es' || b === 'fr' || b === 'zh') ? b : 'en'
}

// Simple pub-sub so all useT() consumers re-render on change.
const listeners = new Set<(l: LangCode) => void>()
let _lang: LangCode = readStoredLang()

export function setLang(lang: LangCode) {
  _lang = lang
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, lang)
  listeners.forEach(fn => fn(lang))
}

export function getLang(): LangCode { return _lang }

export function useLang(): [LangCode, (l: LangCode) => void] {
  const [lang, setLocal] = useState<LangCode>(_lang)
  useEffect(() => {
    const fn = (l: LangCode) => setLocal(l)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  const change = useCallback((l: LangCode) => setLang(l), [])
  return [lang, change]
}

export function useT() {
  const [lang] = useLang()
  return useCallback((key: TranslationKey) => {
    const entry = TRANSLATIONS[key] as Record<LangCode, string> | undefined
    if (!entry) return key
    return entry[lang] || entry.en || key
  }, [lang])
}
