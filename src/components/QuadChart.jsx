import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'

export default function QuadChart({
  axes,
  onAnswer,
  playerAnswer,
  partnerAnswer,
  interactive = false,
  showAnswers = false,
}) {
  const [position, setPosition] = useState(playerAnswer || null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (playerAnswer) {
      setPosition(playerAnswer)
    }
  }, [playerAnswer])

  const handleClick = (e) => {
    if (!interactive || !chartRef.current) return

    const rect = chartRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

    const newPosition = { x, y }
    setPosition(newPosition)
    onAnswer?.(x, y)
  }

  return (
    <div className="relative py-16 px-12">
      {/* Axes Labels - FIXED: More space, visible, won't clip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center w-64 z-10">
        <p className="text-gray-400 text-xs leading-tight px-2">{axes.top}</p>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center w-64 z-10">
        <p className="text-gray-400 text-xs leading-tight px-2">{axes.bottom}</p>
      </div>
      <div className="absolute top-1/2 left-2 -translate-y-1/2 text-right w-36 z-10">
        <p className="text-gray-400 text-xs leading-tight pr-2">{axes.left}</p>
      </div>
      <div className="absolute top-1/2 right-2 -translate-y-1/2 text-left w-36 z-10">
        <p className="text-gray-400 text-xs leading-tight pl-2">{axes.right}</p>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        onClick={handleClick}
        className={`relative w-72 h-72 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg ${
          interactive ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-gray-800" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-full bg-gray-800" />
        </div>

        {/* Player Answer */}
        {showAnswers && position && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-4 h-4 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ring-4 ring-blue-500/30"
            style={{
              left: `${((position.x + 1) / 2) * 100}%`,
              top: `${((-position.y + 1) / 2) * 100}%`,
            }}
          />
        )}

        {/* Partner Answer */}
        {showAnswers && partnerAnswer && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute w-4 h-4 bg-purple-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ring-4 ring-purple-500/30"
            style={{
              left: `${((partnerAnswer.x + 1) / 2) * 100}%`,
              top: `${((-partnerAnswer.y + 1) / 2) * 100}%`,
            }}
          />
        )}

        {/* Connection Line */}
        {showAnswers && position && partnerAnswer && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              x1={`${((position.x + 1) / 2) * 100}%`}
              y1={`${((-position.y + 1) / 2) * 100}%`}
              x2={`${((partnerAnswer.x + 1) / 2) * 100}%`}
              y2={`${((-partnerAnswer.y + 1) / 2) * 100}%`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {/* Interactive indicator */}
        {interactive && !position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-600 text-sm">Tap to place your answer</p>
          </div>
        )}

        {/* Current position indicator */}
        {interactive && position && !showAnswers && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ring-4 ring-white/30"
            style={{
              left: `${((position.x + 1) / 2) * 100}%`,
              top: `${((-position.y + 1) / 2) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}
