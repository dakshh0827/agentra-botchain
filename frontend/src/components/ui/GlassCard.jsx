import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function GlassCard({
  children,
  className = '',
  hover = true,
  onClick,
  ...props
}) {
  return (
    <motion.div
      onClick={onClick}
      className={clsx(
        'glass-panel rounded-xl transition-colors duration-150',
        hover && 'hover:border-primary-light',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}


