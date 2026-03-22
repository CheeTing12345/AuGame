import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  myPlayer,
  usePlayersList,
  useMultiplayerState,
  useIsHost,
  getRoomCode,
} from 'playroomkit'

export default function Lobby() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const players = usePlayersList(true)
  const isHost = useIsHost()
  const [gameStarted, setGameStarted] = useMultiplayerState('gameStarted', false)

  const me = myPlayer()
  const roomCode = getRoomCode()

  // Guard: if Playroom isn't initialized navigate back
  useEffect(() => {
    try {
      myPlayer()
    } catch {
      navigate('/create-join')
    }
  }, [navigate])

  // Auto-navigate when host starts game
  useEffect(() => {
    if (gameStarted) navigate('/game')
  }, [gameStarted, navigate])

  // Both players ready → host starts game
  useEffect(() => {
    if (!isHost) return
    if (players.length === 2 && players.every(p => p.getState('ready'))) {
      setGameStarted(true, true)
    }
  }, [players, isHost, setGameStarted])

  const handleReady = () => {
    me.setState('ready', true)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = () => {
    me.leaveRoom?.()
    navigate('/create-join')
  }

  const myState = me?.getState('ready')
  const partner = players.find(p => p.id !== me?.id)

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
              <span className="text-white text-sm font-medium">
                {me?.getState('name') || 'You'}
              </span>
            </div>
            <span className="text-gray-500 text-sm">you</span>
          </div>

          {/* Partner */}
          {partner ? (
            <div className="bg-[#111] rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white text-sm font-medium">
                  {partner.getState('name') || 'Partner'}
                </span>
              </div>
              {partner.getState('ready') && (
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
          {!myState ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleReady}
              disabled={!partner}
              className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base disabled:bg-[#111] disabled:text-gray-600 transition-colors"
            >
              {partner ? 'Start game' : 'Waiting for player 2...'}
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

        {/* Waiting for partner to be ready */}
        {myState && partner && !partner.getState('ready') && (
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center text-gray-500 text-sm mt-6"
          >
            Waiting for {partner.getState('name') || 'partner'} to be ready...
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
