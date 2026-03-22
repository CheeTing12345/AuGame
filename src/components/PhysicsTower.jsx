import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'

const GRAVITY      = 0.44
const FRICTION_X   = 0.86
const FRICTION_AV  = 0.84
const RESTITUTION  = 0.08
const BLOCK_H      = 32          // 4px thicker than before
const FALL_ROT     = 62          // degrees — collapsed if exceeded
const FALL_Y_EXTRA = 80          // px below ground
const WIDTH_RATIO  = 0.66        // block width relative to container

// Block is sleeping (treated as static) when essentially stopped
const sleeping = b =>
  !b.falling &&
  Math.abs(b.vy) < 0.12 &&
  Math.abs(b.vx) < 0.10 &&
  Math.abs(b.av) < 0.018

const PhysicsTower = forwardRef(({ onTowerFall }, ref) => {
  const innerRef     = useRef(null)
  const blocksRef    = useRef([])
  const animRef      = useRef(null)
  const hasFallenRef = useRef(false)
  // Container dimensions resolved once at mount
  const dimsRef      = useRef({ w: 0, h: 0, groundY: 0, blockW: 0 })

  const [blocks,       setBlocks]       = useState([])
  const [cameraOffset, setCameraOffset] = useState(0)

  // Measure the bordered container once after mount
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

  // ── Physics loop — always running ──────────────────────────────────
  useEffect(() => {
    const step = () => {
      const { w, h, groundY, blockW } = dimsRef.current

      // Skip when no blocks or container not yet measured
      if (!w || blocksRef.current.length === 0) {
        animRef.current = requestAnimationFrame(step)
        return
      }

      let bs = blocksRef.current

      // 1. Integrate — skip sleeping blocks
      bs = bs.map(b => {
        if (sleeping(b)) return b
        const newVy = b.vy + GRAVITY
        const newVx = b.vx * FRICTION_X
        // No spin while in free-fall — only after touching surface
        const newAv = b.falling ? 0 : b.av * FRICTION_AV
        return {
          ...b,
          vy:       newVy,
          vx:       newVx,
          av:       newAv,
          x:        b.x + newVx,
          y:        b.y + newVy,
          rotation: b.rotation + newAv,
        }
      })

      // 2. Ground collision
      bs = bs.map(b => {
        if (b.y + BLOCK_H < groundY) return b
        const nb = { ...b, y: groundY - BLOCK_H, falling: false }
        if (Math.abs(nb.vy) > 0.5) nb.vy = -nb.vy * RESTITUTION
        else nb.vy = 0
        nb.vx *= 0.65
        nb.av *= 0.65
        return nb
      })

      // 3. Wall collision
      bs = bs.map(b => {
        if (sleeping(b)) return b
        const nb    = { ...b }
        const left  = blockW / 2
        const right = w - blockW / 2
        if (nb.x < left)  { nb.x = left;  nb.vx =  Math.abs(nb.vx) * 0.25 }
        if (nb.x > right) { nb.x = right; nb.vx = -Math.abs(nb.vx) * 0.25 }
        return nb
      })

      // 4. Block–block collisions (all pairs)
      for (let i = 0; i < bs.length - 1; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i], b_ = bs[j]

          // Horizontal overlap required
          if (Math.abs(a.x - b_.x) >= blockW) continue

          // Determine which is on top (smaller y = higher on screen)
          const topIdx = a.y <= b_.y ? i : j
          const botIdx = a.y <= b_.y ? j : i
          const top    = bs[topIdx]
          const bot    = bs[botIdx]

          // Vertical overlap: top's bottom crosses bot's top edge
          if (!(top.y + BLOCK_H > bot.y && top.y < bot.y)) continue

          const botSleeping = sleeping(bot)

          // Snap top block onto bot surface
          bs[topIdx] = { ...bs[topIdx], y: bot.y - BLOCK_H, falling: false }

          // Vertical bounce
          if (Math.abs(bs[topIdx].vy) > 0.5) {
            bs[topIdx] = { ...bs[topIdx], vy: -bs[topIdx].vy * RESTITUTION }
          } else {
            bs[topIdx] = { ...bs[topIdx], vy: 0 }
          }

          // Lateral impulse — the key to sliding/toppling:
          // offset from center of block below → pushes block sideways
          const dx          = bs[topIdx].x - bot.x
          const lateralPush = (dx / (blockW * 0.5)) * 0.68
          bs[topIdx] = {
            ...bs[topIdx],
            vx: bs[topIdx].vx * 0.50 + lateralPush,
            av: bs[topIdx].av * 0.55 + dx * 0.0007,
          }

          // Never disturb sleeping bottom block
          if (!botSleeping) {
            bs[botIdx] = { ...bs[botIdx], vy: bs[botIdx].vy - 0.04 }
          }
        }
      }

      blocksRef.current = bs
      setBlocks([...bs])

      // 5. Camera — lerp toward top of tower (no CSS transition needed)
      const topY   = Math.min(...bs.map(b => b.y))
      const pad    = h * 0.22
      const target = Math.max(0, topY - pad)
      setCameraOffset(prev => prev + (target - prev) * 0.055)

      // 6. Fall detection — only settled blocks trigger collapse
      if (!hasFallenRef.current) {
        const fallen = bs.some(b =>
          (!b.falling && Math.abs(b.rotation) > FALL_ROT) ||
          b.y > groundY + FALL_Y_EXTRA
        )
        if (fallen) {
          hasFallenRef.current = true
          onTowerFall()
        }
      }

      animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [onTowerFall])

  // ── Imperative handle ──────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    dropBlock: (offsetX, alignmentScore) => {
      const { w, groundY, blockW } = dimsRef.current
      if (!w) return

      hasFallenRef.current = false

      const hue      = alignmentScore * 120
      const centerX  = w / 2
      const rawX     = centerX + offsetX * w * 0.36
      const clampedX = Math.max(blockW / 2 + 6, Math.min(w - blockW / 2 - 6, rawX))

      const newBlock = {
        id:       Date.now(),
        x:        clampedX,
        y:        -BLOCK_H,
        vx:       0,
        vy:       2,
        av:       0,
        rotation: 0,
        falling:  true,
        color:    `hsl(${hue}, 72%, 52%)`,
        width:    blockW,
      }

      blocksRef.current = [...blocksRef.current, newBlock]
      setBlocks([...blocksRef.current])
    },

    resetBlocks: () => {
      blocksRef.current    = []
      hasFallenRef.current = false
      setBlocks([])
      setCameraOffset(0)
    },
  }))

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* Bordered tower container */}
      <div
        ref={innerRef}
        style={{
          position:     'absolute',
          left:         18, right: 18,
          top:          68, bottom: 76,
          border:       '1px solid var(--border)',
          borderRadius: 20,
          overflow:     'hidden',
          background:   '#09090b',
        }}
      >
        {/* Camera layer — translateY pans up as tower grows */}
        <div style={{
          position: 'absolute',
          inset:    0,
          transform: `translateY(${-cameraOffset}px)`,
        }}>
          {blocks.length === 0 && (
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

          {blocks.map(block => (
            <div
              key={block.id}
              style={{
                position:        'absolute',
                left:            block.x - block.width / 2,
                top:             block.y,
                width:           block.width,
                height:          BLOCK_H,
                transform:       `rotate(${block.rotation}deg)`,
                transformOrigin: 'center center',
                willChange:      'transform, top, left',
              }}
            >
              {/* Glow */}
              <div style={{
                position:     'absolute',
                inset:        0,
                borderRadius: 6,
                background:   block.color,
                filter:       'blur(5px)',
                opacity:      0.28,
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
