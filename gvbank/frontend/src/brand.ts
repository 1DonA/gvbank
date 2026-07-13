// Central place for all bank identity, contact info, and formatting.
// Change once here and every page picks up the update on next reload.

export const BRAND = {
  name: 'GV Union Bank',
  legal_name: 'GV Union Bank AG',
  motto: 'Banking made for every chapter of your life.',

  // ── Locations ────────────────────────────────────────────────────────────
  hq_city: 'Frankfurt am Main',
  hq_country: 'Germany',
  hq_street: 'Neue Mainzer Straße 46-50',
  hq_zip: '60311',

  offices: [
    'Frankfurt am Main',
    'London',
    'Amsterdam',
    'Zurich',
    'Luxembourg',
  ],

  // ── Contact ──────────────────────────────────────────────────────────────
  // Phone number temporarily disabled — customers are asked to contact their
  // account officer instead. Set these back when a real number is ready.
  phone_display: '',
  phone_tel:     '',
  phone_intl_display: '',
  phone_intl_tel:     '',
  account_officer_note: 'Please contact your dedicated account officer',
  support_email: 'support@gvunionbank.com',
  security_email: 'security@gvunionbank.com',

  // ── Regulatory ───────────────────────────────────────────────────────────
  regulator: 'BaFin',
  regulator_full: 'German Federal Financial Supervisory Authority (BaFin)',
  deposit_protection: 'Deposit protection up to €100,000 per depositor',
  license_id: 'BaFin ID: 8000-0492-7',

  // ── Currency ─────────────────────────────────────────────────────────────
  currency_symbol: '€',
  currency_code: 'EUR',
  locale: 'en-DE',
}

/** Format a number as the bank's currency. e.g. €1,234.50 */
export const money = (n: number, opts?: { hideSymbol?: boolean }) => {
  const s = Math.abs(n).toLocaleString('en-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return opts?.hideSymbol ? s : `${BRAND.currency_symbol}${s}`
}
