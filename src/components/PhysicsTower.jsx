import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react'

const BLOCK_H     = 36
const WIDTH_RATIO = 0.33

const PhysicsTower = forwardRef(({ onTowerFall }, ref) => {
  const innerRef        = useRef(null)
  const engineRef       = useRef(null)
  const runnerRef       = useRef(null)
  const bodiesRef       = useRef([])        // [{ body, color, id }]
  const animRef         = useRef(null)
  const hasFallenRef    = useRef(false)
  const onTowerFallRef  = useRef(onTowerFall)
  const dimsRef         = useRef({ w: 0, h: 0, blockW: 0 })

  const [renderBlocks, setRenderBlocks] = useState([])
  const [cameraOffset, setCameraOffset] = useState(0)

  // Keep callback ref fresh without restarting the engine
  useEffect(() => { onTowerFallRef.current = onTowerFall }, [onTowerFall])

  // ── Initialise Matter.js engine once ────────────────────────────────────────
  useEffect(() => {
    const el = innerRef.current
    if (!el || !window.Matter) return

    const { width: w, height: h } = el.getBoundingClientRect()
    const blockW = Math.round(w * WIDTH_RATIO)
    dimsRef.current = { w, h, blockW }

    const { Engine, World, Bodies, Runner } = window.Matter

    const engine = Engine.create({ gravity: { y: 1.8 } })
    engineRef.current = engine

    // Static boundary bodies
    const ground = Bodies.rectangle(w / 2, h + 6,  w + 20, 12, { isStatic: true, restitution: 0.05, friction: 1 })
    const wallL  = Bodies.rectangle(-5,    h / 2,   10,     h,  { isStatic: true, friction: 1 })
    const wallR  = Bodies.rectangle(w + 5, h / 2,   10,     h,  { isStatic: true, friction: 1 })
    World.add(engine.world, [ground, wallL, wallR])

    const runner = Runner.create()
    Runner.run(runner, engine)
    runnerRef.current = runner

    // ── Render loop: sync physics → React state every frame ─────────────────
    const loop = () => {
      const { h: ch } = dimsRef.current
      const entries   = bodiesRef.current

      if (entries.length > 0) {
        // Collapse detection: any block fell well below the floor
        if (!hasFallenRef.current) {
          for (const { body } of entries) {
            if (body.position.y > ch + 120) {
              hasFallenRef.current = true
              onTowerFallRef.current()
              break
            }
          }
        }

        // Camera: keep topmost block in upper portion of view
        const topY = Math.min(...entries.map(e => e.body.position.y - BLOCK_H / 2))
        const pad  = ch * 0.22
        if (topY < pad) {
          setCameraOffset(prev => {
            const next = Math.max(0, pad - topY)
            return Math.abs(next - prev) > 0.5 ? next : prev
          })
        }
      }

      setRenderBlocks(
        entries.map(({ body, color, id }) => ({
          id,
          color,
          x:      body.position.x,
          y:      body.position.y,
          angle:  body.angle,
          width:  dimsRef.current.blockW,
          height: BLOCK_H,
        }))
      )

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

  // ── Exposed API ─────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    dropBlock: (offsetX, alignmentScore) => {
      const { w, blockW } = dimsRef.current
      if (!w || !window.Matter || !engineRef.current) return

      hasFallenRef.current = false

      const { Bodies, World } = window.Matter

      const hue      = alignmentScore * 120
      const color    = `hsl(${hue}, 72%, 52%)`
      const rawX     = w / 2 + offsetX * w * 0.50
      const clampedX = Math.max(blockW / 2 + 4, Math.min(w - blockW / 2 - 4, rawX))

      const body = Bodies.rectangle(clampedX, -BLOCK_H * 2, blockW, BLOCK_H, {
        restitution: 0.05,
        friction:    0.85,
        frictionAir: 0.01,
        density:     0.003,
      })

      bodiesRef.current = [...bodiesRef.current, { body, color, id: Date.now() }]
      World.add(engineRef.current.world, body)
    },

    resetBlocks: () => {
      if (!engineRef.current || !window.Matter) return
      const { World } = window.Matter
      bodiesRef.current.forEach(({ body }) => World.remove(engineRef.current.world, body))
      bodiesRef.current    = []
      hasFallenRef.current = false
      setRenderBlocks([])
      setCameraOffset(0)
    },

  }))

  // ── Render ───────────────────────────────────────────────────────────────────
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

          {renderBlocks.length === 0 && (
            <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Tower will be built here</span>
            </div>
          )}

          {renderBlocks.map(block => (
            <div
              key={block.id}
              style={{
                position:  'absolute',
                left:      block.x - block.width  / 2,
                top:       block.y - block.height / 2,
                width:     block.width,
                height:    block.height,
                transform: `rotate(${block.angle}rad)`,
                willChange: 'transform, top, left',
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
      {renderBlocks.length > 0 && (
        <div style={{
          position:       'absolute', top: 16, left: 16,
          background:     'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          borderRadius:   12,
          padding:        '8px 14px',
          border:         '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stacked</p>
          <p style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{renderBlocks.length}</p>
        </div>
      )}
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
