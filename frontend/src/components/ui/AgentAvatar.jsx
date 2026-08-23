import React from 'react'

// Nine hand-drawn robot-head glyphs. Each agent is assigned one deterministically
// (hashed from its stable id) so the icon stays the same across renders/reloads
// instead of reshuffling — the same effect as picking one at deploy time, with
// no extra field to store or migrate.
function Icon0(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <rect x="6" y="8" width="12" height="11" rx="3.5" />
      <path d="M6 12a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M18 12a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <circle cx="9.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Icon1(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <rect x="5" y="8" width="14" height="10" rx="4" />
      <path d="M5 11.5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19 11.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <rect x="7.5" y="10.5" width="9" height="5" rx="2.5" />
      <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
  )
}

function Icon2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <path d="M5 15 c0-5.5 3-7 7-7 s7 1.5 7 7 c0 2 -1 3 -3 3 H8 c-2 0 -3 -1 -3 -3 z" />
      <path d="M5 13a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19 13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <rect x="7.5" y="11" width="9" height="5.5" rx="2.5" fill="currentColor" />
      <circle cx="10" cy="13.75" r="1.2" fill="#FFFFFF" stroke="none" />
      <circle cx="14" cy="13.75" r="1.2" fill="#FFFFFF" stroke="none" />
    </svg>
  )
}

function Icon3(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <rect x="5.5" y="8" width="13" height="11" rx="3.5" />
      <path d="M5.5 12a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M18.5 12a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Icon4(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <path d="M5 15 c0-6 3-7 7-7 s7 1 7 7 c0 2 -1 3 -3 3 H8 c-2 0 -3 -1 -3 -3 z" />
      <path d="M5 13a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19 13a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <rect x="7.5" y="11" width="9" height="5" rx="2.5" />
      <circle cx="10" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
  )
}

function Icon5(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 8 c0 -1 1 -1.5 2 -1.5 s2 0.5 2 1.5" />
      <line x1="12" y1="6.5" x2="12" y2="4.5" />
      <circle cx="12" cy="3" r="1.5" />
      <path d="M4.5 15 c0-5.5 3-7 7.5-7 s7.5 1.5 7.5 7 c0 2 -1.5 3 -3.5 3 H8 c-2 0 -3.5 -1 -3.5 -3 z" />
      <path d="M4.5 13.5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19.5 13.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <rect x="7" y="11.5" width="10" height="5.5" rx="2.75" fill="currentColor" />
      <path d="M8.5 14.5 Q9.5 13 10.5 14.5" stroke="#FFFFFF" strokeWidth="1" fill="none" />
      <path d="M13.5 14.5 Q14.5 13 15.5 14.5" stroke="#FFFFFF" strokeWidth="1" fill="none" />
    </svg>
  )
}

function Icon6(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.5 8 c0 -0.8 0.7 -1.2 1.5 -1.2 s1.5 0.4 1.5 1.2" />
      <line x1="12" y1="6.8" x2="12" y2="4.5" />
      <circle cx="12" cy="3" r="1.5" />
      <path d="M5 14 c0-5 3-6 7-6 s7 1 7 6 c0 3.5 -2.5 5 -7 5 s-7 -1.5 -7 -5 z" />
      <path d="M5 13.5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19 13.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <path d="M10.5 15.5 Q12 17 13.5 15.5" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

function Icon7(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <rect x="4.5" y="8" width="15" height="10" rx="5" />
      <path d="M4.5 11.5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M19.5 11.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <rect x="7.5" y="10.5" width="9" height="5" rx="2.5" />
      <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Icon8(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="3.5" r="1.5" />
      <rect x="6" y="8" width="12" height="11" rx="3.5" />
      <path d="M6 12a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
      <path d="M18 12a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2" />
      <circle cx="9.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

const ICONS = [Icon0, Icon1, Icon2, Icon3, Icon4, Icon5, Icon6, Icon7, Icon8]

function hashOf(value) {
  let hash = 0
  const text = String(value)
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export default function AgentAvatar({ agent, size = 44, muted = false }) {
  const name = agent?.name || 'agent'
  const key = agent?.agentId || agent?.id || name
  const Icon = ICONS[hashOf(key) % ICONS.length]
  const radius = Math.round(size * 0.27)

  return (
    <div
      role="img"
      aria-label={`${name} avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--color-accent-pink)',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? 0.85 : 1,
      }}
    >
      <Icon style={{ width: '80%', height: '80%' }} />
    </div>
  )
}
