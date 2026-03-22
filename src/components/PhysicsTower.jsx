import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react'

const GRAVITY        = 0.4
const FRICTION       = 0.97
const ANG_FRICTION   = 0.92
const RESTITUTION    = 0.12
const BLOCK_HEIGHT   = 28
const FALL_ROT_LIMIT = 72   // degrees — only checked on settled blocks
const FALL_Y_MARGIN  = 100  // px below ground

// Resolved at mount — uses the constrained #root width, not full viewport
let CONTAINER_WIDTH  = Math.min(window.innerWidth, 430)
let CONTAINER_HEIGHT = window.innerHeight
let GROUND_Y         = CONTAINER_HEIGHT - 60
let BLOCK_WIDTH      = Math.min(124, CONTAINER_WIDTH * 0.54)

// A block is "sleeping" (treated as static) when it has essentially stopped
const isSleeping = (b) =>
  !b.isFalling &&
  Math.abs(b.velocityY)        < 0.15 &&
  Math.abs(b.velocityX)        < 0.15 &&
  Math.abs(b.angularVelocity)  < 0.025

const PhysicsTower = forwardRef(({ onTowerFall, isActive }, ref) => {
  const [blocks,        setBlocks]        = useState([])
  const [cameraOffsetY, setCameraOffsetY] = useState(0)
  const blocksRef      = useRef([])
  const hasFallenRef   = useRef(false)
  const animFrameRef   = useRef()

  useEffect(() => {
    CONTAINER_WIDTH  = Math.min(window.innerWidth, 430)
    CONTAINER_HEIGHT = window.innerHeight
    GROUND_Y         = CONTAINER_HEIGHT - 60
    BLOCK_WIDTH      = Math.min(124, CONTAINER_WIDTH * 0.54)
  }, [])

  useImperativeHandle(ref, () => ({
    dropBlock: (offsetX, alignmentScore) => {
      hasFallenRef.current = false
      const hue = alignmentScore * 120
      // Natural jitter so perfectly-aligned blocks don't stack in a dead-straight line
      const jitter = (Math.random() - 0.5) * 6
      const rawX = CONTAINER_WIDTH / 2 + offsetX * (CONTAINER_WIDTH * 0.3) + jitter
      const clampedX = Math.max(
        BLOCK_WIDTH / 2 + 6,
        Math.min(CONTAINER_WIDTH - BLOCK_WIDTH / 2 - 6, rawX)
      )
      const newBlock = {
        id:             Date.now(),
        x:              clampedX,
        y:              -BLOCK_HEIGHT,   // start just above viewport
        width:          BLOCK_WIDTH,
        height:         BLOCK_HEIGHT,
        rotation:       0,
        velocityX:      0,
        velocityY:      2,
        angularVelocity: 0,
        color:          `hsl(${hue}, 72%, 52%)`,
        mass:           1,
        isFalling:      true,
      }
      blocksRef.current = [...blocksRef.current, newBlock]
      setBlocks([...blocksRef.current])
    },
    resetBlocks: () => {
      blocksRef.current   = []
      hasFallenRef.current = false
      setBlocks([])
      setCameraOffsetY(0)
    },
  }))

  // ── Collision ────────────────────────────────────────────────────────────────
  const checkCollision = (a, b) => {
    const hw1 = a.width  / 2, hh1 = a.height / 2
    const hw2 = b.width  / 2, hh2 = b.height / 2
    return (
      Math.abs(a.x - b.x)                      < hw1 + hw2 &&
      Math.abs((a.y + hh1) - (b.y + hh2))      < hh1 + hh2
    )
  }

  const resolveCollision = useCallback((b1, b2) => {
    const dx   = b1.x - b2.x
    const dy   = (b1.y + b1.height / 2) - (b2.y + b2.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return

    const nx = dx / dist
    const ny = dy / dist
    const b1Sleep = isSleeping(b1)
    const b2Sleep = isSleeping(b2)

    if (Math.abs(ny) >= Math.abs(nx)) {
      // ── Vertical (stacking) ──
      if (b1.y < b2.y) {
        // b1 lands on top of b2
        b1.y        = b2.y - b1.height
        b1.isFalling = false

        if (b2Sleep) {
          // b2 is a static surface — only update b1
          if (Math.abs(b1.velocityY) > 0.6) {
            b1.velocityY = -b1.velocityY * RESTITUTION
          } else {
            b1.velocityY = 0
          }
          b1.velocityX    *= 0.75
          // Very subtle tilt only — no spinning
          const lat        = b1.x - b2.x
          b1.angularVelocity = lat * 0.0012
        } else {
          // Both active — small impulse exchange
          const rv = b1.velocityY - b2.velocityY
          if (rv > 0) {
            const imp    = -(1 + RESTITUTION) * rv / 2
            b1.velocityY += imp
            b2.velocityY -= imp * 0.25  // very little to bottom block
            const lat     = b1.x - b2.x
            b1.angularVelocity = lat * 0.0012
            // DO NOT touch b2.angularVelocity — prevents chain spinning
          }
        }
      } else {
        // b2 lands on top of b1
        b2.y        = b1.y - b2.height
        b2.isFalling = false

        if (b1Sleep) {
          if (Math.abs(b2.velocityY) > 0.6) {
            b2.velocityY = -b2.velocityY * RESTITUTION
          } else {
            b2.velocityY = 0
          }
          b2.velocityX *= 0.75
          const lat     = b2.x - b1.x
          b2.angularVelocity = lat * 0.0012
        } else {
          const rv = b2.velocityY - b1.velocityY
          if (rv > 0) {
            const imp    = -(1 + RESTITUTION) * rv / 2
            b2.velocityY += imp
            b1.velocityY -= imp * 0.25
            const lat     = b2.x - b1.x
            b2.angularVelocity = lat * 0.0012
          }
        }
      }
    } else {
      // ── Horizontal ── (blocks sliding past each other)
      if (b1Sleep && b2Sleep) return
      const overlap = (b1.width / 2 + b2.width / 2) - Math.abs(dx)
      const sep     = (overlap / 2) * Math.sign(dx)
      if (!b1Sleep) b1.x += sep
      if (!b2Sleep) b2.x -= sep
      const rv  = b1.velocityX - b2.velocityX
      const imp = -(1 + RESTITUTION) * rv / 2
      if (!b1Sleep) b1.velocityX += imp
      if (!b2Sleep) b2.velocityX -= imp
    }
  }, [])

  // ── Physics loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return

    const simulate = () => {
      // 1. Integrate — skip sleeping blocks entirely
      let bs = blocksRef.current.map(b => {
        if (isSleeping(b)) return b

        const angV = b.isFalling ? 0 : b.angularVelocity * ANG_FRICTION
        return {
          ...b,
          velocityY:      b.velocityY + GRAVITY,
          velocityX:      b.velocityX * FRICTION,
          angularVelocity: angV,
          x:              b.x + b.velocityX,
          y:              b.y + b.velocityY,
          rotation:       b.rotation + angV,
        }
      })

      // 2. Ground collision
      bs = bs.map(b => {
        if (b.y + b.height < GROUND_Y) return b
        const nb = { ...b, y: GROUND_Y - b.height, isFalling: false }
        if (Math.abs(nb.velocityY) > 0.6) {
          nb.velocityY = -nb.velocityY * RESTITUTION
        } else {
          nb.velocityY = 0
        }
        nb.velocityX      *= 0.80
        nb.angularVelocity *= 0.80
        return nb
      })

      // 3. Wall collision
      bs = bs.map(b => {
        if (isSleeping(b)) return b
        const nb    = { ...b }
        const left  = nb.width / 2
        const right = CONTAINER_WIDTH - nb.width / 2
        if (nb.x < left)  { nb.x = left;  nb.velocityX =  Math.abs(nb.velocityX) * RESTITUTION }
        if (nb.x > right) { nb.x = right; nb.velocityX = -Math.abs(nb.velocityX) * RESTITUTION }
        return nb
      })

      // 4. Block–block collisions (most-recently-added last = top)
      for (let i = 0; i < bs.length - 1; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          if (checkCollision(bs[i], bs[j])) {
            resolveCollision(bs[i], bs[j])
          }
        }
      }

      // 5. Sleep pass — zero out blocks that have come to rest
      bs = bs.map(b => {
        if (b.isFalling) return b
        if (
          Math.abs(b.velocityY) < 0.1 &&
          Math.abs(b.velocityX) < 0.1 &&
          Math.abs(b.angularVelocity) < 0.015
        ) {
          return { ...b, velocityY: 0, velocityX: 0, angularVelocity: 0 }
        }
        return b
      })

      blocksRef.current = bs
      setBlocks([...bs])

      // 6. Camera — lerp toward top of tower
      if (bs.length > 0) {
        const topY       = Math.min(...bs.map(b => b.y))
        const pad        = CONTAINER_HEIGHT * 0.22
        const target     = Math.max(0, topY - pad)
        setCameraOffsetY(prev => prev + (target - prev) * 0.05)
      }

      // 7. Fall detection — only settled blocks can trigger collapse
      if (!hasFallenRef.current) {
        const fallen = bs.some(b =>
          !b.isFalling && (
            b.y > GROUND_Y + FALL_Y_MARGIN ||
            Math.abs(b.rotation) > FALL_ROT_LIMIT
          )
        )
        if (fallen) {
          hasFallenRef.current = true
          onTowerFall()
        }
      }

      animFrameRef.current = requestAnimationFrame(simulate)
    }

    animFrameRef.current = requestAnimationFrame(simulate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isActive, onTowerFall, resolveCollision])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Ground line */}
      <div style={{
        position:   'absolute',
        left: 0, right: 0,
        top:        GROUND_Y - cameraOffsetY,
        height:     1,
        background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
      }} />

      {/* Empty-state hint */}
      {blocks.length === 0 && (
        <div style={{
          position:   'absolute',
          bottom:     CONTAINER_HEIGHT - GROUND_Y + 16,
          left: 0, right: 0,
          textAlign:  'center',
        }}>
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
            Tower will be built here
          </span>
        </div>
      )}

      {/* Blocks */}
      {blocks.map(block => (
        <div
          key={block.id}
          style={{
            position:        'absolute',
            left:            block.x - block.width / 2,
            top:             block.y - cameraOffsetY,
            width:           block.width,
            height:          block.height,
            transform:       `rotate(${block.rotation}deg)`,
            transformOrigin: 'center center',
            willChange:      'transform, top, left',
          }}
        >
          {/* Glow */}
          <div style={{
            position:        'absolute',
            inset:           0,
            borderRadius:    6,
            background:      block.color,
            filter:          'blur(6px)',
            opacity:         0.28,
            transform:       'translateY(3px)',
          }} />
          {/* Body */}
          <div style={{
            position:   'absolute',
            inset:      0,
            borderRadius: 6,
            background: `linear-gradient(155deg, ${block.color}f0 0%, ${block.color}99 100%)`,
            border:     '1px solid rgba(255,255,255,0.11)',
            overflow:   'hidden',
          }}>
            {/* Top highlight */}
            <div style={{
              position:   'absolute',
              top: 0, left: 0, right: 0,
              height:     '42%',
              borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)',
            }} />
          </div>
        </div>
      ))}

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
