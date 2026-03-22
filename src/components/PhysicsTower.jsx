import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const BLOCK_H        = 32
const GRAVITY        = 0.52
const MAX_VEL        = 18
const WIDTH_RATIO    = 0.66
// Collapse if the new block's x-center is more than this fraction of blockW
// away from the block below it (i.e. barely hanging on)
const COLLAPSE_OVERHANG = 0.52   // > 52% overhang → collapse

// ── Component ─────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall }, ref) => {
  const innerRef     = useRef(null)
  const blocksRef    = useRef([])
  const animRef      = useRef(null)
  const hasFallenRef = useRef(false)
  const dimsRef      = useRef({ w: 0, h: 0, groundY: 0, blockW: 0 })

  const [blocks,        setBlocks]        = useState([])
  const [fallingBlock,  setFallingBlock]  = useState(null)
  const [cameraOffset,  setCameraOffset]  = useState(0)

  // Measure the bordered container after mount
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    dimsRef.current = {
      w,
      h,
      groundY: h - 12,
      blockW:  Math.round(w * WIDTH_RATIO),
    }
  }, [])

  useImperativeHandle(ref, () => ({

    dropBlock: (offsetX, alignmentScore) => {
      const { w, h, groundY, blockW } = dimsRef.current
      if (!w) return

      hasFallenRef.current = false
      if (animRef.current) cancelAnimationFrame(animRef.current)

      const hue      = alignmentScore * 120
      const centerX  = w / 2
      // offsetX is -0.35…0.35 — scale to roughly ±30% of container width
      const rawX     = centerX + offsetX * w * 0.50
      const clampedX = Math.max(blockW / 2 + 4, Math.min(w - blockW / 2 - 4, rawX))

      const stackCount = blocksRef.current.length
      const targetY    = groundY - (stackCount + 1) * BLOCK_H

      const color = `hsl(${hue}, 72%, 52%)`

      // ── Animate fall (straight down, no rotation) ───────────────────────
      let y   = -BLOCK_H
      let vel = 2

      const step = () => {
        vel = Math.min(vel + GRAVITY, MAX_VEL)
        y  += vel

        if (y >= targetY) {
          // Block has landed — settle it
          y = targetY
          const settled = { id: Date.now(), x: clampedX, y, width: blockW, height: BLOCK_H, color }
          blocksRef.current = [...blocksRef.current, settled]
          setBlocks([...blocksRef.current])
          setFallingBlock(null)

          // Scroll camera up if tower is getting tall
          const topY = groundY - blocksRef.current.length * BLOCK_H
          const pad  = h * 0.22
          if (topY < pad) setCameraOffset(Math.max(0, pad - topY))

          // Collapse check: is the new block overhanging the one below?
          if (!hasFallenRef.current && blocksRef.current.length > 1) {
            const prev    = blocksRef.current[blocksRef.current.length - 2]
            const overhang = Math.abs(settled.x - prev.x)
            if (overhang > blockW * COLLAPSE_OVERHANG) {
              hasFallenRef.current = true
              onTowerFall()
            }
          }
          return
        }

        setFallingBlock({ id: 'falling', x: clampedX, y, width: blockW, height: BLOCK_H, color })
        animRef.current = requestAnimationFrame(step)
      }

      setFallingBlock({ id: 'falling', x: clampedX, y, width: blockW, height: BLOCK_H, color })
      animRef.current = requestAnimationFrame(step)
    },

    resetBlocks: () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      blocksRef.current    = []
      hasFallenRef.current = false
      setBlocks([])
      setFallingBlock(null)
      setCameraOffset(0)
    },

  }))

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  const allBlocks = fallingBlock ? [...blocks, fallingBlock] : blocks

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* Bordered tower container */}
      <div
        ref={innerRef}
        style={{
          position:     'absolute',
          left: 18, right: 18,
          top: 68, bottom: 76,
          border:       '1px solid var(--border)',
          borderRadius: 20,
          overflow:     'hidden',
          background:   '#09090b',
        }}
      >
        {/* Camera layer */}
        <div style={{
          position:   'absolute',
          inset:      0,
          transform:  `translateY(${-cameraOffset}px)`,
          transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>

          {allBlocks.length === 0 && (
            <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Tower will be built here</span>
            </div>
          )}

          {allBlocks.map(block => (
            <div
              key={block.id}
              style={{
                position:    'absolute',
                left:        block.x - block.width / 2,
                top:         block.y,
                width:       block.width,
                height:      block.height,
                willChange:  'top',
              }}
            >
              {/* Glow */}
              <div style={{
                position:     'absolute', inset: 0,
                borderRadius: 6,
                background:   block.color,
                filter:       'blur(5px)',
                opacity:      0.28,
                transform:    'translateY(3px)',
              }} />
              {/* Body */}
              <div style={{
                position:     'absolute', inset: 0,
                borderRadius: 6,
                background:   `linear-gradient(155deg, ${block.color}f0 0%, ${block.color}99 100%)`,
                border:       '1px solid rgba(255,255,255,0.11)',
                overflow:     'hidden',
              }}>
                {/* Highlight */}
                <div style={{
                  position:     'absolute',
                  top: 0, left: 0, right: 0,
                  height:       '44%',
                  borderRadius: '6px 6px 0 0',
                  background:   'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Block counter */}
      {blocks.length > 0 && (
        <div style={{
          position:       'absolute', top: 16, left: 16,
          background:     'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          borderRadius:   12,
          padding:        '8px 14px',
          border:         '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stacked</p>
          <p style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{blocks.length}</p>
        </div>
      )}
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
