import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Upload, BarChart3, Trophy,
  Home
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/explorer', icon: LayoutGrid, label: 'Explorer', sublabel: 'Agents Network' },
  { to: '/deploy', icon: Upload, label: 'Deploy', sublabel: 'Launch agent' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard', sublabel: 'Analytics' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', sublabel: 'Rankings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const location = useLocation()

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <motion.aside
        animate={{ width: collapsed ? 88 : 325 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="hidden lg:flex flex-col h-screen z-20 overflow-hidden shrink-0 border-r border-border"
        style={{ background: 'var(--color-panel)' }}
      >

        {/* HEADER */}
        <div className="relative flex items-center h-14 px-3 border-b border-border">
          <div
            onClick={() => setCollapsed(prev => !prev)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <img
              src="/logo/logo180.png"
              alt="Agentra"
              className="w-9 h-9 ml-1 min-w-[36px] object-contain shrink-0"
            />

            <div className="overflow-hidden">
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="whitespace-nowrap"
                  >
                    <div className="font-display font-semibold text-sm text-text-primary tracking-tight leading-none">
                      AGENTRA
                    </div>
                    <div className="text-xs text-text-dim font-mono tracking-wide mt-0.5">
                      Control Hub
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* NAV ITEMS */}
        <nav className="flex-1 p-3 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)

            return (
              <NavLink key={to} to={to}>
<motion.div
  className={clsx(
    'flex items-center rounded-xl px-3 py-4 transition-all duration-200',
    isActive ? 'nav-link-active' : 'nav-link-idle'
  )}
>
  {/* ICON (absolute stability) */}
  <div className="w-6 flex justify-center shrink-0">
    <Icon
      size={20}
      className={isActive ? 'text-primary' : 'text-text-dim'}
    />
  </div>

  {/* TEXT (always present, no layout shift) */}
  <motion.div
    animate={{
      width: collapsed ? 0 : 'auto',
      opacity: collapsed ? 0 : 1,
      marginLeft: collapsed ? 0 : 12
    }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="overflow-hidden whitespace-nowrap"
  >
    <span
      className={clsx(
        'text-sm font-semibold tracking-tight',
        isActive ? 'text-primary-dark' : 'text-text-secondary'
      )}
    >
      {label}
    </span>
  </motion.div>

  {/* ACTIVE DOT */}
  <motion.div
    animate={{ opacity: !collapsed && isActive ? 1 : 0 }}
    className="w-1.5 h-1.5 rounded-full bg-primary ml-2 shrink-0"
  />
</motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* FOOTER */}
        <div className="px-3 pb-3">
          <NavLink to="/">
            <div className="flex items-center rounded-xl px-3 py-3 transition-all border border-transparent hover:bg-bg-secondary hover:border-border">
              
              {/* ICON fixed */}
              <div className="w-5 flex justify-center shrink-0">
                <Home size={20} className="text-text-dim" />
              </div>

              {/* TEXT */}
              <div className="ml-3 overflow-hidden">
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18 }}
                      className="text-sm font-semibold text-text-secondary whitespace-nowrap"
                    >
                      Home
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </NavLink>
        </div>
      </motion.aside>

      {/* MOBILE NAVBAR */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border"
        style={{ background: 'var(--color-panel)' }}
      >
        <div className="flex items-center justify-around py-2 px-1 safe-area-inset-bottom">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors"
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-primary' : 'text-text-dim'}
                />
                <span
                  className={clsx(
                    'text-xs font-semibold tracking-tight',
                    isActive ? 'text-primary' : 'text-text-dim'
                  )}
                >
                  {label.slice(0, 7)}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}