import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { getRoom, updatePlayerReady } from '../utils/room'

export default function Lobby() {
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [copied, setCopied] = useState(false)

  const roomCode = localStorage.getItem('currentRoomCode')
  const myPlayerId = localStorage.getItem('playerId')

  useEffect(() => {
    if (!roomCode) {
      navigate('/create-join')
      return
    }

    // Poll for room updates
    const interval = setInterval(() => {
      const currentRoom = getRoom(roomCode)
      if (currentRoom) {
        setRoom(currentRoom)
        
        // Check if both players are ready
        const player1Ready = currentRoom.player1?.ready || false
        const player2Ready = currentRoom.player2?.ready || false
        
        if (player1Ready && player2Ready && currentRoom.player2) {
          // Both ready, start game!
          navigate('/game')
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [roomCode, navigate])

  const handleReady = () => {
    if (!room) return
    
    setIsReady(true)
    updatePlayerReady(roomCode, myPlayerId, true)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = () => {
    localStorage.removeItem('currentRoomCode')
    navigate('/create-join')
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-6">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white text-xl"
        >
          Loading room...
        </motion.div>
      </div>
    )
  }

  const player1 = room.player1
  const player2 = room.player2
  const isPlayer1 = player1?.id === myPlayerId
  const myPlayer = isPlayer1 ? player1 : player2
  const otherPlayer = isPlayer1 ? player2 : player1

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Room Code Card */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-2 border-gray-700 rounded-3xl p-8 mb-8">
          <p className="text-gray-400 text-sm mb-3 text-center">Room Code</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl font-bold font-mono tracking-widest text-white"
            >
              {roomCode}
            </motion.div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyCode}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-6 py-3 font-medium transition-all border border-blue-500/30"
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </motion.button>
        </div>

        {/* Players Card */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-2 border-gray-700 rounded-3xl p-8 mb-8">
          <h3 className="text-white text-xl font-bold mb-6 text-center">Players</h3>
          
          <div className="space-y-4">
            {/* Player 1 */}
            <div className={`flex items-center justify-between p-5 rounded-2xl border-2 ${
              player1?.ready 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-gray-800/50 border-gray-700'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  player1?.ready ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {player1?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-semibold">{player1?.name}</div>
                  <div className="text-sm text-gray-400">Player 1</div>
                </div>
              </div>
              {player1?.ready && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-400 font-bold"
                >
                  ✓ Ready
                </motion.div>
              )}
            </div>

            {/* Player 2 */}
            {player2 ? (
              <div className={`flex items-center justify-between p-5 rounded-2xl border-2 ${
                player2?.ready 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-gray-800/50 border-gray-700'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    player2?.ready ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {player2?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{player2?.name}</div>
                    <div className="text-sm text-gray-400">Player 2</div>
                  </div>
                </div>
                {player2?.ready && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-400 font-bold"
                  >
                    ✓ Ready
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-700">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-gray-500 text-2xl"
                    >
                      ?
                    </motion.div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-semibold">Waiting for player...</div>
                    <div className="text-sm text-gray-600">Share the room code</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {!isReady ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReady}
              disabled={!player2}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl px-8 py-5 font-bold text-lg disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all shadow-2xl shadow-purple-500/40 disabled:shadow-none"
            >
              {player2 ? "I'm Ready!" : 'Waiting for Player 2...'}
            </motion.button>
          ) : (
            <div className="w-full bg-green-500/20 border-2 border-green-500/30 text-green-400 rounded-2xl px-8 py-5 font-bold text-lg text-center">
              ✓ You're Ready!
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLeave}
            className="w-full text-gray-500 text-base hover:text-gray-300 transition-colors py-3"
          >
            Leave Room
          </motion.button>
        </div>

        {/* Waiting message */}
        {isReady && (!otherPlayer || !otherPlayer.ready) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8"
          >
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-gray-400"
            >
              Waiting for {otherPlayer ? otherPlayer.name : 'partner'} to be ready...
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
