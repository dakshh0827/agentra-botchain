import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function NeonButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'bg-transparent border border-[rgba(248,113,113,0.3)] text-[#F87171] font-semibold hover:bg-[rgba(248,113,113,0.1)] hover:border-[rgba(248,113,113,0.5)] transition-all duration-200',
    success: 'bg-transparent border border-[rgba(52,211,153,0.3)] text-[#34D399] font-semibold hover:bg-[rgba(52,211,153,0.1)] hover:border-[rgba(52,211,153,0.5)] transition-all duration-200',
    solid: 'btn-primary',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-sm',
  }

  return (
    <motion.button
      type={type}
      whileTap={{ opacity: disabled ? 1 : 0.85 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 rounded-xl font-semibold tracking-tight',
        'transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant] || variants.primary,
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 13 : 15} />
      ) : null}
      {children}
    </motion.button>
  )
}