import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { insertCoin, myPlayer } from 'playroomkit'

export default function CreateJoin() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const playerName = localStorage.getItem('playerName') || 'Player'

  const handleCreateRoom = async () => {
    setLoading(true)
    setError('')
    try {
      await insertCoin({ maxPlayersPerRoom: 2, skipLobby: true })
      myPlayer().setState('name', playerName)
      navigate('/lobby')
    } catch {
      setError('Could not create room. Try again.')
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return
    setLoading(true)
    setError('')
    try {
      await insertCoin({
        maxPlayersPerRoom: 2,
        skipLobby: true,
        roomCode: roomCode.toUpperCase().trim(),
      })
      myPlayer().setState('name', playerName)
      navigate('/lobby')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('ROOM_LIMIT_EXCEEDED')) {
        setError('Room is full.')
      } else {
        setError('Could not join. Check the code and try again.')
      }
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <p className="pulse" style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Connecting...
        </p>
      </div>
    )
  }

  return (
    <div className="screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h2 className="font-serif" style={{ fontSize: 32, color: 'var(--text-1)', marginBottom: 6 }}>
            Let's play
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Playing as <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{playerName}</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: 'var(--danger)',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 16,
              padding: '10px 16px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </motion.p>
        )}

        {/* Create room */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 10 }}>
            Start a new session
          </p>
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
          >
            Create room
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>or join one</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Join with code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          <input
            className="input"
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase())
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder="ROOM CODE"
            maxLength={6}
            style={{
              textAlign: 'center',
              letterSpacing: '0.2em',
              fontFamily: 'monospace',
              fontSize: 22,
              fontWeight: 700,
            }}
          />
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            style={{ background: roomCode.trim() ? 'var(--violet)' : undefined, color: roomCode.trim() ? '#fff' : undefined }}
          >
            Join room
          </motion.button>
        </div>

        <button className="btn-ghost" onClick={() => navigate('/')}>
          ← Back
        </button>
      </motion.div>
    </div>
  )
}
