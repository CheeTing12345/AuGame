import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { motion } from 'motion/react'

// ── Constants ─────────────────────────────────────────────────────────────────
const WIDTH_RATIO       = 0.33
const GROUND_PAD        = 24     // px clearance between ground surface and canvas bottom
const CAM_TOP_RATIO     = 0.22   // keep top block below this fraction of container height
const SINGLE_THRESHOLD  = 0.33   // |offsetX| > this → block slides off the one below
const CUMUL_THRESHOLD   = 0.55   // |Σ offsetX| > this → tower leans too far

// ── Component ─────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall, isHost = false }, ref) => {
  const containerRef = useRef(null)
  const onFallRef    = useRef(onTowerFall)
  const collapseRef  = useRef(null)   // holds the setTimeout id so cleanup can cancel it

  const [dims,              setDims]              = useState({ w: 0, h: 0 })
  const [blocks,            setBlocks]            = useState([])  // [{ id, offsetX, color }]
  const [collapseTriggered, setCollapseTriggered] = useState(false)
  const [cameraShift,       setCameraShift]       = useState(0)
  const [blinkId,           setBlinkId]           = useState(null)
  const [blinking,          setBlinking]          = useState(false)

  useEffect(() => { onFallRef.current = onTowerFall }, [onTowerFall])

  // ── Measure container ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width && height) setDims({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Camera: shift up when top block is too close to the top ───────────────
  useEffect(() => {
    if (!dims.h || blocks.length === 0) { setCameraShift(0); return }
    const blockH = Math.max(32, Math.floor(dims.h * 0.058))
    const topY   = dims.h - GROUND_PAD - blockH * blocks.length
    const shift  = Math.max(0, dims.h * CAM_TOP_RATIO - topY)
    setCameraShift(shift)
  }, [blocks.length, dims])

  // ── Exposed API ───────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    dropBlock: (offsetX, alignmentScore) => {
      setBlocks(prev => {
        const hue   = alignmentScore * 120
        const color = `hsl(${hue}, 72%, 55%)`
        const block = { id: Date.now(), offsetX, color }

        // Collapse check
        const all        = [...prev, block]
        const cumulative = all.reduce((s, b) => s + b.offsetX, 0)
        const collapsed  = Math.abs(offsetX) > SINGLE_THRESHOLD ||
                           Math.abs(cumulative) > CUMUL_THRESHOLD

        if (collapsed) {
          setCollapseTriggered(true)
          if (isHost) {
            clearTimeout(collapseRef.current)
            collapseRef.current = setTimeout(() => onFallRef.current(), 600)
          }
        }

        return all
      })

      // Blink counter for 500ms
      setBlinking(true)
      setBlinkId(prev => { clearTimeout(prev); return setTimeout(() => setBlinking(false), 500) })
    },

    resetBlocks: () => {
      clearTimeout(collapseRef.current)
      setBlocks([])
      setCollapseTriggered(false)
      setCameraShift(0)
      setBlinking(false)
    },

    panToBase: () => setCameraShift(0),

  }))

  // ── Derived layout values ─────────────────────────────────────────────────
  const { w, h } = dims
  const blockH  = w && h ? Math.max(32, Math.floor(h * 0.058)) : 36
  const blockW  = w ? Math.round(w * WIDTH_RATIO) : 80

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>
      <div
        ref={containerRef}
        style={{
          position:     'absolute',
          left: 18, right: 18,
          top: 68, bottom: 76,
          border:       '1.5px dashed rgba(255,255,255,0.14)',
          borderRadius: 20,
          overflow:     'hidden',
          background:   '#09090b',
        }}
      >
        {/* Empty placeholder */}
        {blocks.length === 0 && (
          <p style={{
            position: 'absolute', bottom: 14, left: 0, right: 0,
            textAlign: 'center', fontSize: 12,
            color: 'rgba(255,255,255,0.18)', margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            Tower will be built here
          </p>
        )}

        {/* Stacked counter */}
        {blocks.length > 0 && (
          <>
            <p style={{
              position: 'absolute', top: 14, left: 14, margin: 0, zIndex: 2,
              fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
              color: blinking ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>
              STACKED
            </p>
            <p style={{
              position: 'absolute', top: 10, right: 14, margin: 0, zIndex: 2,
              fontSize: blinking ? 26 : 22, fontWeight: 800,
              color: blinking ? '#ffffff' : 'rgba(255,255,255,0.75)',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>
              {blocks.length}
            </p>
          </>
        )}

        {/* Camera wrapper — shifts up as tower grows */}
        <motion.div
          animate={{ y: cameraShift }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {w > 0 && blocks.map((block, i) => {
            const rawX    = w / 2 + block.offsetX * w * 0.5
            const cx      = Math.max(blockW / 2 + 4, Math.min(w - blockW / 2 - 4, rawX))
            const topEdge = h - GROUND_PAD - blockH * (i + 1)
            const tilt    = block.offsetX * 10   // degrees, max ±3.5°

            return (
              <motion.div
                key={block.id}
                style={{
                  position:     'absolute',
                  left:         cx - blockW / 2,
                  top:          topEdge,
                  width:        blockW,
                  height:       blockH,
                  borderRadius: 8,
                  rotate:       tilt,
                  background:   `linear-gradient(135deg, ${block.color}dd, ${block.color}66)`,
                  boxShadow:    `0 0 8px ${block.color}88, inset 0 1px 0 rgba(255,255,255,0.18)`,
                  border:       `1px solid ${block.color}`,
                }}
                initial={{ y: -(h + blockH * 3) }}
                animate={
                  collapseTriggered
                    ? {
                        y:       h + 120,
                        x:       (i % 2 === 0 ? 1 : -1) * (50 + i * 12),
                        rotate:  (i % 2 === 0 ? 40 : -40),
                        opacity: 0,
                      }
                    : { y: 0 }
                }
                transition={
                  collapseTriggered
                    ? { type: 'spring', stiffness: 220, damping: 18, delay: i * 0.04 }
                    : { type: 'spring', stiffness: 180, damping: 24, mass: 1.1 }
                }
              />
            )
          })}
        </motion.div>
      </div>
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
