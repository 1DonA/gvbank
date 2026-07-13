import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { LandingPage } from './pages/Landing'
import { BusinessPage } from './pages/Business'
import { CommercialPage } from './pages/Commercial'
import { WealthPage } from './pages/Wealth'
import { ProductPage } from './pages/products/ProductPage'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { ForgotPasswordPage } from './pages/ForgotPassword'
import { AdminLoginPage } from './pages/AdminLogin'
import { DashboardPage } from './pages/Dashboard'
import { TransferPage } from './pages/Transfer'
import { StatementsPage } from './pages/Statements'
import { ProfilePage } from './pages/Profile'
import { CardsPage } from './pages/Cards'
import { AdminDashboard } from './pages/AdminDashboard'
import { SupportWidget } from './components/support/SupportWidget'
import { Home, ArrowRightLeft, CreditCard, FileText, User, ShieldCheck, LogOut, Phone } from 'lucide-react'

const qc = new QueryClient()

function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const loc = useLocation()
  const nav = [
    { to: '/dashboard', icon: <Home size={20}/>,           label: 'Home' },
    { to: '/transfer',  icon: <ArrowRightLeft size={20}/>, label: 'Transfer' },
    { to: '/cards',     icon: <CreditCard size={20}/>,     label: 'Cards' },
    { to: '/statements',icon: <FileText size={20}/>,        label: 'History' },
    { to: '/profile',   icon: <User size={20}/>,           label: 'Profile' },
  ]
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-navy-600 font-serif font-bold text-sm">G</div>
          <span className="font-serif font-bold text-gray-900 text-sm">GV Union Bank</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">{user?.name}</span>
          <button onClick={logout} title="Sign out"
                  className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18}/></button>
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 p-4 sm:p-5 pb-24 max-w-3xl mx-auto w-full">{children}</main>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40 safe-area-inset-bottom">
        {nav.map(n => (
          <Link key={n.to} to={n.to} className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors
            ${loc.pathname === n.to ? 'text-navy-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className={loc.pathname === n.to ? 'text-navy-600' : 'text-gray-400'}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Floating live-support widget */}
      <SupportWidget/>
    </div>
  )
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuthStore()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0a1628] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-red-400"/>
          <span className="font-serif font-bold text-white text-sm">GV Union Bank — Admin</span>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 text-sm">
          <LogOut size={16}/>Sign out
        </button>
      </header>
      <main className="p-4 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}

function Guard({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace/>
  if (role && user.role !== role) return <Navigate to="/dashboard" replace/>
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3500, style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px' } }}/>
        <Routes>
          <Route path="/" element={<LandingPage/>}/>
          <Route path="/business" element={<BusinessPage/>}/>
          <Route path="/commercial" element={<CommercialPage/>}/>
          <Route path="/wealth" element={<WealthPage/>}/>
          <Route path="/products/:slug" element={<ProductPage/>}/>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/register" element={<RegisterPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/admin/login" element={<AdminLoginPage/>}/>

          {/* Customer routes */}
          <Route path="/dashboard" element={<Guard><CustomerLayout><DashboardPage/></CustomerLayout></Guard>}/>
          <Route path="/transfer"  element={<Guard><CustomerLayout><TransferPage/></CustomerLayout></Guard>}/>
          <Route path="/cards"     element={<Guard><CustomerLayout><CardsPage/></CustomerLayout></Guard>}/>
          <Route path="/statements"element={<Guard><CustomerLayout><StatementsPage/></CustomerLayout></Guard>}/>
          <Route path="/profile"   element={<Guard><CustomerLayout><ProfilePage/></CustomerLayout></Guard>}/>

          {/* Admin routes */}
          <Route path="/admin" element={<Guard role="admin"><AdminLayout><AdminDashboard/></AdminLayout></Guard>}/>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
