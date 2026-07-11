// Centralized content for every personal-banking product page.
// All UI copy here is treated as marketing material — no real rates committed.

import { ReactNode } from 'react'

export interface ProductConfig {
  slug: string
  category: string                       // shown above title (e.g. "Personal Checking")
  title: string
  tagline: string
  heroBadge?: string                     // top-of-hero pill (e.g. "$300 sign-up bonus")
  heroGradient: string                   // tailwind gradient classes
  bullets: string[]                      // 3–6 key selling points
  rates: { label: string; value: string; sub?: string }[]
  features: { title: string; blurb: string; icon: string }[]
  faqs: { q: string; a: string }[]
  primaryCta: { label: string; to: string }
  secondaryCta?: { label: string; to: string }
  related: string[]                      // slugs of related products
  disclosure?: string                    // small print under page
}

export const PRODUCTS: Record<string, ProductConfig> = {
  // ── Checking ─────────────────────────────────────────────────────────────
  checking: {
    slug: 'checking',
    category: 'Personal Checking',
    title: 'Total Checking',
    tagline: 'Everyday banking with no surprises. $300 sign-up bonus when you set up direct deposit.',
    heroBadge: '$300 new-customer bonus',
    heroGradient: 'from-navy-600 via-[#1e3a5f] to-[#3a5d7c]',
    bullets: [
      'No monthly maintenance fee with qualifying activity',
      'Free GV Union Bank debit card with chip & contactless',
      'Free Zelle, mobile check deposit, and bill pay',
      'Access to 15,000+ fee-free ATMs nationwide',
      'Overdraft protection options at no enrollment fee',
      'FDIC-insured up to $250,000 per depositor',
    ],
    rates: [
      { label: 'Monthly fee', value: '$0', sub: 'with qualifying activity, otherwise $12' },
      { label: 'Minimum to open', value: '$0' },
      { label: 'Sign-up bonus', value: '$300', sub: 'with $1,500 in direct deposits within 90 days' },
      { label: 'Overdraft fee', value: '$0', sub: 'first incident per year waived' },
    ],
    features: [
      { icon: 'Smartphone',    title: 'Mobile banking',     blurb: 'Deposit checks, send Zelle, freeze your card, and manage subscriptions — all from one app.' },
      { icon: 'Bell',          title: 'Instant alerts',     blurb: 'Get notified the moment a transaction posts. Customize alerts by amount, merchant or category.' },
      { icon: 'ShieldCheck',   title: 'Zero-liability protection', blurb: 'You\'re not responsible for unauthorized debit-card transactions when reported promptly.' },
      { icon: 'Globe2',        title: '15,000+ ATMs',       blurb: 'Withdraw cash fee-free at GV Union ATMs and our AllPoint partner network.' },
    ],
    faqs: [
      { q: 'How do I qualify to waive the monthly fee?',
        a: 'Make any of the following each statement cycle: receive at least one electronic deposit, keep a $1,500 average balance, or be a current student under age 24.' },
      { q: 'When will I receive my debit card?',
        a: 'Your card ships within 5–7 business days of account approval. You can use a virtual card immediately from the GV mobile app.' },
      { q: 'Are mobile check deposits available right away?',
        a: 'The first $225 of any deposit is typically available the next business day. The remainder posts within 2 business days for most checks.' },
      { q: 'How does the $300 sign-up bonus work?',
        a: 'Open a new Total Checking account, set up qualifying direct deposit totaling $1,500 within 90 days, and the $300 will be deposited to your account within 15 days of meeting the requirement.' },
    ],
    primaryCta: { label: 'Open Checking →', to: '/register' },
    secondaryCta: { label: 'Compare checking accounts', to: '/products/savings' },
    related: ['savings', 'credit-cards', 'auto'],
    disclosure: 'Offer valid for new GV Union Bank checking customers only. Limit one bonus per household. Account must remain open for at least 6 months. APY accurate as of today; subject to change.',
  },

  // ── Savings & CDs ────────────────────────────────────────────────────────
  savings: {
    slug: 'savings',
    category: 'Personal Savings',
    title: 'High-Yield Savings & CDs',
    tagline: 'Earn 5.20% APY on every dollar with no minimum balance, or lock in a higher rate with a CD.',
    heroBadge: '5.20% APY · No minimum',
    heroGradient: 'from-[#1a4a3a] via-[#2a7a5a] to-[#4ea884]',
    bullets: [
      '5.20% APY on all balances — no tiers, no caps',
      'No minimum balance and no monthly fee',
      'Up to 6 free withdrawals per statement cycle',
      'Automatic savings goals with round-up deposits',
      'CD rates up to 5.50% APY with terms from 3 months to 5 years',
      'FDIC insured to $250,000 per depositor',
    ],
    rates: [
      { label: 'High-Yield Savings APY', value: '5.20%', sub: 'No minimum balance' },
      { label: '6-month CD APY',         value: '5.30%', sub: '$1,000 minimum' },
      { label: '12-month CD APY',        value: '5.50%', sub: '$1,000 minimum' },
      { label: '5-year CD APY',          value: '4.75%', sub: '$1,000 minimum' },
    ],
    features: [
      { icon: 'PiggyBank',  title: 'Round-up savings',  blurb: 'Round every debit-card purchase up to the nearest dollar and sweep the difference to your savings.' },
      { icon: 'Target',     title: 'Savings goals',     blurb: 'Set named goals (vacation, emergency fund, down payment) and watch them progress in the app.' },
      { icon: 'ShieldCheck', title: 'FDIC insured',     blurb: 'Your deposits are protected up to $250,000 per depositor by the FDIC.' },
      { icon: 'TrendingUp', title: 'Bonus interest',    blurb: 'Maintain a $25,000+ balance for 90 days and your APY bumps to 5.40%.' },
    ],
    faqs: [
      { q: 'How is interest calculated and paid?',
        a: 'Interest accrues daily on the collected balance and is credited to your account monthly. APY is variable and may change at any time.' },
      { q: 'Are there penalties for early CD withdrawal?',
        a: 'Yes. CDs withdrawn before maturity incur a penalty: 90 days of interest for terms under 12 months, 180 days for 12–36 months, and 365 days for terms over 36 months.' },
      { q: 'Can I link my savings to my checking account?',
        a: 'Yes. Linked savings provide free overdraft transfers and can be set up for automatic recurring savings.' },
    ],
    primaryCta: { label: 'Open Savings →', to: '/register' },
    secondaryCta: { label: 'Compare CD rates', to: '/products/savings' },
    related: ['checking', 'investing'],
    disclosure: 'APY accurate as of today\'s date. Rates are variable for savings accounts and may change at any time without notice. CD rates fixed for the term selected.',
  },

  // ── Credit Cards ─────────────────────────────────────────────────────────
  'credit-cards': {
    slug: 'credit-cards',
    category: 'Personal Credit Cards',
    title: 'Sapphire Preferred Credit Card',
    tagline: 'Earn 100,000 bonus points · 5× on travel · 3× on dining and groceries · annual travel credit.',
    heroBadge: '100,000 bonus points',
    heroGradient: 'from-[#5a3a8a] via-[#7a5ac0] to-[#a585d4]',
    bullets: [
      '100,000 bonus points after $4,000 spend in first 3 months',
      '5× points on GV Travel bookings',
      '3× points on dining, takeout, and grocery delivery',
      '2× points on all other travel',
      '$50 annual statement credit toward GV Travel purchases',
      'Complimentary access to 1,300+ airport lounges (Priority Pass Select)',
      'No foreign transaction fees',
    ],
    rates: [
      { label: 'Bonus points',           value: '100,000', sub: 'after $4,000 in 3 months' },
      { label: 'Annual fee',             value: '$95' },
      { label: 'Purchase APR',           value: '21.49% – 28.49%', sub: 'variable, based on creditworthiness' },
      { label: 'Foreign transaction fee', value: '$0' },
    ],
    features: [
      { icon: 'Plane',         title: 'Travel protection',     blurb: 'Trip cancellation insurance, baggage delay coverage, and primary rental-car insurance — all included.' },
      { icon: 'ShieldCheck',   title: 'Purchase protection',   blurb: 'New purchases covered against damage or theft for 120 days, up to $500 per claim.' },
      { icon: 'CreditCard',    title: 'Contactless + mobile',  blurb: 'Tap-to-pay everywhere, plus Apple Pay, Google Pay, and Samsung Pay.' },
      { icon: 'Award',         title: 'Status match',           blurb: 'Get instant Gold status with select hotel and rental partners as a Sapphire cardholder.' },
    ],
    faqs: [
      { q: 'What credit score do I need?',
        a: 'The Sapphire Preferred is best for applicants with a good-to-excellent credit history (typically 690+ FICO).' },
      { q: 'How do points work?',
        a: 'Points never expire as long as your account is open. Redeem at 1.25¢ per point through GV Travel, or transfer 1:1 to a dozen airline and hotel loyalty partners.' },
      { q: 'When are bonus points awarded?',
        a: 'Bonus points post to your account within 6–8 weeks after you meet the spending requirement.' },
    ],
    primaryCta: { label: 'Apply now →', to: '/register' },
    secondaryCta: { label: 'Compare cards', to: '/products/credit-cards' },
    related: ['checking', 'travel', 'investing'],
    disclosure: 'Credit lines and APRs subject to credit approval. Bonus offer for new cardholders only; existing Sapphire customers ineligible.',
  },

  // ── Home Loans ───────────────────────────────────────────────────────────
  'home-loans': {
    slug: 'home-loans',
    category: 'Home Lending',
    title: 'Mortgage & Home Equity',
    tagline: 'Buy, refinance, or tap into your equity. Get pre-qualified online in minutes with no credit impact.',
    heroBadge: '30-year rates from 6.49% APR',
    heroGradient: 'from-[#2c4a6e] via-[#3a5d7c] to-[#5a7d9e]',
    bullets: [
      '30-year fixed mortgages from 6.49% APR',
      'Get pre-qualified online in 5 minutes — no impact on your credit',
      'Low-down-payment options (3% down) for first-time buyers',
      'Home equity lines of credit (HELOC) up to $500,000',
      'Refinance to lower your monthly payment or cash out equity',
      'Dedicated home-lending advisor at every stage',
    ],
    rates: [
      { label: '30-year fixed', value: '6.49% APR', sub: '20% down · 740+ FICO' },
      { label: '15-year fixed', value: '5.99% APR', sub: '20% down · 740+ FICO' },
      { label: '5/1 ARM',       value: '5.79% APR', sub: 'first 5 years fixed' },
      { label: 'HELOC',         value: '8.25% APR', sub: 'variable, prime + 0.75%' },
    ],
    features: [
      { icon: 'Home',         title: 'First-time buyer support', blurb: 'Specialized programs with 3% down, lender-paid closing-cost credits, and free home-buyer education.' },
      { icon: 'Calculator',   title: 'Pre-qualification',        blurb: 'See how much you can afford in 5 minutes with a soft credit pull that doesn\'t affect your score.' },
      { icon: 'RefreshCcw',   title: 'Refinance options',        blurb: 'Lower your rate, shorten your term, or convert to a fixed rate. We\'ll waive the appraisal fee for existing customers.' },
      { icon: 'TrendingUp',   title: 'Cash-out equity',          blurb: 'Use your home\'s equity to consolidate debt, fund renovations, or invest. Tax-deductible interest in many cases.' },
    ],
    faqs: [
      { q: 'How much do I need for a down payment?',
        a: 'Conventional mortgages typically require 5–20% down, but our first-time-buyer programs go as low as 3%. FHA loans require as little as 3.5%.' },
      { q: 'How long does pre-qualification take?',
        a: 'You can get pre-qualified online in about 5 minutes. A formal pre-approval takes 1–2 business days and requires documentation of income and assets.' },
      { q: 'What are closing costs?',
        a: 'Closing costs typically run 2–5% of the loan amount and include lender fees, title insurance, escrow, and prepaid taxes/insurance.' },
    ],
    primaryCta: { label: 'Get pre-qualified →', to: '/register' },
    secondaryCta: { label: 'Use mortgage calculator', to: '/products/home-loans' },
    related: ['checking', 'savings', 'auto'],
    disclosure: 'All loans subject to credit approval. Rates shown are illustrative and depend on credit score, loan-to-value, property type, and other factors. APRs include estimated closing costs.',
  },

  // ── Auto ─────────────────────────────────────────────────────────────────
  auto: {
    slug: 'auto',
    category: 'Auto Lending',
    title: 'Auto Loans & Refinancing',
    tagline: 'New, used, or refinance — pre-qualify in minutes with no impact on your credit score.',
    heroBadge: 'Rates from 5.99% APR',
    heroGradient: 'from-[#0f3057] via-[#1e5f8b] to-[#5dc4e7]',
    bullets: [
      'Pre-qualify with a soft credit pull — see your real rate in 60 seconds',
      'Rates from 5.99% APR on new vehicles, 6.49% on used',
      'Refinance an existing auto loan and lower your payment',
      'Same-day funding once approved',
      'No prepayment penalties',
      'Loans up to $100,000 for new and used vehicles',
    ],
    rates: [
      { label: 'New car (60-month)',  value: '5.99% APR', sub: '760+ FICO' },
      { label: 'Used car (60-month)', value: '6.49% APR', sub: '760+ FICO' },
      { label: 'Refinance (60-month)', value: '6.29% APR', sub: '760+ FICO' },
      { label: 'Minimum loan',        value: '$5,000' },
    ],
    features: [
      { icon: 'Car',          title: 'Buy from any dealer',      blurb: 'Use your GV Union approval at the dealership of your choice — including private-party purchases.' },
      { icon: 'Zap',          title: 'Same-day funding',          blurb: 'Approved applications are typically funded the same day or next business day.' },
      { icon: 'RefreshCcw',   title: 'Refinance and save',        blurb: 'Average GV Union refinance customer saves $96 per month. See how much you could save in 60 seconds.' },
      { icon: 'ShieldCheck',  title: 'GAP & insurance options',   blurb: 'Optional gap coverage and mechanical breakdown protection available at loan signing.' },
    ],
    faqs: [
      { q: 'Do I have to buy a car from a specific dealer?',
        a: 'No. Your GV Union auto loan can be used at any franchise or independent dealership, or for private-party purchases.' },
      { q: 'How does refinancing work?',
        a: 'We pay off your existing auto lender and create a new loan with your new (typically lower) rate. There\'s no fee to refinance.' },
      { q: 'What documents do I need?',
        a: 'For new applications: proof of income, proof of insurance, and the vehicle\'s VIN. For refinances: your current payoff statement.' },
    ],
    primaryCta: { label: 'Pre-qualify now →', to: '/register' },
    secondaryCta: { label: 'See refinance savings', to: '/products/auto' },
    related: ['checking', 'home-loans', 'credit-cards'],
    disclosure: 'Subject to credit approval. Rates and terms based on creditworthiness, vehicle age, term length, and loan-to-value ratio.',
  },

  // ── Investing ────────────────────────────────────────────────────────────
  investing: {
    slug: 'investing',
    category: 'Investing',
    title: 'GV Union Investing',
    tagline: 'Self-directed trading, robo-advised portfolios, and personalized wealth advice — all under one roof.',
    heroBadge: '$0 commission on stocks & ETFs',
    heroGradient: 'from-[#1a2d4a] via-[#2c4570] to-[#5078b8]',
    bullets: [
      '$0 online commissions on stocks, ETFs, and options',
      'Robo-advised portfolios from 0.35% annual fee',
      'Access to a J.P. Morgan-level research team',
      'Free retirement planning consultations',
      'Tax-loss harvesting on managed portfolios',
      'Fractional shares — invest with as little as $5',
    ],
    rates: [
      { label: 'Stock & ETF trades',     value: '$0',     sub: 'unlimited' },
      { label: 'Options',                value: '$0.65',  sub: 'per contract' },
      { label: 'Robo-advisor fee',        value: '0.35%', sub: 'annual, $500 minimum' },
      { label: 'Personal advisor fee',    value: '0.75%', sub: 'annual, $25,000 minimum' },
    ],
    features: [
      { icon: 'LineChart',  title: 'Self-directed trading',   blurb: 'Trade stocks, ETFs, options, mutual funds, and bonds with industry-leading research tools.' },
      { icon: 'Briefcase',  title: 'Managed portfolios',      blurb: 'Tell us your goals and risk tolerance, and we\'ll build and manage a diversified portfolio for you.' },
      { icon: 'User',       title: 'Dedicated advisor',       blurb: 'Get a CFP®-credentialed advisor to plan retirement, education, and major life events.' },
      { icon: 'Target',     title: 'Retirement accounts',     blurb: 'Traditional, Roth, and SEP IRAs — plus 401(k) rollovers handled end-to-end.' },
    ],
    faqs: [
      { q: 'Is GV Union Investing FDIC or SIPC insured?',
        a: 'Brokerage accounts are protected by SIPC up to $500,000 (including $250,000 for cash). Cash sweep balances are FDIC insured.' },
      { q: 'What\'s the difference between self-directed and managed?',
        a: 'Self-directed: you pick the investments. Managed: we build a portfolio based on your goals and rebalance it for you. You can have both.' },
      { q: 'How long does it take to fund my account?',
        a: 'ACH transfers typically post in 2–3 business days. Wire transfers post same day. Trading is available immediately on settled funds.' },
    ],
    primaryCta: { label: 'Open Brokerage Account →', to: '/register' },
    secondaryCta: { label: 'Try our robo-advisor', to: '/products/investing' },
    related: ['savings', 'credit-cards'],
    disclosure: 'Investment products: Not a deposit · Not FDIC insured · Not insured by any federal government agency · May lose value. Subject to investment risk, including possible loss of principal.',
  },

  // ── Education ────────────────────────────────────────────────────────────
  education: {
    slug: 'education',
    category: 'Education',
    title: 'Education Savings & Loans',
    tagline: 'Plan, save, and finance college costs — from a 529 plan to a student loan refinance.',
    heroBadge: 'Tax-advantaged 529 plans',
    heroGradient: 'from-[#623b6e] via-[#8a5ca0] to-[#c082da]',
    bullets: [
      '529 college savings plans with state-tax deductions in 30+ states',
      'Coverdell ESA accounts for K-12 expenses',
      'Student loan refinancing from 5.49% APR',
      'In-school deferred private student loans',
      'Custodial UGMA/UTMA accounts',
      'Free college-planning consultation with a CFP®',
    ],
    rates: [
      { label: '529 plan annual fee', value: '0.20%' },
      { label: 'Student loan refi APR', value: '5.49% – 9.49%' },
      { label: 'In-school loan rate', value: '6.79% APR' },
      { label: 'Minimum to open 529', value: '$25' },
    ],
    features: [
      { icon: 'GraduationCap', title: '529 college savings', blurb: 'Tax-free growth and withdrawals for qualified education expenses. Use at any accredited school nationwide.' },
      { icon: 'BookOpen',      title: 'Refinance student loans', blurb: 'Consolidate federal and private student loans into one payment, often at a lower rate.' },
      { icon: 'Calculator',    title: 'College cost calculator', blurb: 'Project the total cost of college and the savings rate you\'ll need to hit your goal.' },
      { icon: 'Award',         title: 'Scholarship search',  blurb: 'Free scholarship-matching tool for GV Union customers, powered by our partner network.' },
    ],
    faqs: [
      { q: 'Can I use a 529 for anything besides college?',
        a: 'Yes. 529 funds can also be used for K-12 tuition (up to $10,000/year), apprenticeship programs, and up to $10,000 lifetime in student-loan repayment.' },
      { q: 'What happens if my child doesn\'t go to college?',
        a: 'You can change the beneficiary to another family member, hold the account for future use, or withdraw the money (taxes + 10% penalty apply on earnings).' },
      { q: 'Can I refinance federal student loans?',
        a: 'Yes, but doing so converts them to private loans. You\'ll lose federal benefits like income-driven repayment and PSLF. We\'ll help you weigh the trade-offs.' },
    ],
    primaryCta: { label: 'Open a 529 →', to: '/register' },
    secondaryCta: { label: 'Refinance my loans', to: '/products/education' },
    related: ['savings', 'investing'],
    disclosure: '529 plans are sponsored by a state and may offer state-tax benefits to residents. Investment options carry risk. Read the program description carefully before investing.',
  },

  // ── Travel ───────────────────────────────────────────────────────────────
  travel: {
    slug: 'travel',
    category: 'Travel',
    title: 'GV Travel',
    tagline: 'Book flights, hotels, and rental cars with your points. Earn 5× points when you book through GV Travel with a Sapphire card.',
    heroBadge: '5× points on travel',
    heroGradient: 'from-[#1f4e79] via-[#3a8dbe] to-[#7dc9f0]',
    bullets: [
      'Book flights, hotels, cars, and experiences with cash or points',
      'Earn 5× points on GV Travel bookings with eligible cards',
      'Price-match guarantee on hotel bookings',
      '24/7 travel concierge for Sapphire and Wealth customers',
      'Travel insurance included on cards (trip cancellation, baggage)',
      'Free TSA PreCheck/Global Entry credit on premium cards',
    ],
    rates: [
      { label: 'Points value when redeemed for travel', value: '1.25¢ per point' },
      { label: 'Hotel price-match guarantee',           value: 'Yes' },
      { label: 'Booking change fee',                    value: '$0', sub: 'on most reservations' },
      { label: 'Concierge access',                      value: 'Sapphire & Wealth' },
    ],
    features: [
      { icon: 'Plane',     title: 'Flights',         blurb: 'Search and book on 500+ airlines worldwide. Get exclusive cardholder discounts on premium cabins.' },
      { icon: 'Home',      title: 'Hotels',          blurb: 'Over 1 million properties bookable with points, plus elite-status upgrades and complimentary breakfast at thousands of hotels.' },
      { icon: 'Car',       title: 'Rental cars',     blurb: 'Skip the line with Avis Preferred and Hertz Gold included as a Sapphire benefit.' },
      { icon: 'Globe2',    title: 'Lounge access',   blurb: 'Priority Pass Select on Sapphire — over 1,300 lounges in 600+ airports worldwide.' },
    ],
    faqs: [
      { q: 'Can I redeem points for cash?',
        a: 'Yes, but you\'ll get the best value when redeeming for travel (1.25¢ per point) or transferring to one of our airline/hotel partners.' },
      { q: 'What if I need to cancel a trip?',
        a: 'Most bookings on GV Travel are cancellable up to 24 hours before departure for a full refund. Trip cancellation insurance on eligible cards covers other circumstances.' },
      { q: 'Do I need a GV credit card to use GV Travel?',
        a: 'No — anyone can book travel through GV Travel. But cardholders earn bonus points and unlock exclusive benefits.' },
    ],
    primaryCta: { label: 'Search GV Travel →', to: '/products/travel' },
    secondaryCta: { label: 'See Sapphire travel benefits', to: '/products/credit-cards' },
    related: ['credit-cards', 'investing'],
    disclosure: 'Travel benefits vary by card. See your benefits guide for full terms, conditions, and exclusions.',
  },
}
