import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// ── Hand-drawn style icons ──────────────────────────────────────────────
export const IconBuild = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M31 8c4 1 7 4 8 8l-5 1 2 5-8 2-2-5-5 1c1-4 4-7 8-8Z" />
    <path d="M27 22 9 40" />
    <path d="M9 40l2-7 5 5-7 2Z" />
  </svg>
)

export const IconDeploy = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M24 4c5 6 8 15 6 25-1 5-3 8-6 11-3-3-5-6-6-11-2-10 1-19 6-25Z" />
    <circle cx="24" cy="18" r="2.8" />
    <path d="M18 30c-4 2-6 7-6 13 5-1 9-4 11-8" />
    <path d="M30 30c4 2 6 7 6 13-5-1-9-4-11-8" />
  </svg>
)

export const IconMint = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 18 24 6l15 12-8 22H17Z" />
    <path d="M9 18h30" />
    <path d="M17 18 24 6l7 12" />
    <path d="M17 18l7 22" />
    <path d="M31 18l-7 22" />
  </svg>
)

export const IconRoute = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M24 5v38" />
    <path d="M24 11h15l-5 6 5 6H24" />
    <path d="M24 22H9l5-6-5-6h15" />
  </svg>
)

export const IconExecute = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M27 4 11 27h10l-4 17 20-25H27l4-15Z" />
  </svg>
)

export const IconSettle = (props) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="11" y="20" width="26" height="20" rx="4" />
    <path d="M16 20v-6a8 8 0 0 1 16 0v6" />
    <circle cx="24" cy="29" r="2.6" />
    <path d="M24 32v4" />
  </svg>
)

// ── Data — 6 steps of the real product loop, each with supporting detail ──
const WORKFLOW_STEPS = [
  {
    id: 'build', title: 'Build', Icon: IconBuild,
    desc: 'Configure prompts, models & tools in Deploy Studio.',
    points: ['Pick a base model or bring your own', 'Wire up MCP tool access', 'Test runs before going live'],
  },
  {
    id: 'deploy', title: 'Deploy', Icon: IconDeploy,
    desc: 'Push the agent live in a single click.',
    points: ['Metadata uploaded to 0G Storage', 'Agent gets a live MCP endpoint', 'Set your own fee structure'],
  },
  {
    id: 'mint', title: 'Mint iNFT', Icon: IconMint,
    desc: 'ERC-7857 mints immutable on-chain ownership.',
    points: ['Provenance recorded on Chain', 'Ownership is transferable & verifiable', 'No black-box logic — fully auditable'],
  },
  {
    id: 'route', title: 'Route', Icon: IconRoute,
    desc: 'MCP endpoints handle secure agent access.',
    points: ['Requests authenticated per endpoint', 'Swarms & agents can call each other', 'Rate limits enforced on-chain'],
  },
  {
    id: 'execute', title: 'Execute', Icon: IconExecute,
    desc: 'Users & swarms invoke inferences in real time.',
    points: ['Streaming responses over MCP', 'A2A calls composable in workflows', 'Usage logged for settlement'],
  },
  {
    id: 'settle', title: 'Settle', Icon: IconSettle,
    desc: 'Web3 network meters usage and clears funds.',
    points: ['Pay-per-call billing, no subscriptions', 'Creators paid automatically', 'Full usage history on Dashboard'],
  },
]

const LAST = WORKFLOW_STEPS.length - 1
const NAV_HEIGHT = 64 // LandingLayout header height — pin offset so the heading never slides under it
const SPINE_TOP = 56 // px from the pinned viewport's top edge to the stationary spine line

// Piecewise-linear falloff: full opacity at the center, 0.6 at one card away,
// then fading to 0 by `maxDist` cards away. When maxDist <= 1 (mobile — only
// the center card is meant to show at all) it collapses to a single straight
// line from (0, 1) to (maxDist, 0), skipping the 0.6 midpoint entirely.
function opacityForDistance(absDistance, maxDist) {
  if (absDistance >= maxDist) return 0
  const points = maxDist <= 1 ? [[0, 1], [maxDist, 0]] : [[0, 1], [1, 0.6], [maxDist, 0]]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (absDistance >= x0 && absDistance <= x1) {
      const t = (absDistance - x0) / (x1 - x0)
      return y0 + (y1 - y0) * t
    }
  }
  return 0
}

// How many neighbor cards stay visible, and whether the blur/tilt flourishes
// are worth their cost, at the current viewport width. Read once per layout
// pass (setup + debounced resize) — never per scroll frame.
function getResponsiveConfig() {
  const w = window.innerWidth
  if (w < 640) return { maxDist: 0.5, blurEnabled: false, tiltEnabled: false }
  if (w < 1024) return { maxDist: 1.15, blurEnabled: false, tiltEnabled: false }
  return { maxDist: 1.5, blurEnabled: true, tiltEnabled: true }
}

export default function WorkflowScrollSection() {
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [activeIndex, setActiveIndex] = useState(0)

  const sectionRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const progressFillRef = useRef(null)
  const stepRefs = useRef([]) // outer wrapper per card — scroll-driven scale/opacity/blur lives here
  const cardRefs = useRef([]) // inner card box — pointer tilt + idle drift live here, independent of the scroll transform
  const dotRefs = useRef([]) // connector dots — highlighted when their card is centered

  // ── Scroll-mechanics state that must survive across scroll frames without
  // triggering React re-renders. Re-measuring the DOM or re-rendering React
  // on every scroll tick is exactly the kind of cost that caused the jank in
  // the previous build, so everything hot-path lives in refs and is written
  // straight to the DOM via gsap.set.
  const measureRef = useRef(null) // { cardWidth, gap, slot, viewportWidth, centerOffset, travel }
  const configRef = useRef(getResponsiveConfig())
  const activeIndexRef = useRef(0)

  useLayoutEffect(() => {
    if (reducedMotion) return

    const section = sectionRef.current
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!section || !viewport || !track) return

    // Measures the ACTUAL rendered card width and gap (never a hardcoded
    // constant) so the horizontal travel distance always matches what's
    // really on screen, at any viewport size or font-load-induced reflow.
    //
    // Deliberately uses offsetWidth/offsetLeft, not getBoundingClientRect.
    // This site applies a global CSS zoom, and getBoundingClientRect reports
    // sizes already scaled by that zoom, while gsap.set(track, {x}) writes a
    // `transform: translateX()` value in the *pre-zoom* coordinate space (the
    // browser applies zoom on top of it when painting). Mixing the two
    // produces a track position that's off by the zoom factor. offsetWidth/
    // offsetLeft stay in that same pre-zoom space as the transform, so they're
    // the only measurements safe to feed into this math.
    //
    // offsetLeft is also why this doesn't need to account for the viewport's
    // own horizontal padding separately: the track is absolutely positioned,
    // so `left: 0` already lands at the viewport's padding-box edge (CSS
    // ignores a positioned ancestor's padding for that purpose) — meaning
    // the viewport's full width (not width-minus-padding) is the correct
    // "space available to center within".
    //
    // That width is read from document.body.clientWidth, not
    // window.innerWidth or viewport.offsetWidth — both were tried and both
    // are wrong, in opposite directions:
    //   - window.innerWidth is a *visual* (post-zoom) pixel count. cardWidth,
    //     via offsetWidth, is a *local* (pre-zoom) one. This page's global
    //     zoom means those two spaces differ by the zoom ratio, so comparing
    //     them directly shifted every card off-center by that same ratio.
    //   - viewport.offsetWidth is local, matching cardWidth, but `viewport`
    //     is a descendant of the very `<section>` this effect pins — the
    //     instant GSAP flips that section to `position: fixed`, offsetWidth
    //     on its descendants jumps into the *visual* space instead, which
    //     would silently corrupt this if a resize-triggered refresh ever ran
    //     while already mid-scroll (pinned).
    // document.body is local (matches cardWidth) and is never itself pinned,
    // so it stays in one consistent space no matter what the section is
    // doing — confirmed empirically against a getBoundingClientRect-based
    // zoom-ratio cross-check on `track` (a card-count-weighted average of
    // this same body-vs-window ratio) at both mobile and desktop widths.
    const measure = () => {
      const cardEls = Array.from(track.children)
      if (cardEls.length < 2) return null
      const cardWidth = cardEls[0].offsetWidth
      const gap = cardEls[1].offsetLeft - (cardEls[0].offsetLeft + cardEls[0].offsetWidth)
      const slot = cardWidth + gap
      const viewportWidth = document.body.clientWidth
      const centerOffset = (viewportWidth - cardWidth) / 2
      const travel = slot * LAST // total px the track must slide so the last card reaches center
      return { cardWidth, gap, slot, viewportWidth, centerOffset, travel }
    }

    // Pure function of scroll progress (0..1) — nothing here depends on which
    // direction we arrived from or what happened last frame. That statelessness
    // is what makes reverse-scroll automatically correct: scrolling up simply
    // feeds decreasing `p` values through the exact same math, so every card's
    // scale/opacity/blur and the track position land on precisely the values
    // they held on the way down, with no separate "reverse" code path to desync.
    const render = (p) => {
      const m = measureRef.current
      if (!m) return
      const cfg = configRef.current

      // Track position: transform only (never left/right), so this is a
      // compositor-only write with no layout/paint cost.
      const trackX = m.centerOffset - p * m.travel
      gsap.set(track, { x: trackX })

      const activeFloat = p * LAST

      stepRefs.current.forEach((stepEl, i) => {
        if (!stepEl) return
        const distance = i - activeFloat
        const absD = Math.abs(distance)
        const scale = 1 - 0.15 * Math.min(absD, 1) // 1 at center → 0.85 one card away
        const opacity = opacityForDistance(absD, cfg.maxDist)
        gsap.set(stepEl, { scale, opacity })
        // Blur is a *discrete* on/off class, not a continuously interpolated
        // filter value — animating `filter` every frame is expensive (it
        // can't be GPU-composited), so it only ever holds one of two fixed
        // states, toggled via classList rather than recomputed each tick.
        stepEl.classList.toggle('is-blurred', cfg.blurEnabled && absD > 0.55)
      })

      if (progressFillRef.current) {
        gsap.set(progressFillRef.current, { scaleX: p })
      }

      // Everything below only touches the DOM when the nearest card actually
      // changes (a handful of times across the whole scroll), not every frame.
      const nearest = Math.round(Math.min(Math.max(activeFloat, 0), LAST))
      if (nearest !== activeIndexRef.current) {
        const prev = activeIndexRef.current
        activeIndexRef.current = nearest
        cardRefs.current[prev]?.classList.remove('is-center')
        cardRefs.current[nearest]?.classList.add('is-center')
        dotRefs.current[prev]?.classList.remove('is-active')
        dotRefs.current[nearest]?.classList.add('is-active')
        setActiveIndex(nearest)
      }
    }

    const trigger = ScrollTrigger.create({
      trigger: section,
      // Offset by the fixed navbar height so the heading is never pinned
      // underneath it the instant the section engages.
      start: `top top+=${NAV_HEIGHT}`,
      // A function (not a fixed string) so it's re-evaluated on every
      // refresh — measuring live rather than baking in a number computed
      // once at an arbitrary viewport size.
      end: () => {
        measureRef.current = measure()
        return `+=${measureRef.current ? measureRef.current.travel : 0}`
      },
      pin: true,
      // Explicit and intentional: default pinSpacing reserves a spacer the
      // height of the pinned section, which is exactly what keeps the
      // content above and below from ever overlapping or getting masked,
      // in either scroll direction.
      pinSpacing: true,
      // Lenis already smooths the raw input; scrub just adds a small settle
      // on top rather than stacking a second independent smoothing layer
      // (which is what produces the "double lag" feeling).
      scrub: 1,
      // Don't trust cached start/end across layout shifts (font swap,
      // image load, resize) — always recompute from the live DOM.
      invalidateOnRefresh: true,
      onRefresh: (self) => render(self.progress),
      onUpdate: (self) => render(self.progress),
    })

    // Paint the resting position immediately, before the user has scrolled
    // at all, using the same `render` path the scroll updates use. Without
    // this the very first frame after the pin engages could show a default
    // (untransformed) layout for one tick — the "flash" the section must
    // never have.
    measureRef.current = measure()
    render(trigger.progress)

    // Debounced: a resize mid-drag would otherwise refresh (and re-measure)
    // dozens of times a second for no benefit.
    let resizeTimer
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        configRef.current = getResponsiveConfig()
        ScrollTrigger.refresh() // re-runs `end` above, which re-measures the DOM
      }, 150)
    }
    window.addEventListener('resize', onResize)

    // Fonts/images can finish loading after our first measurement and shift
    // real widths — catch that once, rather than assuming layout is final
    // the moment this effect runs.
    const refreshOnSettle = () => ScrollTrigger.refresh()
    window.addEventListener('load', refreshOnSettle)
    document.fonts?.ready?.then(refreshOnSettle)

    return () => {
      trigger.kill()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', refreshOnSettle)
      clearTimeout(resizeTimer)
    }
  }, [reducedMotion])

  // Idle drift + pointer tilt live entirely on the inner `.card` element,
  // never on the outer wrapper the scroll effect above animates — two
  // separate elements, two separate transforms, so neither can ever
  // clobber or desync the other.
  useEffect(() => {
    if (reducedMotion) return
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const cards = cardRefs.current.filter(Boolean)
    cards.forEach((el) => gsap.set(el, { transformPerspective: 700 }))

    const idleTweens = cards.map((el, i) =>
      gsap.to(el, {
        rotation: () => gsap.utils.random(-1.4, 1.4),
        duration: () => gsap.utils.random(3.5, 5.5),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.15,
      })
    )

    if (!canHover || !configRef.current.tiltEnabled) {
      return () => idleTweens.forEach((t) => t.kill())
    }

    const cleanups = cards.map((el) => {
      const setX = gsap.quickTo(el, 'rotationX', { duration: 0.4, ease: 'power3' })
      const setY = gsap.quickTo(el, 'rotationY', { duration: 0.4, ease: 'power3' })
      const onMove = (e) => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        setY(px * 9)
        setX(-py * 9)
      }
      const onLeave = () => { setX(0); setY(0) }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      return () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
      }
    })

    return () => {
      idleTweens.forEach((t) => t.kill())
      cleanups.forEach((fn) => fn())
    }
  }, [reducedMotion])

  if (reducedMotion) {
    return <WorkflowStatic />
  }

  const activeStep = WORKFLOW_STEPS[activeIndex]

  return (
    <section ref={sectionRef} className="relative w-full">
      <div className="max-w-3xl mx-auto text-center px-6 pb-8 md:pb-10">
        <h2 className="text-3xl font-display font-semibold tracking-tight mb-3">Protocol Lifecycle</h2>
        <p className="text-text-secondary text-lg">How agents, creators, and users exchange value inside the Agentra network.</p>
      </div>

      {/* Screen-reader-only progress announcement — the visual scale/opacity
          transitions carry no semantic meaning on their own. */}
      <p className="sr-only" aria-live="polite">
        {`Step ${activeIndex + 1} of ${WORKFLOW_STEPS.length}: ${activeStep.title}`}
      </p>

      <div ref={viewportRef} className="relative w-full overflow-hidden px-[6vw]" style={{ height: 'clamp(520px, 62vh, 620px)' }}>
        {/* Stationary spine — a sibling of the track, so it's never touched
            by the track's transform and can't drift out of place. */}
        <div className="absolute left-[6vw] right-[6vw] pointer-events-none" style={{ top: SPINE_TOP }} aria-hidden="true">
          <div className="relative h-px bg-border">
            <div
              ref={progressFillRef}
              className="absolute inset-y-0 left-0 w-full bg-primary"
              style={{ transform: 'scaleX(0)', transformOrigin: '0% 50%' }}
            />
          </div>
        </div>

        {/* The only element the scroll effect ever moves. */}
        <div ref={trackRef} className="absolute top-0 left-0 flex will-change-transform" style={{ gap: 'clamp(32px,4vw,56px)' }}>
          {WORKFLOW_STEPS.map((step, i) => (
            <div
              key={step.id}
              ref={(el) => (stepRefs.current[i] = el)}
              className="workflow-step shrink-0 flex flex-col items-center"
              style={{ width: 'min(84vw, 460px)' }}
            >
              {/* Connector: rides along with the card, so it visually "hangs"
                  off the stationary spine above as the track slides. */}
              <div className="relative w-px bg-border-bright/70" style={{ height: SPINE_TOP }}>
                <div
                  ref={(el) => (dotRefs.current[i] = el)}
                  className="workflow-dot absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-bg"
                />
              </div>

              <div
                ref={(el) => (cardRefs.current[i] = el)}
                className="workflow-card rounded-3xl bg-panel p-8 md:p-9 w-full flex flex-col items-start mt-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <step.Icon className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-text-dim mb-1">Step {i + 1}</span>
                <h4 className="text-2xl font-display font-bold text-text-primary mb-2">{step.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">{step.desc}</p>
                <ul className="space-y-2 w-full">
                  {step.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-text-secondary leading-snug">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Static fallback for `prefers-reduced-motion: reduce` — no ScrollTrigger, no
// pin, no pointer listeners. Every card is simply laid out and visible.
function WorkflowStatic() {
  return (
    <section className="relative w-full">
      <div className="max-w-3xl mx-auto text-center px-6 pb-10">
        <h2 className="text-3xl font-display font-semibold tracking-tight mb-3">Protocol Lifecycle</h2>
        <p className="text-text-secondary text-lg">How agents, creators, and users exchange value inside the Agentra network.</p>
      </div>
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {WORKFLOW_STEPS.map((step, i) => (
          <div key={step.id} className="workflow-card rounded-3xl bg-panel p-7 flex flex-col items-start">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
              <step.Icon className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-text-dim mb-1">Step {i + 1}</span>
            <h4 className="text-xl font-display font-bold text-text-primary mb-2">{step.title}</h4>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">{step.desc}</p>
            <ul className="space-y-1.5 w-full">
              {step.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-text-secondary leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}