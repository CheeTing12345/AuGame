import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'

const WIDTH_RATIO = 0.33

// ── Canvas helpers ───────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,      y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x,     y,     x + r,  y,         r)
  ctx.closePath()
}

function drawBlock(ctx, body, color, bw, bh) {
  const { x, y } = body.position
  const r = 8
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(body.angle)

  // Glow
  ctx.shadowColor = color
  ctx.shadowBlur  = 18
  roundRect(ctx, -bw/2, -bh/2, bw, bh, r)

  // Body gradient
  const grad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2)
  grad.addColorStop(0, color + 'ee')
  grad.addColorStop(1, color + '77')
  ctx.fillStyle = grad
  ctx.fill()

  // Edge stroke
  ctx.shadowBlur  = 26
  ctx.strokeStyle = color
  ctx.lineWidth   = 1.5
  ctx.stroke()

  // Top shine
  ctx.shadowBlur = 0
  const shine = ctx.createLinearGradient(-bw/2, -bh/2, -bw/2, 0)
  shine.addColorStop(0, 'rgba(255,255,255,0.22)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  roundRect(ctx, -bw/2, -bh/2, bw, bh/2, r)
  ctx.fill()

  ctx.restore()
}

// ── Component ────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall }, ref) => {
  const containerRef  = useRef(null)
  const canvasRef     = useRef(null)
  const engineRef     = useRef(null)
  const runnerRef     = useRef(null)
  const bodiesRef     = useRef([])          // [{ body, color }]
  const hasFallenRef  = useRef(false)
  const onFallRef     = useRef(onTowerFall)
  const dimsRef       = useRef({ w: 0, h: 0, blockW: 0, blockH: 36 })
  const camRef        = useRef(0)           // current camera offset (px, positive = scrolled up)
  const camTargetRef  = useRef(0)
  const animRef       = useRef(null)

  const [stackCount, setStackCount] = useState(0)

  useEffect(() => { onFallRef.current = onTowerFall }, [onTowerFall])

  // ── Engine init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.Matter) return

    const rect  = container.getBoundingClientRect()
    const w     = rect.width
    const h     = rect.height
    const blockH = Math.max(32, Math.floor(h * 0.058))
    const blockW = Math.round(w * WIDTH_RATIO)
    dimsRef.current = { w, h, blockW, blockH }

    // High-DPI canvas
    const dpr    = window.devicePixelRatio || 1
    const canvas = canvasRef.current
    canvas.width        = w * dpr
    canvas.height       = h * dpr
    canvas.style.width  = w + 'px'
    canvas.style.height = h + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const { Engine, World, Bodies, Runner } = window.Matter

    const engine = Engine.create({ gravity: { x: 0, y: 1.8 } })
    engineRef.current = engine

    // Narrow ground — blocks that slide off the edge fall freely (enables collapse detection).
    // Center at h+11 with height 30 → top surface at h-4, so blocks rest 4px above canvas bottom.
    const ground = Bodies.rectangle(w / 2, h + 11, w + 20, 30, { isStatic: true, label: 'ground', friction: 1 })
    World.add(engine.world, [ground])

    const runner = Runner.create()
    Runner.run(runner, engine)
    runnerRef.current = runner

    // ── Render loop ───────────────────────────────────────────────────────────
    const loop = () => {
      const entries    = bodiesRef.current
      const { blockW: bw, blockH: bh, h: ch, w: cw } = dimsRef.current

      // Smooth camera lerp
      camRef.current += (camTargetRef.current - camRef.current) * 0.06

      const cam = camRef.current

      // Clear
      ctx.clearRect(0, 0, cw, ch)

      // Ground line at visual bottom (not in camera space)
      ctx.save()
      ctx.shadowColor = 'rgba(255,255,255,0.2)'
      ctx.shadowBlur  = 8
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(0, ch - 1)
      ctx.lineTo(cw, ch - 1)
      ctx.stroke()
      ctx.restore()

      // Blocks — translated by camera offset
      ctx.save()
      ctx.translate(0, cam)
      for (const { body, color } of entries) {
        drawBlock(ctx, body, color, bw, bh)
      }
      ctx.restore()

      // Collapse detection:
      // 1. Any block fell off the narrow ground (y > ch+60 or past canvas x-bounds)
      // 2. Any previously-settled block (not the newest) has tipped > ~23°
      if (!hasFallenRef.current && entries.length > 0) {
        for (let i = 0; i < entries.length; i++) {
          const body = entries[i].body
          const outOfBounds = body.position.y > ch + 60 ||
                              body.position.x < -bw * 1.5 ||
                              body.position.x > cw + bw * 1.5
          const tipped = i < entries.length - 1 && Math.abs(body.angle) > 0.4
          if (outOfBounds || tipped) {
            hasFallenRef.current = true
            onFallRef.current()
            break
          }
        }
      }

      // Camera target: keep topmost block in upper portion of view
      if (entries.length > 0) {
        const topY = Math.min(...entries.map(e => e.body.position.y - bh / 2))
        const pad  = ch * 0.22
        if (topY < pad) {
          camTargetRef.current = Math.max(0, pad - topY)
        }
      }

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      Runner.stop(runner)
      World.clear(engine.world, false)
      Engine.clear(engine)
    }
  }, [])

  // ── Exposed API ──────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    dropBlock: (offsetX, alignmentScore) => {
      const { w, blockW, blockH } = dimsRef.current
      if (!w || !window.Matter || !engineRef.current) return

      hasFallenRef.current = false

      const { Bodies, World } = window.Matter
      const hue    = alignmentScore * 120
      const color  = `hsl(${hue}, 72%, 55%)`
      const rawX   = w / 2 + offsetX * w * 0.50
      const cx     = Math.max(blockW / 2 + 4, Math.min(w - blockW / 2 - 4, rawX))
      // Start block above the visible top of the camera view
      const startY = -blockH * 2 - Math.max(0, camRef.current)

      const body = Bodies.rectangle(cx, startY, blockW, blockH, {
        restitution: 0.04,
        friction:    0.65,
        frictionAir: 0.008,
        density:     0.003,
        label:       'block',
      })

      bodiesRef.current = [...bodiesRef.current, { body, color }]
      World.add(engineRef.current.world, body)
      setStackCount(c => c + 1)
    },

    resetBlocks: () => {
      if (!engineRef.current || !window.Matter) return
      const { World } = window.Matter
      bodiesRef.current.forEach(({ body }) => World.remove(engineRef.current.world, body))
      bodiesRef.current    = []
      hasFallenRef.current = false
      camRef.current       = 0
      camTargetRef.current = 0
      setStackCount(0)
    },

    // Smoothly pan camera back to show the base of the tower
    panToBase: () => {
      camTargetRef.current = 0
    },

  }))

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* Bordered tower container */}
      <div
        ref={containerRef}
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
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 20 }} />

        {stackCount === 0 && (
          <div style={{
            position:      'absolute',
            bottom: 18, left: 0, right: 0,
            textAlign:     'center',
            pointerEvents: 'none',
          }}>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Tower will be built here</span>
          </div>
        )}
      </div>

      {/* Block counter */}
      {stackCount > 0 && (
        <div style={{
          position:       'absolute', top: 16, left: 16,
          background:     'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          borderRadius:   12,
          padding:        '8px 14px',
          border:         '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stacked</p>
          <p style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{stackCount}</p>
        </div>
      )}
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
