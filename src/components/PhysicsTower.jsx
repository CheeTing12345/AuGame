import { useRef, useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react'

const BLOCK_H            = 28
const GRAVITY            = 0.55
const MAX_VELOCITY       = 16
const COLLAPSE_THRESHOLD = 0.28   // overlap fraction below which the tower collapses

const PhysicsTower = forwardRef(({ onTowerFall }, ref) => {
  const innerRef      = useRef(null)   // the bordered container box
  const blocksRef     = useRef([])
  const animRef       = useRef(null)
  const hasFallenRef  = useRef(false)

  const [blocks,       setBlocks]       = useState([])
  const [fallingBlock, setFallingBlock] = useState(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Read container dimensions live (avoids stale closure issues)
  const getDims = () => {
    const el = innerRef.current
    if (!el) return null
    const { width: w, height: h } = el.getBoundingClientRect()
    return { w, h }
  }

  useImperativeHandle(ref, () => ({
    dropBlock: (offsetX, alignmentScore) => {
      const dims = getDims()
      if (!dims) return
      const { w, h } = dims

      hasFallenRef.current = false

      const blockW   = Math.round(w * 0.70)
      const groundY  = h - 12                          // bottom of the box
      const centerX  = w / 2
      const hue      = alignmentScore * 120

      // X position: center ± deviation, clamped inside box
      const rawX     = centerX + offsetX * w * 0.36
      const clampedX = Math.max(blockW / 2 + 6, Math.min(w - blockW / 2 - 6, rawX))

      // Target Y: stacks upward from the ground
      const stackCount = blocksRef.current.length
      const targetY    = groundY - (stackCount + 1) * BLOCK_H

      // Static tilt: proportional to x offset, capped at ±10°
      const tiltDeg  = ((clampedX - centerX) / (w / 2)) * 9

      const block = {
        id:       Date.now(),
        x:        clampedX,
        targetY,
        width:    blockW,
        height:   BLOCK_H,
        rotation: tiltDeg,
        color:    `hsl(${hue}, 72%, 52%)`,
      }

      // ── Animate fall ────────────────────────────────────────────
      if (animRef.current) cancelAnimationFrame(animRef.current)

      let y   = -BLOCK_H
      let vel = 2

      const step = () => {
        vel = Math.min(vel + GRAVITY, MAX_VELOCITY)
        y  += vel

        if (y >= block.targetY) {
          y = block.targetY
          const settled = { ...block, y }
          blocksRef.current = [...blocksRef.current, settled]
          setBlocks([...blocksRef.current])
          setFallingBlock(null)

          // Scroll camera up if tower is getting tall
          const topY = groundY - blocksRef.current.length * BLOCK_H
          const pad  = h * 0.20
          if (topY < pad) {
            setScrollOffset(prev =>
              Math.max(prev, pad - topY)
            )
          }

          // Collapse check: if overlap between this block and previous < threshold
          if (!hasFallenRef.current && blocksRef.current.length > 1) {
            const prev    = blocksRef.current[blocksRef.current.length - 2]
            const overlap = blockW - Math.abs(settled.x - prev.x)
            if (overlap < blockW * COLLAPSE_THRESHOLD) {
              hasFallenRef.current = true
              onTowerFall()
            }
          }
          return
        }

        setFallingBlock({ ...block, y })
        animRef.current = requestAnimationFrame(step)
      }

      setFallingBlock({ ...block, y })
      animRef.current = requestAnimationFrame(step)
    },

    resetBlocks: () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      blocksRef.current    = []
      hasFallenRef.current = false
      setBlocks([])
      setFallingBlock(null)
      setScrollOffset(0)
    },
  }))

  // Cleanup on unmount
  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  const allBlocks = fallingBlock ? [...blocks, fallingBlock] : blocks

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* ── Bordered container (the tower box) ── */}
      <div
        ref={innerRef}
        style={{
          position:     'absolute',
          left:         18,
          right:        18,
          top:          68,
          bottom:       76,
          border:       '1px solid var(--border)',
          borderRadius: 20,
          overflow:     'hidden',
          background:   '#09090b',
        }}
      >
        {/* Camera-scrolled layer */}
        <div style={{
          position:   'absolute',
          inset:      0,
          transform:  `translateY(${-scrollOffset}px)`,
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>

          {/* Empty hint */}
          {allBlocks.length === 0 && (
            <div style={{
              position:  'absolute',
              bottom:    18,
              left: 0, right: 0,
              textAlign: 'center',
            }}>
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                Tower will be built here
              </span>
            </div>
          )}

          {/* Blocks */}
          {allBlocks.map(block => (
            <div
              key={block.id}
              style={{
                position:        'absolute',
                left:            block.x - block.width / 2,
                top:             block.y,
                width:           block.width,
                height:          block.height,
                transform:       `rotate(${block.rotation}deg)`,
                transformOrigin: 'center center',
                willChange:      'top',
              }}
            >
              {/* Glow */}
              <div style={{
                position:     'absolute',
                inset:        0,
                borderRadius: 6,
                background:   block.color,
                filter:       'blur(5px)',
                opacity:      0.30,
                transform:    'translateY(3px)',
              }} />
              {/* Body */}
              <div style={{
                position:     'absolute',
                inset:        0,
                borderRadius: 6,
                background:   `linear-gradient(155deg, ${block.color}f0 0%, ${block.color}99 100%)`,
                border:       '1px solid rgba(255,255,255,0.11)',
                overflow:     'hidden',
              }}>
                {/* Top highlight */}
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

      {/* ── Block counter ── */}
      {blocks.length > 0 && (
        <div style={{
          position:       'absolute',
          top:            16,
          left:           16,
          background:     'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          borderRadius:   12,
          padding:        '8px 14px',
          border:         '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Stacked
          </p>
          <p style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
            {blocks.length}
          </p>
        </div>
      )}
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
