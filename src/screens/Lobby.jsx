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

    const interval = setInterval(() => {
      const currentRoom = getRoom(roomCode)
      if (currentRoom) {
        setRoom(currentRoom)
        const player1Ready = currentRoom.player1?.ready || false
        const player2Ready = currentRoom.player2?.ready || false
        if (player1Ready && player2Ready && currentRoom.player2) {
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-gray-500 text-sm"
        >
          Loading room...
        </motion.p>
      </div>
    )
  }

  const player1 = room.player1
  const player2 = room.player2
  const isPlayer1 = player1?.id === myPlayerId
  const myPlayer = isPlayer1 ? player1 : player2
  const otherPlayer = isPlayer1 ? player2 : player1

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-gray-500 text-sm tracking-wider mb-5">Two players</p>
          <h1 className="font-serif text-5xl text-white leading-tight">
            Alignment<br />
            <span className="italic">Tower</span>
          </h1>
        </div>

        {/* Room code card */}
        <div className="bg-[#111] rounded-2xl p-6 mb-4 text-center">
          <p className="text-gray-500 text-xs tracking-widest uppercase mb-3">Room Code</p>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-white text-4xl font-bold tracking-wider font-mono">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-gray-500 hover:text-white transition-colors"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-gray-600 text-sm">Share this with one person</p>
        </div>

        {/* Player rows */}
        <div className="space-y-2 mb-6">
          {/* Me */}
          <div className="bg-[#111] rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white text-sm font-medium">{myPlayer?.name}</span>
            </div>
            <span className="text-gray-500 text-sm">you</span>
          </div>

          {/* Partner */}
          {player2 ? (
            <div className="bg-[#111] rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white text-sm font-medium">{otherPlayer?.name || 'Partner'}</span>
              </div>
              {otherPlayer?.ready && (
                <span className="text-green-400 text-sm">Ready</span>
              )}
            </div>
          ) : (
            <div className="bg-[#111] rounded-2xl px-5 py-4 flex items-center gap-3">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-gray-600"
              />
              <span className="text-gray-500 text-sm">Waiting for partner...</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="space-y-3">
          {!isReady ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleReady}
              disabled={!player2}
              className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base disabled:bg-[#111] disabled:text-gray-600 transition-colors"
            >
              {player2 ? 'Start game' : 'Waiting for player 2...'}
            </motion.button>
          ) : (
            <div className="w-full bg-[#111] text-green-400 rounded-2xl px-6 py-4 font-medium text-base text-center">
              ✓ Ready
            </div>
          )}

          <button
            onClick={handleLeave}
            className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition-colors"
          >
            Leave room
          </button>
        </div>

        {/* Waiting for partner */}
        {isReady && (!otherPlayer || !otherPlayer.ready) && (
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center text-gray-500 text-sm mt-6"
          >
            Waiting for {otherPlayer?.name || 'partner'} to be ready...
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
