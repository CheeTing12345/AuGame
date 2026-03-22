import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  myPlayer,
  usePlayersList,
  useMultiplayerState,
  useIsHost,
} from 'playroomkit'

const RULES = [
  {
    icon: '❓',
    title: 'Answer honestly',
    body: 'Each question has a 5-point scale. Pick the option that feels most like you — no right or wrong.',
  },
  {
    icon: '🧱',
    title: 'Build together',
    body: 'The closer your answers, the more centered the block drops. Big differences mean it lands off-center.',
  },
  {
    icon: '⚠️',
    title: 'Keep it balanced',
    body: "If the tower leans too far and collapses, it resets — but the game keeps going.",
  },
  {
    icon: '🏆',
    title: 'See how you stack up',
    body: "After all questions, you'll see your final tower and how aligned you were.",
  },
]

export default function Rules() {
  const navigate = useNavigate()
  const players = usePlayersList(true)
  const isHost = useIsHost()
  const me = myPlayer()

  const [understood, setUnderstood] = useMultiplayerState('rulesUnderstood', false)

  useEffect(() => {
    try { myPlayer() } catch { navigate('/create-join') }
  }, [navigate])

  // Navigate to game once both players have accepted
  useEffect(() => {
    if (understood) navigate('/game')
  }, [understood, navigate])

  // Host checks when both players marked ready
  useEffect(() => {
    if (!isHost) return
    const allGood = players.length === 2 && players.every(p => p.getState('rulesOk'))
    if (allGood) setUnderstood(true, true)
  }, [players, isHost, setUnderstood])

  const myOk = me?.getState('rulesOk')

  const handleUnderstood = () => {
    me.setState('rulesOk', true)
  }

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 40 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <h2 className="font-serif" style={{ fontSize: 32, color: 'var(--text-1)', marginBottom: 8 }}>
            How it works
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
            Read through before you start building
          </p>
        </div>

        {/* Rules list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {RULES.map((rule, i) => (
            <motion.div
              key={i}
              className="card"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{rule.icon}</span>
              <div>
                <p style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {rule.title}
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>
                  {rule.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action */}
        {!myOk ? (
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleUnderstood}
            style={{ background: 'var(--violet)', color: '#fff' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Understood — let's build!
          </motion.button>
        ) : (
          <div>
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
              marginBottom: 12,
            }}>
              ✓ Got it
            </div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}
            >
              Waiting for your partner...
            </motion.p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
