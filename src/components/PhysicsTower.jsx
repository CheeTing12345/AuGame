import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react'

const GRAVITY = 0.38
const FRICTION = 0.97
const ANGULAR_FRICTION = 0.94
const RESTITUTION = 0.15
const WALL_THICKNESS = 0
const BLOCK_HEIGHT = 28
const FALL_ROTATION_LIMIT = 75   // degrees before "fallen"
const FALL_Y_MARGIN = 80         // px below ground = fallen

// Responsive container — set at mount time
let CONTAINER_WIDTH = Math.min(window.innerWidth, 420)
let CONTAINER_HEIGHT = window.innerHeight
let GROUND_Y = CONTAINER_HEIGHT - 60
let BLOCK_WIDTH = Math.min(130, CONTAINER_WIDTH * 0.55)

const PhysicsTower = forwardRef(({ onTowerFall, isActive }, ref) => {
  const [blocks, setBlocks] = useState([])
  const [cameraOffsetY, setCameraOffsetY] = useState(0)
  const blocksRef = useRef([])
  const hasFallenRef = useRef(false)
  const animFrameRef = useRef()

  // Recompute layout on mount in case window size changed
  useEffect(() => {
    CONTAINER_WIDTH = Math.min(window.innerWidth, 420)
    CONTAINER_HEIGHT = window.innerHeight
    GROUND_Y = CONTAINER_HEIGHT - 60
    BLOCK_WIDTH = Math.min(130, CONTAINER_WIDTH * 0.55)
  }, [])

  useImperativeHandle(ref, () => ({
    dropBlock: (offsetX, alignmentScore) => {
      hasFallenRef.current = false
      const hue = alignmentScore * 120  // 0=red, 120=green
      const startX = CONTAINER_WIDTH / 2 + offsetX * (CONTAINER_WIDTH * 0.28)
      const newBlock = {
        id: Date.now(),
        x: Math.max(BLOCK_WIDTH / 2 + 8, Math.min(CONTAINER_WIDTH - BLOCK_WIDTH / 2 - 8, startX)),
        y: 0,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        rotation: 0,
        velocityX: 0,
        velocityY: 2,
        angularVelocity: 0,
        color: `hsl(${hue}, 72%, 52%)`,
        mass: 1,
        isFalling: true,
      }
      blocksRef.current = [...blocksRef.current, newBlock]
      setBlocks([...blocksRef.current])
    },
    resetBlocks: () => {
      blocksRef.current = []
      hasFallenRef.current = false
      setBlocks([])
      setCameraOffsetY(0)
    },
  }))

  const checkCollision = (a, b) => {
    const hw1 = a.width / 2, hh1 = a.height / 2
    const hw2 = b.width / 2, hh2 = b.height / 2
    return (
      Math.abs(a.x - b.x) < hw1 + hw2 &&
      Math.abs((a.y + hh1) - (b.y + hh2)) < hh1 + hh2
    )
  }

  const resolveCollision = useCallback((b1, b2) => {
    const dx = b1.x - b2.x
    const dy = (b1.y + b1.height / 2) - (b2.y + b2.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return

    const nx = dx / dist, ny = dy / dist

    if (Math.abs(ny) >= Math.abs(nx)) {
      // Vertical — stacking
      if (b1.y < b2.y) {
        b1.y = b2.y - b1.height
        b1.isFalling = false
        const rv = b1.velocityY - b2.velocityY
        if (rv > 0) {
          const impulse = -(1 + RESTITUTION) * rv / 2
          b1.velocityY += impulse
          b2.velocityY -= impulse * 0.3
          const lateralOffset = b1.x - b2.x
          b1.angularVelocity = lateralOffset * 0.004
          b2.angularVelocity -= lateralOffset * 0.002
        }
      } else {
        b2.y = b1.y - b2.height
        b2.isFalling = false
        const rv = b2.velocityY - b1.velocityY
        if (rv > 0) {
          const impulse = -(1 + RESTITUTION) * rv / 2
          b2.velocityY += impulse
          b1.velocityY -= impulse * 0.3
          const lateralOffset = b2.x - b1.x
          b2.angularVelocity = lateralOffset * 0.004
          b1.angularVelocity -= lateralOffset * 0.002
        }
      }
    } else {
      // Horizontal — push apart
      const overlap = (b1.width / 2 + b2.width / 2) - Math.abs(dx)
      const sep = (overlap / 2) * Math.sign(dx)
      b1.x += sep
      b2.x -= sep
      const rv = b1.velocityX - b2.velocityX
      const impulse = -(1 + RESTITUTION) * rv / 2
      b1.velocityX += impulse
      b2.velocityX -= impulse
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    const simulate = () => {
      let bs = blocksRef.current.map(b => ({
        ...b,
        velocityY: b.velocityY + GRAVITY,
        velocityX: b.velocityX * FRICTION,
        angularVelocity: b.isFalling ? 0 : b.angularVelocity * ANGULAR_FRICTION,
        x: b.x + b.velocityX,
        y: b.y + b.velocityY,
        rotation: b.rotation + (b.isFalling ? 0 : b.angularVelocity * ANGULAR_FRICTION),
      }))

      // Ground collision
      bs = bs.map(b => {
        if (b.y + b.height < GROUND_Y) return b
        const nb = { ...b, y: GROUND_Y - b.height, isFalling: false }
        if (Math.abs(nb.velocityY) > 0.5) {
          nb.velocityY = -nb.velocityY * RESTITUTION
        } else {
          nb.velocityY = 0
        }
        nb.velocityX *= 0.92
        nb.angularVelocity *= 0.88
        return nb
      })

      // Wall collision
      bs = bs.map(b => {
        const nb = { ...b }
        const left = WALL_THICKNESS + nb.width / 2
        const right = CONTAINER_WIDTH - WALL_THICKNESS - nb.width / 2
        if (nb.x < left)  { nb.x = left;  nb.velocityX = Math.abs(nb.velocityX) * RESTITUTION }
        if (nb.x > right) { nb.x = right; nb.velocityX = -Math.abs(nb.velocityX) * RESTITUTION }
        return nb
      })

      // Block-block collisions
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          if (checkCollision(bs[i], bs[j])) {
            resolveCollision(bs[i], bs[j])
          }
        }
      }

      blocksRef.current = bs
      setBlocks([...bs])

      // Camera: pan up to keep the top of the stack visible
      if (bs.length > 0) {
        const topY = Math.min(...bs.map(b => b.y))
        const visibleAreaPad = CONTAINER_HEIGHT * 0.25
        const desiredCamera = Math.max(0, topY - visibleAreaPad)
        setCameraOffsetY(prev => {
          const target = desiredCamera
          return prev + (target - prev) * 0.06  // smooth lerp
        })
      }

      // Fall detection
      if (!hasFallenRef.current) {
        const fallen = bs.some(
          b => b.y > GROUND_Y + FALL_Y_MARGIN || Math.abs(b.rotation) > FALL_ROTATION_LIMIT
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

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Ground line */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: GROUND_Y - cameraOffsetY,
        height: 2,
        background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
        transition: 'none',
      }} />

      {/* Ground label */}
      {blocks.length === 0 && (
        <div style={{
          position: 'absolute',
          bottom: CONTAINER_HEIGHT - GROUND_Y + 12,
          left: 0,
          right: 0,
          textAlign: 'center',
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
            position: 'absolute',
            left: block.x - block.width / 2,
            top: block.y - cameraOffsetY,
            width: block.width,
            height: block.height,
            transform: `rotate(${block.rotation}deg)`,
            transformOrigin: 'center center',
            willChange: 'transform, top',
          }}
        >
          {/* Glow shadow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            background: block.color,
            filter: 'blur(6px)',
            opacity: 0.3,
            transform: 'translateY(3px)',
          }} />
          {/* Block body */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            background: `linear-gradient(160deg, ${block.color}ee 0%, ${block.color}99 100%)`,
            border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}>
            {/* Highlight stripe */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '45%',
              borderRadius: '6px 6px 0 0',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)',
            }} />
          </div>
        </div>
      ))}

      {/* Block counter */}
      {blocks.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '8px 14px',
          border: '1px solid var(--border)',
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
