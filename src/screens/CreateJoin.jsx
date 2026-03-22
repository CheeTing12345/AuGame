import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { createRoom, joinRoom } from '../utils/room'

export default function CreateJoin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'create' or 'join'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    try {
      const { code } = createRoom(playerName.trim())
      localStorage.setItem('currentRoomCode', code)
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    if (!roomCode.trim()) {
      setError('Please enter room code')
      return
    }

    try {
      joinRoom(roomCode.toUpperCase().trim(), playerName.trim())
      localStorage.setItem('currentRoomCode', roomCode.toUpperCase().trim())
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    }
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-12">
            <h1 className="text-white text-4xl font-bold mb-3">Choose Mode</h1>
            <p className="text-gray-400 text-base">
              Create a new room or join an existing one
            </p>
          </div>

          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('create')}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl px-8 py-6 font-bold text-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all shadow-2xl shadow-purple-500/40"
            >
              <div className="text-xl mb-1">Create Room</div>
              <div className="text-sm opacity-80 font-normal">Get a code to share</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('join')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-2xl px-8 py-6 font-bold text-lg transition-all border-2 border-gray-700 hover:border-gray-600"
            >
              <div className="text-xl mb-1">Join Room</div>
              <div className="text-sm opacity-70 font-normal">Enter a room code</div>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="w-full mt-8 text-gray-500 text-base hover:text-gray-300 transition-colors py-3"
          >
            ← Back to Home
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // Create room screen
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence>
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <div className="mb-10">
              <h2 className="text-white text-4xl font-bold mb-3">Create Room</h2>
              <p className="text-gray-400 text-base">
                Enter your name to generate a room code
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 mb-6"
              >
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-3">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value)
                    setError('')
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                  placeholder="Enter your name"
                  className="w-full bg-gray-900/50 border-2 border-gray-800 rounded-xl px-6 py-4 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                  autoFocus
                  maxLength={20}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateRoom}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl px-8 py-5 font-bold text-lg disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-2xl shadow-purple-500/40 disabled:shadow-none"
              >
                Create Room
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setMode(null)
                  setError('')
                  setPlayerName('')
                }}
                className="w-full text-gray-500 text-base hover:text-gray-300 transition-colors py-3"
              >
                ← Back
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // Join room screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-6 py-12">
      <AnimatePresence>
        <motion.div
          key="join"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-white text-4xl font-bold mb-3">Join Room</h2>
            <p className="text-gray-400 text-base">
              Enter the code shared by your partner
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 mb-6"
            >
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </motion.div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-3">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  setError('')
                }}
                placeholder="Enter your name"
                className="w-full bg-gray-900/50 border-2 border-gray-800 rounded-xl px-6 py-4 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                maxLength={20}
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium block mb-3">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  setError('')
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="ABC123"
                className="w-full bg-gray-900/50 border-2 border-gray-800 rounded-xl px-6 py-4 text-white text-2xl placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all uppercase tracking-widest text-center font-mono font-bold"
                maxLength={6}
                autoFocus
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || !roomCode.trim()}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl px-8 py-5 font-bold text-lg disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-2xl shadow-purple-500/40 disabled:shadow-none"
            >
              Join Room
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMode(null)
                setError('')
                setPlayerName('')
                setRoomCode('')
              }}
              className="w-full text-gray-500 text-base hover:text-gray-300 transition-colors py-3"
            >
              ← Back
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
