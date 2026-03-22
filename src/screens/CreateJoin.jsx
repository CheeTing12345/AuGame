import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { createRoom, joinRoom } from '../utils/room'

export default function CreateJoin() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  const playerName = localStorage.getItem('playerName') || 'Player'

  const handleCreateRoom = () => {
    try {
      const { code } = createRoom(playerName)
      localStorage.setItem('currentRoomCode', code)
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return
    try {
      joinRoom(roomCode.toUpperCase().trim(), playerName)
      localStorage.setItem('currentRoomCode', roomCode.toUpperCase().trim())
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-gray-500 text-sm tracking-wider mb-5">Two players</p>
          <h1 className="font-serif text-5xl text-white leading-tight mb-8">
            Alignment<br />
            <span className="italic">Tower</span>
          </h1>
          <p className="text-gray-500 text-sm">Signed in as</p>
          <p className="text-white font-semibold mt-1">{playerName}</p>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mb-5"
          >
            {error}
          </motion.p>
        )}

        {/* Create room */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateRoom}
          className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base mb-6"
        >
          Create room
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Join with code */}
        <div className="space-y-3">
          <p className="text-white font-semibold text-base">Join with code</p>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase())
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder="ROOM CODE"
            className="w-full bg-[#111] text-white rounded-2xl px-6 py-4 text-base placeholder-gray-600 focus:outline-none uppercase tracking-widest text-center font-mono"
            maxLength={6}
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            className="w-full bg-[#111] text-gray-400 rounded-2xl px-6 py-4 font-medium text-base disabled:text-gray-700 transition-colors"
          >
            Join room
          </motion.button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full text-gray-600 text-sm mt-6 py-2 hover:text-gray-400 transition-colors"
        >
          ← Back
        </button>
      </motion.div>
    </div>
  )
}
