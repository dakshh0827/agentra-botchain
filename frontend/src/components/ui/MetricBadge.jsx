import React from 'react'
import clsx from 'clsx'

const colorMap = {
  purple: 'text-primary-dark',
  blue: 'text-[#4C7BB5]',
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-danger',
}

export default function MetricBadge({ label, value, color = 'purple', icon: Icon, sublabel }) {
  const textColor = colorMap[color] || colorMap.purple
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-text-dim">
        {Icon && <Icon size={13} className={textColor} />}
        <span className="text-xs font-mono tracking-widest uppercase">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold tracking-tighter text-text-primary">{value}</div>
      {sublabel && <div className={clsx('text-xs font-mono mt-1', textColor)}>{sublabel}</div>}
    </div>
  )
}