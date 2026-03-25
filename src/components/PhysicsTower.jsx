import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SIZE      = 8      // width/depth of the base block (world units)
const BLOCK_H        = 1.5    // height of every block (world units)
const MIN_STEP_RATIO = 0.25   // each block is at minimum 25 % of the previous one
const FAIL_SIZE      = BASE_SIZE * 0.05   // 5 % of base → tower fails
const D_UNITS        = 14     // half-extent for the orthographic camera frustum
const CAM_OFFSET     = 4      // camera sits this many units above its lookAt point

// ── Component ─────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall, isHost = false }, ref) => {
  const containerRef  = useRef(null)
  const rendererRef   = useRef(null)
  const sceneRef      = useRef(null)
  const cameraRef     = useRef(null)
  const animFrameRef  = useRef(null)
  const blocksRef     = useRef([])          // { mesh, size, targetY }[]
  const camTargetYRef = useRef(CAM_OFFSET)  // camera position Y target
  const onFallRef     = useRef(onTowerFall)
  const failTimerRef  = useRef(null)        // setTimeout id for delayed fail callback

  useEffect(() => { onFallRef.current = onTowerFall }, [onTowerFall])

  // ── Three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth  || 300
    const h = container.clientHeight || 500

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x09090b, 1)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Orthographic isometric camera
    const aspect = w / h
    const camera = new THREE.OrthographicCamera(
      -D_UNITS * aspect, D_UNITS * aspect,
       D_UNITS,          -D_UNITS,
      -100, 1000
    )
    // Camera sits CAM_OFFSET above its lookAt target.
    // Initial lookAt = (0, 0, 0), so camera starts at y = CAM_OFFSET.
    camera.position.set(2, CAM_OFFSET, 2)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(0, 499, 0)
    const ambLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(dirLight, ambLight)

    // Base platform (always full size, dark colour, never removed)
    const baseGeo  = new THREE.BoxGeometry(BASE_SIZE, BLOCK_H, BASE_SIZE)
    const baseMat  = new THREE.MeshLambertMaterial({ color: 0x333344 })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.position.set(0, 0, 0)
    scene.add(baseMesh)
    blocksRef.current = [{ mesh: baseMesh, size: BASE_SIZE, targetY: 0 }]

    // ── Render loop ──────────────────────────────────────────────────────────
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      // Smooth camera position Y
      camera.position.y += (camTargetYRef.current - camera.position.y) * 0.05

      // Keep lookAt CAM_OFFSET below camera so the isometric angle stays constant
      camera.lookAt(0, camera.position.y - CAM_OFFSET, 0)

      // Lerp each block down to its resting Y
      for (const b of blocksRef.current) {
        if (Math.abs(b.mesh.position.y - b.targetY) > 0.01) {
          b.mesh.position.y += (b.targetY - b.mesh.position.y) * 0.12
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize handler ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w2 = container.clientWidth
      const h2 = container.clientHeight
      if (!w2 || !h2) return
      const asp2 = w2 / h2
      renderer.setSize(w2, h2)
      camera.left   = -D_UNITS * asp2
      camera.right  =  D_UNITS * asp2
      camera.top    =  D_UNITS
      camera.bottom = -D_UNITS
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    return () => {
      clearTimeout(failTimerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      blocksRef.current     = []
      camTargetYRef.current = CAM_OFFSET
    }
  }, [])

  // ── Exposed API ───────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    dropBlock: (_offsetX, alignScore) => {
      const scene = sceneRef.current
      if (!scene) return

      const prev     = blocksRef.current[blocksRef.current.length - 1]
      const prevSize = prev ? prev.size : BASE_SIZE

      // Floor the per-step reduction at 25 % so a single bad answer can't
      // instantly shrink the block to nothing.
      const effectiveScore = Math.max(MIN_STEP_RATIO, alignScore)
      const rawSize        = prevSize * effectiveScore

      // Check if this block hits or passes the 5 % failure threshold.
      const isFail  = rawSize <= FAIL_SIZE
      const newSize = isFail ? FAIL_SIZE : rawSize   // show block at exactly 5 % if failing

      const yIndex  = blocksRef.current.length
      const targetY = yIndex * BLOCK_H

      const hue   = alignScore * 120   // 0° = red, 120° = green
      const color = new THREE.Color(`hsl(${hue}, 72%, 55%)`)

      const geometry = new THREE.BoxGeometry(newSize, BLOCK_H, newSize)
      const material = new THREE.MeshLambertMaterial({ color })
      const mesh     = new THREE.Mesh(geometry, material)

      // Start above and lerp down
      mesh.position.set(0, targetY + 20, 0)
      scene.add(mesh)
      blocksRef.current.push({ mesh, size: newSize, targetY })

      // Pan camera up
      camTargetYRef.current = targetY + CAM_OFFSET + 2

      // Trigger fail after the block has had time to visually land (~900 ms)
      if (isFail && isHost) {
        clearTimeout(failTimerRef.current)
        failTimerRef.current = setTimeout(() => onFallRef.current(), 900)
      }
    },

    resetBlocks: () => {
      const scene = sceneRef.current
      if (!scene) return
      clearTimeout(failTimerRef.current)

      // Dispose and remove all stacked blocks, keep the base (index 0)
      for (let i = 1; i < blocksRef.current.length; i++) {
        const { mesh } = blocksRef.current[i]
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      blocksRef.current     = blocksRef.current.slice(0, 1)
      camTargetYRef.current = CAM_OFFSET
    },

    panToBase: () => { camTargetYRef.current = CAM_OFFSET },

  }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#09090b' }}>
      <div
        ref={containerRef}
        style={{
          position:     'absolute',
          left: 18, right: 18,
          top: 68, bottom: 76,
          borderRadius: 20,
          overflow:     'hidden',
          background:   '#09090b',
          border:       '1.5px dashed rgba(255,255,255,0.14)',
        }}
      />
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'
export default PhysicsTower
