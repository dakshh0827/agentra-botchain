import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/explorer', label: 'EXPLORER' },
  { to: '/deploy', label: 'DEPLOY' },
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/leaderboard', label: 'LEADERBOARD' },
]

export default function LandingLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close mobile nav on route change */
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
  <div className="min-h-screen relative bg-bg text-text-primary">

    <header className={`landing-nav ${scrolled ? 'scrolled' : ''} fixed top-0 left-0 right-0 z-50`}>
      <div className="max-w-[84rem] mx-auto flex items-center justify-between px-6 h-16">
        
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/logo/logo180.png"
            alt="Agentra"
            className="w-8 h-8 rounded-lg object-contain shadow-soft"
          />

          <div>
            <div className="font-display font-bold text-sm tracking-widest text-text-primary uppercase mt-0.5">
              AGENTRA
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest text-text-secondary hover:text-primary-dark hover:bg-accent-pink transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/explorer">
            <button className="btn-primary px-5 py-2 rounded-xl text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2 cursor-pointer shadow-soft">
              LAUNCH APP
            </button>
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-text-secondary p-2 rounded-lg hover:bg-bg-secondary hover:text-primary-dark transition-colors cursor-pointer"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border overflow-hidden bg-panel shadow-panel"
          >
            <nav className="flex flex-col p-4 gap-1.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-4 py-3 rounded-lg text-xs font-mono font-bold tracking-widest text-text-secondary hover:text-primary-dark hover:bg-accent-pink transition-all uppercase"
                >
                  {link.label}
                </Link>
              ))}

              <Link to="/explorer" className="mt-3">
                <button className="btn-primary w-full px-5 py-3 rounded-xl text-xs font-bold tracking-widest uppercase inline-flex items-center justify-center gap-2 cursor-pointer shadow-soft">
                  LAUNCH APP
                </button>
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    <main className="relative z-10">
      <Outlet />
    </main>

  </div>
)
}