import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'

export default function Welcome() {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const handleContinue = () => {
    if (!name.trim()) return
    localStorage.setItem('playerName', name.trim())
    navigate('/create-join')
  }

  return (
    <div className="screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            marginBottom: 24,
          }}>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0.3, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: 8 + i * 6,
                  height: 28 + i * 10,
                  borderRadius: 4,
                  background: i === 0
                    ? 'var(--violet)'
                    : i === 1
                      ? 'var(--cyan)'
                      : 'var(--amber)',
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>

          <h1 className="font-serif" style={{
            fontSize: 42,
            color: 'var(--text-1)',
            lineHeight: 1.15,
            marginBottom: 8,
          }}>
            <span style={{ fontStyle: 'italic' }}>Common</span><br />
            <span style={{ fontStyle: 'italic' }}>Ground</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
            build it together
          </p>
        </div>

        {/* Name input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 2 }}>
            What's your name?
          </label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
          <motion.button
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={!name.trim()}
            style={{ marginTop: 4 }}
          >
            Continue
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
