import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'

const WIDTH_RATIO = 0.33

// ── Canvas helpers ────────────────────────────────────────────────────────────
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

  // Subtle glow
  ctx.shadowColor = color
  ctx.shadowBlur  = 7
  roundRect(ctx, -bw/2, -bh/2, bw, bh, r)

  // Body gradient
  const grad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2)
  grad.addColorStop(0, color + 'dd')
  grad.addColorStop(1, color + '66')
  ctx.fillStyle = grad
  ctx.fill()

  // Edge stroke (reduced glow)
  ctx.shadowBlur  = 10
  ctx.strokeStyle = color
  ctx.lineWidth   = 1
  ctx.stroke()

  // Top shine
  ctx.shadowBlur = 0
  const shine = ctx.createLinearGradient(-bw/2, -bh/2, -bw/2, 0)
  shine.addColorStop(0, 'rgba(255,255,255,0.18)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  roundRect(ctx, -bw/2, -bh/2, bw, bh/2, r)
  ctx.fill()

  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall, isHost = false }, ref) => {
  const containerRef  = useRef(null)
  const canvasRef     = useRef(null)
  const engineRef     = useRef(null)
  const runnerRef     = useRef(null)
  const bodiesRef     = useRef([])       // [{ body, color }]
  const hasFallenRef  = useRef(false)
  const onFallRef     = useRef(onTowerFall)
  const dimsRef       = useRef({ w: 0, h: 0, blockW: 0, blockH: 36 })
  const camRef        = useRef(0)
  const camTargetRef  = useRef(0)
  const animRef       = useRef(null)
  const justAddedRef  = useRef(false)
  const blinkTimerRef = useRef(null)
  const baselineYRef  = useRef(null)

  useEffect(() => { onFallRef.current = onTowerFall }, [onTowerFall])

  // ── Engine init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.Matter) return

    // clientWidth/clientHeight = content area only (no border), avoids 1px clip
    const w      = container.clientWidth
    const h      = container.clientHeight
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

    // Ground: center at h+5, height 30 → top surface at h-10
    // Narrow width (w+20) so blocks that slide off the edge fall freely
    const ground = Bodies.rectangle(w / 2, h + 5, w + 20, 30, {
      isStatic: true, label: 'ground', friction: 1,
    })
    World.add(engine.world, [ground])

    const runner = Runner.create()
    Runner.run(runner, engine)
    runnerRef.current = runner

    // ── Render loop ────────────────────────────────────────────────────────────
    const loop = () => {
      const entries = bodiesRef.current
      const { blockW: bw, blockH: bh, h: ch, w: cw } = dimsRef.current

      camRef.current += (camTargetRef.current - camRef.current) * 0.06
      const cam = camRef.current

      ctx.clearRect(0, 0, cw, ch)

      // Blocks in camera space
      ctx.save()
      ctx.translate(0, cam)
      for (const { body, color } of entries) {
        drawBlock(ctx, body, color, bw, bh)
      }
      ctx.restore()

      // Empty placeholder
      if (entries.length === 0) {
        ctx.save()
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('Tower will be built here', cw / 2, ch - 14)
        ctx.restore()
      }

      // Stacked counter — top-left label, top-right number, blinks when block added
      if (entries.length > 0) {
        const blinking = justAddedRef.current
        ctx.save()
        ctx.font = '500 10px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = blinking ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText('STACKED', 14, 14)

        ctx.font = `800 ${blinking ? '26px' : '22px'} -apple-system, BlinkMacSystemFont, sans-serif`
        ctx.fillStyle = blinking ? '#ffffff' : 'rgba(255,255,255,0.75)'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillText(entries.length, cw - 14, 10)
        ctx.restore()
      }

      // Collapse detection — host only
      if (isHost && !hasFallenRef.current && entries.length > 0) {
        const baseline = baselineYRef.current
        for (let i = 0; i < entries.length; i++) {
          const body = entries[i].body
          const outOfBounds = body.position.y > ch + 60 ||
                              body.position.x < -bw * 1.5 ||
                              body.position.x > cw + bw * 1.5
          // Non-first block falls back down to the tower's base level
          const fellToBase = i > 0 && baseline !== null &&
                             body.position.y >= baseline - bh * 0.4
          if (outOfBounds || fellToBase) {
            hasFallenRef.current = true
            onFallRef.current()
            break
          }
        }
      }

      // Camera: keep topmost block in upper portion of view
      if (entries.length > 0) {
        const topY = Math.min(...entries.map(e => e.body.position.y - bh / 2))
        const pad  = ch * 0.22
        if (topY < pad) camTargetRef.current = Math.max(0, pad - topY)
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

  // ── Exposed API ───────────────────────────────────────────────────────────────
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
      const startY = -blockH * 2 - Math.max(0, camRef.current)

      const body = Bodies.rectangle(cx, startY, blockW, blockH, {
        restitution: 0.04,
        friction:    0.65,
        frictionAir: 0.008,
        density:     0.003,
        label:       'block',
      })

      // When dropping the 2nd block, record the 1st block's settled Y as the tower baseline
      if (bodiesRef.current.length === 1 && baselineYRef.current === null) {
        baselineYRef.current = bodiesRef.current[0].body.position.y
      }

      bodiesRef.current = [...bodiesRef.current, { body, color }]
      World.add(engineRef.current.world, body)

      // Trigger blink for 500 ms
      justAddedRef.current = true
      clearTimeout(blinkTimerRef.current)
      blinkTimerRef.current = setTimeout(() => { justAddedRef.current = false }, 500)
    },

    resetBlocks: () => {
      if (!engineRef.current || !window.Matter) return
      const { World } = window.Matter
      bodiesRef.current.forEach(({ body }) => World.remove(engineRef.current.world, body))
      bodiesRef.current    = []
      hasFallenRef.current = false
      baselineYRef.current = null
      camRef.current       = 0
      camTargetRef.current = 0
    },

    panToBase: () => { camTargetRef.current = 0 },

    getPhysicsSnapshot: () => {
      return bodiesRef.current.map(({ body }) => [
        body.position.x, body.position.y,
        body.angle,
        body.velocity.x, body.velocity.y,
      ])
    },

    applyPhysicsSnapshot: (data) => {
      if (!window.Matter || !Array.isArray(data)) return
      const { Body } = window.Matter
      const entries = bodiesRef.current
      const len = Math.min(data.length, entries.length)
      for (let i = 0; i < len; i++) {
        const [x, y, angle, vx, vy] = data[i]
        Body.setPosition(entries[i].body, { x, y })
        Body.setAngle(entries[i].body, angle)
        Body.setVelocity(entries[i].body, { x: vx, y: vy })
      }
    },

  }))

  // ── Render ────────────────────────────────────────────────────────────────────
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
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
