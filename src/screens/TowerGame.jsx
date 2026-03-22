import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import PhysicsTower from '../components/PhysicsTower'
import QuadChart from '../components/QuadChart'
import { questions } from '../data/questions'
import { getRoom, submitAnswer, getPartnerAnswer, getMyPlayerNumber } from '../utils/room'

export default function TowerGame() {
  const navigate = useNavigate()
  const towerRef = useRef(null)
  const [gameState, setGameState] = useState('question')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [playerAnswer, setPlayerAnswer] = useState(null)
  const [partnerAnswer, setPartnerAnswer] = useState(null)
  const [distance, setDistance] = useState(0)
  const [isTowerActive, setIsTowerActive] = useState(true)
  const [waitingForPartner, setWaitingForPartner] = useState(false)

  const roomCode = localStorage.getItem('currentRoomCode')
  const myPlayerNumber = getMyPlayerNumber()
  const currentQuestion = questions[currentQuestionIndex]

  // Poll for partner's answer
  useEffect(() => {
    if (!roomCode || gameState !== 'answer' || !playerAnswer || partnerAnswer) return

    const interval = setInterval(() => {
      const partnerAns = getPartnerAnswer(roomCode, currentQuestionIndex, myPlayerNumber)
      if (partnerAns) {
        setPartnerAnswer(partnerAns)
        setWaitingForPartner(false)
        const dist = Math.sqrt(
          Math.pow(playerAnswer.x - partnerAns.x, 2) +
          Math.pow(playerAnswer.y - partnerAns.y, 2)
        )
        setDistance(dist)
        setGameState('review')
      }
    }, 500)

    return () => clearInterval(interval)
  }, [roomCode, gameState, playerAnswer, partnerAnswer, currentQuestionIndex, myPlayerNumber])

  const handleAnswer = (x, y) => {
    setPlayerAnswer({ x, y })
  }

  const handleSubmitAnswer = () => {
    if (!playerAnswer || !roomCode) return
    submitAnswer(roomCode, myPlayerNumber, currentQuestionIndex, playerAnswer)
    setWaitingForPartner(true)
    const partnerAns = getPartnerAnswer(roomCode, currentQuestionIndex, myPlayerNumber)
    if (partnerAns) {
      setPartnerAnswer(partnerAns)
      setWaitingForPartner(false)
      const dist = Math.sqrt(
        Math.pow(playerAnswer.x - partnerAns.x, 2) +
        Math.pow(playerAnswer.y - partnerAns.y, 2)
      )
      setDistance(dist)
      setGameState('review')
    }
  }

  const handleContinueToDrop = () => {
    const offsetX = (playerAnswer.x - partnerAnswer.x) / 2
    const alignmentScore = Math.max(0, 1 - distance / 2)
    towerRef.current?.dropBlock(offsetX, alignmentScore)
    setGameState('dropping')
    setTimeout(() => setGameState('checking'), 3000)
  }

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex >= questions.length) {
      setGameState('complete')
    } else {
      setCurrentQuestionIndex(nextIndex)
      setPlayerAnswer(null)
      setPartnerAnswer(null)
      setWaitingForPartner(false)
      setGameState('question')
    }
  }

  const handleTowerFall = () => {
    setGameState('failed')
    setIsTowerActive(false)
  }

  const getAlignmentScore = () => Math.max(0, Math.round((1 - distance / 2) * 100))

  const getAlignmentMessage = () => {
    if (distance < 0.5) return 'Perfect alignment'
    if (distance < 1.0) return 'Great minds think alike'
    if (distance < 1.5) return 'Close enough'
    return 'Interesting differences'
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Tower ONLY visible during dropping */}
      {gameState === 'dropping' && (
        <PhysicsTower
          ref={towerRef}
          onTowerFall={handleTowerFall}
          isActive={isTowerActive}
        />
      )}

      <AnimatePresence mode="wait">

        {/* ── Question ── */}
        {gameState === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center">
              {/* Progress */}
              <p className="text-gray-500 text-sm mb-3">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              <div className="flex gap-1.5 justify-center mb-10">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 flex-1 rounded-full transition-all ${
                      i <= currentQuestionIndex ? 'bg-white' : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>

              {/* Question number circle */}
              <div className="flex justify-center mb-8">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
                >
                  {currentQuestionIndex + 1}
                </div>
              </div>

              {/* Question text */}
              <h2 className="font-serif text-3xl text-white leading-snug mb-12 px-2">
                {currentQuestion.prompt}
              </h2>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setGameState('answer')}
                className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
              >
                Place your answer
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Answer ── */}
        {gameState === 'answer' && (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">
                Question {currentQuestionIndex + 1}
              </p>
              <h3 className="font-serif text-xl text-white leading-snug">{currentQuestion.prompt}</h3>
            </div>

            <QuadChart
              axes={currentQuestion.axes}
              onAnswer={handleAnswer}
              playerAnswer={playerAnswer}
              interactive={!waitingForPartner}
            />

            <div className="w-full max-w-sm space-y-3">
              {waitingForPartner ? (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-center text-gray-500 text-sm py-4"
                >
                  Waiting for your partner...
                </motion.p>
              ) : (
                <>
                  {playerAnswer && (
                    <p className="text-center text-gray-600 text-xs">Tap again to adjust</p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitAnswer}
                    disabled={!playerAnswer}
                    className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base disabled:bg-[#111] disabled:text-gray-600 transition-colors"
                  >
                    Submit answer
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Review ── */}
        {gameState === 'review' && playerAnswer && partnerAnswer && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">
                Question {currentQuestionIndex + 1}
              </p>
              <h3 className="font-serif text-xl text-white leading-snug mb-8">{currentQuestion.prompt}</h3>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <p className="text-white text-6xl font-bold mb-1">{getAlignmentScore()}%</p>
                <p className="text-gray-500 text-sm">{getAlignmentMessage()}</p>
              </motion.div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-6 text-xs mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-400">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-gray-400">Partner</span>
                </div>
              </div>
              <QuadChart
                axes={currentQuestion.axes}
                playerAnswer={playerAnswer}
                partnerAnswer={partnerAnswer}
                showAnswers={true}
              />
            </div>

            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinueToDrop}
              className="w-full max-w-sm bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
            >
              Drop block
            </motion.button>
          </motion.div>
        )}

        {/* ── Dropping ── */}
        {gameState === 'dropping' && (
          <motion.div
            key="dropping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
          >
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white text-xl font-medium mb-1"
            >
              Watch the tower...
            </motion.p>
            <p className="text-gray-600 text-sm">Block is falling</p>
          </motion.div>
        )}

        {/* ── Checking (tower stands) ── */}
        {gameState === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <p className="text-gray-500 text-sm mb-4">
                  {currentQuestionIndex + 1} block{currentQuestionIndex !== 0 ? 's' : ''} stacked
                </p>
                <h2 className="font-serif text-4xl text-white mb-2">Tower stands!</h2>
                <p className="text-gray-500 text-sm">The tower holds strong</p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextQuestion}
                className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
              >
                {currentQuestionIndex + 1 >= questions.length ? 'Finish game' : 'Next question'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Complete ── */}
        {gameState === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-4">Game complete</p>
                <h2 className="font-serif text-4xl text-white mb-2">Congratulations!</h2>
                <p className="text-gray-500 text-sm">You answered all {questions.length} questions</p>
              </div>

              <div className="bg-[#111] rounded-2xl p-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Final Tower</p>
                <p className="text-white text-6xl font-bold mb-1">{questions.length}</p>
                <p className="text-gray-500 text-sm">blocks stacked</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.reload()}
                  className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
                >
                  Play again
                </motion.button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition-colors"
                >
                  Back to home
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Failed ── */}
        {gameState === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-4">
                  {currentQuestionIndex + 1} block{currentQuestionIndex !== 0 ? 's' : ''} placed
                </p>
                <h2 className="font-serif text-4xl text-white mb-2">Tower Collapsed</h2>
                <p className="text-gray-500 text-sm">Better luck next time</p>
              </div>

              <div className="bg-[#111] rounded-2xl p-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Blocks Placed</p>
                <p className="text-white text-6xl font-bold mb-1">{currentQuestionIndex + 1}</p>
                <p className="text-gray-600 text-sm">out of {questions.length}</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.reload()}
                  className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
                >
                  Try again
                </motion.button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition-colors"
                >
                  Back to home
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
