import React from 'react'


const PALETTES = [
  ['#B77BFF', '#6F35B2'], // brand purple
  ['#FF87B8', '#B23570'], // rose
  ['#6FB4FF', '#2F5FB2'], // blue
  ['#54D6B0', '#1F7A63'], // teal
  ['#FFB463', '#B26A1F'], // amber
  ['#9C8BFF', '#4A3BB2'], // indigo
  ['#FF8080', '#B23535'], // coral
  ['#6BD979', '#2C8235'], // green
]

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
  const hash = hashOf(name)
  const [light, dark] = PALETTES[hash % PALETTES.length]
  const uid = `a${hash.toString(36)}${size}${muted ? 'm' : 'f'}`

  const shell = muted ? 0.9 : 1
  const glow = muted ? 0.5 : 1

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      role="img"
      aria-label={`${name} avatar`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${uid}head`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.98 * shell} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.80 * shell} />
        </linearGradient>
        <radialGradient id={`${uid}lamp`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={light} stopOpacity={glow} />
          <stop offset="100%" stopColor={light} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="56" height="56" rx="15" fill={`url(#${uid}bg)`} />
      {/* A light source at the top-left keeps the tile from reading as flat colour. */}
      <ellipse cx="16" cy="10" rx="26" ry="18" fill="#FFFFFF" opacity={muted ? 0.10 : 0.16} />

      {/* The human: a soft profile sitting behind the machine, so the pairing is legible
          without cutting the face in half. */}
      <path
        d="M13.5 47c0-7.5 4.6-12.4 10.5-12.4 5.9 0 10.5 4.9 10.5 12.4H13.5z"
        fill="#FFFFFF"
        opacity={muted ? 0.22 : 0.3}
      />
      <circle cx="24" cy="25.5" r="8.2" fill="#FFFFFF" opacity={muted ? 0.22 : 0.3} />

      {/* Antenna. */}
      <path d="M32 13.5v4.2" stroke="#FFFFFF" strokeOpacity={0.9 * shell} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="11.4" r="2.6" fill="#FFFFFF" fillOpacity={0.95 * shell} />
      <circle cx="32" cy="11.4" r="5.4" fill={`url(#${uid}lamp)`} />

      {/* The machine: one clean rounded head, which is what actually reads at 38px. */}
      <rect x="18.5" y="17.5" width="27" height="24" rx="8.5" fill={`url(#${uid}head)`} />

      {/* Visor — the dark band is the highest-contrast shape on the tile, so it is what
          the eye finds first. */}
      <rect x="22.5" y="23" width="19" height="10.5" rx="5.25" fill={dark} opacity="0.92" />
      <circle cx="28.2" cy="28.25" r="2.15" fill={light} />
      <circle cx="35.8" cy="28.25" r="2.15" fill={light} />

      {/* Ear pieces, and a chin line so the head has a jaw rather than ending flat. */}
      <rect x="15.4" y="25.5" width="3.4" height="7.5" rx="1.7" fill="#FFFFFF" fillOpacity={0.85 * shell} />
      <rect x="45.2" y="25.5" width="3.4" height="7.5" rx="1.7" fill="#FFFFFF" fillOpacity={0.85 * shell} />
      <path d="M26 37.5h12" stroke={dark} strokeOpacity="0.28" strokeWidth="1.8" strokeLinecap="round" />

      {/* Shoulders, so the head is not floating in the tile. */}
      <path
        d="M15 49.5c2.2-4.6 7.2-7.2 17-7.2s14.8 2.6 17 7.2"
        stroke="#FFFFFF"
        strokeOpacity={muted ? 0.6 : 0.82}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
