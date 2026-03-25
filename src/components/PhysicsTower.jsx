import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SIZE = 8       // width/depth of the first block (world units)
const BLOCK_H   = 1.5     // height of every block (world units)
const MIN_SIZE  = BASE_SIZE * 0.02   // 2 % floor so blocks never disappear entirely
const D_UNITS   = 14      // half-extent for the orthographic camera frustum

// ── Component ─────────────────────────────────────────────────────────────────
const PhysicsTower = forwardRef(({ onTowerFall, isHost = false }, ref) => {
  const containerRef  = useRef(null)
  const rendererRef   = useRef(null)
  const sceneRef      = useRef(null)
  const cameraRef     = useRef(null)
  const animFrameRef  = useRef(null)
  const blocksRef     = useRef([])      // { mesh, size, targetY }[]
  const camTargetYRef = useRef(4)       // smooth camera target
  const onFallRef     = useRef(onTowerFall)

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

    // Orthographic isometric camera (same setup as the reference game)
    const aspect = w / h
    const camera = new THREE.OrthographicCamera(
      -D_UNITS * aspect, D_UNITS * aspect,
       D_UNITS,          -D_UNITS,
      -100, 1000
    )
    camera.position.set(2, 6, 2)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(0, 499, 0)
    const ambLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(dirLight, ambLight)

    // Base platform block (index 0, always full size, dark colour)
    const baseGeo  = new THREE.BoxGeometry(BASE_SIZE, BLOCK_H, BASE_SIZE)
    const baseMat  = new THREE.MeshLambertMaterial({ color: 0x333344 })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.position.set(0, 0, 0)
    scene.add(baseMesh)
    blocksRef.current = [{ mesh: baseMesh, size: BASE_SIZE, targetY: 0 }]

    // ── Render loop ──────────────────────────────────────────────────────────
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      // Camera smoothly tracks target Y
      camera.position.y += (camTargetYRef.current - camera.position.y) * 0.05

      // Each new block lerps to its resting Y (drop-from-above effect)
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
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      blocksRef.current    = []
      camTargetYRef.current = 4
    }
  }, [])

  // ── Exposed API ───────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    dropBlock: (_offsetX, alignScore) => {
      const scene = sceneRef.current
      if (!scene) return

      const prev     = blocksRef.current[blocksRef.current.length - 1]
      const prevSize = prev ? prev.size : BASE_SIZE
      // Each block is alignScore × the previous block's size, minimum 2 % of BASE_SIZE
      const newSize  = Math.max(MIN_SIZE, prevSize * alignScore)

      const yIndex  = blocksRef.current.length   // 0 = base already placed
      const targetY = yIndex * BLOCK_H

      const hue  = alignScore * 120   // red (0°) → green (120°)
      const color = new THREE.Color(`hsl(${hue}, 72%, 55%)`)

      const geometry = new THREE.BoxGeometry(newSize, BLOCK_H, newSize)
      const material = new THREE.MeshLambertMaterial({ color })
      const mesh     = new THREE.Mesh(geometry, material)

      // Start 20 units above final position — lerps down in the render loop
      mesh.position.set(0, targetY + 20, 0)
      scene.add(mesh)

      blocksRef.current.push({ mesh, size: newSize, targetY })

      // Pan camera up to keep the latest block in view
      camTargetYRef.current = targetY + 6
    },

    resetBlocks: () => {
      const scene = sceneRef.current
      if (!scene) return

      // Remove all blocks except the base (index 0)
      for (let i = 1; i < blocksRef.current.length; i++) {
        scene.remove(blocksRef.current[i].mesh)
        blocksRef.current[i].mesh.geometry.dispose()
        blocksRef.current[i].mesh.material.dispose()
      }
      blocksRef.current    = blocksRef.current.slice(0, 1)
      camTargetYRef.current = 4
    },

    panToBase: () => { camTargetYRef.current = 4 },

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
