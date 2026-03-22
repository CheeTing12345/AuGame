import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'

const GRAVITY = 0.4  // Gentler gravity
const FRICTION = 0.98
const ANGULAR_FRICTION = 0.95
const RESTITUTION = 0.2  // Less bouncy
const CONTAINER_WIDTH = 400
const CONTAINER_HEIGHT = 600
const GROUND_Y = CONTAINER_HEIGHT - 50
const BLOCK_WIDTH = 120
const BLOCK_HEIGHT = 30
const WALL_THICKNESS = 10

const PhysicsTower = forwardRef(({ onTowerFall, isActive }, ref) => {
  const [blocks, setBlocks] = useState([])
  const [hasFallen, setHasFallen] = useState(false)
  const blocksRef = useRef([])
  const animationFrameRef = useRef()

  useImperativeHandle(ref, () => ({
    dropBlock: (offsetX, alignmentScore) => {
      const hue = alignmentScore * 120
      
      const newBlock = {
        id: Date.now(),
        x: CONTAINER_WIDTH / 2 + offsetX * 50,
        y: 50,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        rotation: 0,
        velocityX: 0,
        velocityY: 0,
        angularVelocity: 0,  // FIXED: Start with NO rotation
        color: `hsl(${hue}, 70%, 50%)`,
        mass: 1,
        isFalling: true,  // FIXED: Track if block is in free fall
      }

      blocksRef.current = [...blocksRef.current, newBlock]
      setBlocks(blocksRef.current)
    },
  }))

  const checkAABBCollision = (block1, block2) => {
    const hw1 = block1.width / 2
    const hh1 = block1.height / 2
    const hw2 = block2.width / 2
    const hh2 = block2.height / 2

    return (
      Math.abs(block1.x - block2.x) < hw1 + hw2 &&
      Math.abs(block1.y + hh1 - (block2.y + hh2)) < hh1 + hh2
    )
  }

  const resolveCollision = (block1, block2) => {
    const dx = block1.x - block2.x
    const dy = (block1.y + block1.height / 2) - (block2.y + block2.height / 2)
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return { block1, block2 }

    const nx = dx / distance
    const ny = dy / distance
    
    if (Math.abs(ny) > Math.abs(nx)) {
      // Vertical collision (stacking)
      if (block1.y < block2.y) {
        // block1 is on top
        block1.y = block2.y - block1.height
        block1.isFalling = false  // FIXED: No longer falling
        
        const relativeVelocityY = block1.velocityY - block2.velocityY
        if (relativeVelocityY > 0) {
          const impulse = -(1 + RESTITUTION) * relativeVelocityY / 2
          block1.velocityY += impulse
          block2.velocityY -= impulse
          
          // FIXED: Only add rotation AFTER collision based on offset
          const offsetX = block1.x - block2.x
          block1.angularVelocity = offsetX * 0.005  // Much gentler rotation
          block2.angularVelocity -= offsetX * 0.002
        }
      } else {
        block2.y = block1.y - block2.height
        block2.isFalling = false
        
        const relativeVelocityY = block2.velocityY - block1.velocityY
        if (relativeVelocityY > 0) {
          const impulse = -(1 + RESTITUTION) * relativeVelocityY / 2
          block2.velocityY += impulse
          block1.velocityY -= impulse
          
          const offsetX = block2.x - block1.x
          block2.angularVelocity = offsetX * 0.005
          block1.angularVelocity -= offsetX * 0.002
        }
      }
    } else {
      // Horizontal collision
      const overlap = (block1.width / 2 + block2.width / 2) - Math.abs(dx)
      const separation = (overlap / 2) * Math.sign(dx)
      block1.x += separation
      block2.x -= separation
      
      const relativeVelocityX = block1.velocityX - block2.velocityX
      const impulse = -(1 + RESTITUTION) * relativeVelocityX / 2
      block1.velocityX += impulse
      block2.velocityX -= impulse
    }

    return { block1, block2 }
  }

  useEffect(() => {
    if (!isActive) return

    const simulate = () => {
      let updatedBlocks = blocksRef.current.map((block) => {
        let newVelocityY = block.velocityY + GRAVITY
        let newVelocityX = block.velocityX * FRICTION
        
        // FIXED: Only apply angular friction if NOT falling
        // Blocks falling straight down should have NO rotation
        let newAngularVelocity = block.isFalling ? 0 : block.angularVelocity * ANGULAR_FRICTION

        return {
          ...block,
          x: block.x + newVelocityX,
          y: block.y + newVelocityY,
          rotation: block.rotation + newAngularVelocity,
          velocityX: newVelocityX,
          velocityY: newVelocityY,
          angularVelocity: newAngularVelocity,
        }
      })

      // Ground collision
      updatedBlocks = updatedBlocks.map((block) => {
        if (block.y + block.height >= GROUND_Y) {
          const newBlock = { ...block }
          newBlock.y = GROUND_Y - block.height
          newBlock.isFalling = false  // FIXED: On ground, not falling
          
          if (Math.abs(newBlock.velocityY) > 0.5) {
            newBlock.velocityY = -newBlock.velocityY * RESTITUTION
          } else {
            newBlock.velocityY = 0
          }
          
          newBlock.velocityX *= 0.95
          newBlock.angularVelocity *= 0.9
          
          return newBlock
        }
        return block
      })

      // Wall collision
      updatedBlocks = updatedBlocks.map((block) => {
        const newBlock = { ...block }
        const leftBound = WALL_THICKNESS + block.width / 2
        const rightBound = CONTAINER_WIDTH - WALL_THICKNESS - block.width / 2
        
        if (newBlock.x < leftBound) {
          newBlock.x = leftBound
          newBlock.velocityX = -newBlock.velocityX * RESTITUTION
        }
        if (newBlock.x > rightBound) {
          newBlock.x = rightBound
          newBlock.velocityX = -newBlock.velocityX * RESTITUTION
        }
        
        return newBlock
      })

      // Block-to-block collisions
      for (let i = 0; i < updatedBlocks.length; i++) {
        for (let j = i + 1; j < updatedBlocks.length; j++) {
          if (checkAABBCollision(updatedBlocks[i], updatedBlocks[j])) {
            const result = resolveCollision(updatedBlocks[i], updatedBlocks[j])
            updatedBlocks[i] = result.block1
            updatedBlocks[j] = result.block2
          }
        }
      }

      blocksRef.current = updatedBlocks
      setBlocks([...updatedBlocks])

      // Check for tower fall - more lenient
      const fallen = updatedBlocks.some(
        (block) => block.y > GROUND_Y + 100 || Math.abs(block.rotation) > 80
      )
      
      if (fallen && !hasFallen) {
        setHasFallen(true)
        onTowerFall()
      }

      animationFrameRef.current = requestAnimationFrame(simulate)
    }

    animationFrameRef.current = requestAnimationFrame(simulate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, hasFallen, onTowerFall])

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
      <div 
        className="relative bg-gray-950 rounded-3xl border-2 border-gray-800"
        style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}
      >
        <div className="absolute left-0 top-0 bottom-0 bg-gray-800/30" style={{ width: WALL_THICKNESS }} />
        <div className="absolute right-0 top-0 bottom-0 bg-gray-800/30" style={{ width: WALL_THICKNESS }} />
        <div
          className="absolute w-full h-2 bg-gradient-to-t from-gray-700 to-gray-800"
          style={{ bottom: CONTAINER_HEIGHT - GROUND_Y }}
        />

        {blocks.map((block) => (
          <div
            key={block.id}
            className="absolute"
            style={{
              left: block.x - block.width / 2,
              top: block.y,
              width: block.width,
              height: block.height,
              transform: `rotate(${block.rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <div
              className="absolute inset-0 rounded blur-sm opacity-30"
              style={{
                backgroundColor: block.color,
                transform: 'translateY(2px)',
              }}
            />
            
            <div
              className="absolute inset-0 rounded"
              style={{
                background: `linear-gradient(135deg, ${block.color} 0%, ${block.color}dd 100%)`,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
                }}
              />
            </div>
          </div>
        ))}

        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-800">
          <p className="text-gray-400 text-xs">Blocks</p>
          <p className="text-white text-xl font-bold">{blocks.length}</p>
        </div>
      </div>
    </div>
  )
})

PhysicsTower.displayName = 'PhysicsTower'

export default PhysicsTower
