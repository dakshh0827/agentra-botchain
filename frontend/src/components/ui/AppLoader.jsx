import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function AppLoader({ compact = false }) {
  return (
    <div className={`w-full ${compact ? 'min-h-[40vh]' : 'min-h-screen'} bg-bg flex items-center justify-center px-6`}>
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full border border-border bg-panel flex items-center justify-center"
        >
          <Loader2 size={20} className="text-primary" />
        </motion.div>
        <div className="text-center">
          <p className="font-display font-semibold text-lg text-text-primary leading-none">Agentra</p>
          <p className="text-xs text-text-dim mt-1 uppercase tracking-wide">Loading</p>
        </div>
      </div>
    </div>
  )
}
