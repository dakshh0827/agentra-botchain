import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function RouteLoaderOverlay({ duration = 420 }) {
  const location = useLocation()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [location.pathname, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-70 bg-bg/85 backdrop-blur-[2px] pointer-events-none"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full border border-border bg-panel flex items-center justify-center shadow-sm"
            >
              <Loader2 size={20} className="text-primary" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
