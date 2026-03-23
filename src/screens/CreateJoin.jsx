import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { insertCoin, myPlayer } from 'playroomkit'

// Letters only — exclude I and O to avoid confusion with 1 and 0
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
function generateRoomCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')
}

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
      await insertCoin({ maxPlayersPerRoom: 2, skipLobby: true, roomCode: generateRoomCode() })
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

  const sectionLabel = {
    color: 'var(--text-2)',
    fontSize: 13,
    fontWeight: 500,
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
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '-0.01em' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={sectionLabel}>Start a new session</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
          >
            Create room
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={sectionLabel}>or join one</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Join with code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          <input
            className="input"
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder="ROOM CODE"
            maxLength={4}
            style={{
              textAlign: 'center',
              letterSpacing: '0.3em',
              fontFamily: 'monospace',
              fontSize: 28,
              fontWeight: 700,
            }}
          />
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            style={roomCode.trim() ? { background: 'var(--violet)', color: '#fff' } : {}}
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
