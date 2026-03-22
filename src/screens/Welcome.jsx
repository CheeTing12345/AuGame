import { useNavigate } from 'react-router'
import { motion } from 'motion/react'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-sm tracking-widest mb-4 uppercase"
          >
            Two Player Game
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white text-6xl md:text-7xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Alignment
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white text-6xl md:text-7xl font-bold italic mb-6"
            style={{
              background: 'linear-gradient(135deg, #f472b6, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tower
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto"
          >
            Build a tower by finding alignment with your partner through philosophical questions
          </motion.p>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create-join')}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl px-8 py-5 font-bold text-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all shadow-2xl shadow-purple-500/50 relative overflow-hidden group"
          >
            <span className="relative z-10">Start Game</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-16 space-y-3"
        >
          <p className="text-gray-500 text-sm">
            Answer questions • Compare viewpoints • Build together
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
