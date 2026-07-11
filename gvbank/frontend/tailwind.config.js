/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 50:'#eef2f9', 100:'#d5dff0', 200:'#aabfe1', 300:'#6e93ca', 400:'#3b6db3', 500:'#1e4f99', 600:'#0a1628', 700:'#091222', 800:'#070e1a', 900:'#050b13' },
        gold:  { 50:'#fdf9ee', 400:'#e8c97a', 500:'#c9a84c', 600:'#a8863a' },
      },
      fontFamily: {
        sans:   ['DM Sans', 'sans-serif'],
        serif:  ['Playfair Display', 'serif'],
        mono:   ['DM Mono', 'monospace'],
      },
      boxShadow: {
        'bank': '0 4px 24px rgba(10,22,40,0.10), 0 1px 4px rgba(10,22,40,0.06)',
        'bank-lg': '0 20px 60px rgba(10,22,40,0.15)',
      }
    },
  },
  plugins: [],
}
