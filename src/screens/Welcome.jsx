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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Title */}
        <div className="text-center mb-16">
          <p className="text-gray-500 text-sm tracking-wider mb-5">Two players</p>
          <h1 className="font-serif text-5xl text-white leading-tight">
            Alignment<br />
            <span className="italic">Tower</span>
          </h1>
        </div>

        {/* Name input + Continue */}
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            placeholder="Your name"
            className="w-full bg-[#111] text-white rounded-2xl px-6 py-4 text-base placeholder-gray-600 focus:outline-none"
            maxLength={20}
            autoFocus
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={!name.trim()}
            className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base disabled:bg-[#111] disabled:text-gray-600 transition-colors"
          >
            Continue
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
