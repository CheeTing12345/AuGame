import { useEffect } from 'react'
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

  const players = usePlayersList(true)
  const isHost = useIsHost()
  const [gameStarted, setGameStarted] = useMultiplayerState('gameStarted', false)

  const me = myPlayer()
  const roomCode = getRoomCode()

  useEffect(() => {
    try { myPlayer() } catch { navigate('/create-join') }
  }, [navigate])

  // When host starts → navigate to rules (not /game)
  useEffect(() => {
    if (gameStarted) navigate('/rules')
  }, [gameStarted, navigate])

  // Both ready → host starts
  useEffect(() => {
    if (!isHost) return
    if (players.length === 2 && players.every(p => p.getState('ready'))) {
      setGameStarted(true, true)
    }
  }, [players, isHost, setGameStarted])

  const handleReady = () => me.setState('ready', true)

  const handleLeave = () => {
    me.leaveRoom?.()
    navigate('/create-join')
  }

  const myReady = me?.getState('ready')
  const partner = players.find(p => p.id !== me?.id)
  const partnerReady = partner?.getState('ready')

  return (
    <div className="screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Waiting room
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Share the code below with your partner
          </p>
        </div>

        {/* Room code */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Room Code
          </p>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              fontSize: 36,
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: '0.25em',
              color: 'var(--text-1)',
            }}>
              {roomCode}
            </span>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 12 }}>Share with one person</p>
        </div>

        {/* Players */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {/* Me */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ color: 'var(--text-1)', fontWeight: 500, fontSize: 15 }}>
                {me?.getState('name') || 'You'}
              </span>
            </div>
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>you</span>
          </div>

          {/* Partner */}
          {partner ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />
                <span style={{ color: 'var(--text-1)', fontWeight: 500, fontSize: 15 }}>
                  {partner.getState('name') || 'Partner'}
                </span>
              </div>
              {partnerReady && (
                <span style={{ color: 'var(--green)', fontSize: 13 }}>Ready ✓</span>
              )}
            </motion.div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)' }}
              />
              <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Waiting for partner...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!myReady ? (
            <motion.button
              className="btn-primary"
              whileTap={{ scale: 0.98 }}
              onClick={handleReady}
              disabled={!partner}
              style={partner ? { background: 'var(--violet)', color: '#fff' } : {}}
            >
              {partner ? "I'm ready!" : 'Waiting for player 2...'}
            </motion.button>
          ) : (
            <div style={{
              width: '100%',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: 'var(--green)',
              borderRadius: 16,
              padding: '16px 24px',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 16,
            }}>
              ✓ Ready
            </div>
          )}

          {/* Waiting label */}
          {myReady && partner && !partnerReady && (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}
            >
              Waiting for {partner.getState('name') || 'partner'} to ready up...
            </motion.p>
          )}

          <button className="btn-ghost" onClick={handleLeave}>Leave room</button>
        </div>
      </motion.div>
    </div>
  )
}
