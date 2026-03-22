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
        
        // Calculate distance
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

    // Submit my answer
    submitAnswer(roomCode, myPlayerNumber, currentQuestionIndex, playerAnswer)
    setWaitingForPartner(true)
    
    // Check if partner already answered
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
    
    setTimeout(() => {
      setGameState('checking')
    }, 3000)
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

  const getAlignmentScore = () => {
    return Math.max(0, Math.round((1 - distance / 2) * 100))
  }

  const getAlignmentMessage = () => {
    if (distance < 0.5) return "Perfect alignment! 🎯"
    if (distance < 1.0) return "Great minds think alike 🤝"
    if (distance < 1.5) return "Close enough 👍"
    return "Interesting differences 🤔"
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
        {/* Question */}
        {gameState === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex items-center justify-center px-6"
          >
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <p className="text-gray-500 text-sm mb-2">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
                <div className="flex gap-1 justify-center mb-6">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-1 rounded-full transition-all ${
                        i === currentQuestionIndex ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                        i < currentQuestionIndex ? 'bg-green-500' : 'bg-gray-800'
                      }`}
                    />
                  ))}
                </div>
                <h2 className="text-white text-2xl font-bold leading-relaxed mb-8">
                  {currentQuestion.prompt}
                </h2>
              </div>

              <button
                onClick={() => setGameState('answer')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
              >
                Place your answer
              </button>
            </div>
          </motion.div>
        )}

        {/* Answer */}
        {gameState === 'answer' && (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex flex-col items-center justify-between px-6 py-8"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">Question {currentQuestionIndex + 1}</p>
              <h3 className="text-white text-lg font-medium">{currentQuestion.prompt}</h3>
            </div>

            <QuadChart
              axes={currentQuestion.axes}
              onAnswer={handleAnswer}
              playerAnswer={playerAnswer}
              interactive={!waitingForPartner}
            />

            <div className="w-full max-w-sm space-y-3">
              {waitingForPartner ? (
                <div className="text-center py-4">
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-gray-400 text-sm"
                  >
                    Waiting for your partner...
                  </motion.p>
                </div>
              ) : (
                <>
                  {playerAnswer && (
                    <p className="text-center text-gray-500 text-sm">Tap again to adjust</p>
                  )}
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!playerAnswer}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 transition-all shadow-lg shadow-purple-500/20"
                  >
                    Submit answer
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Review */}
        {gameState === 'review' && playerAnswer && partnerAnswer && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex flex-col items-center justify-between px-6 py-8"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">Question {currentQuestionIndex + 1}</p>
              <h3 className="text-white text-lg font-medium mb-6">{currentQuestion.prompt}</h3>
              
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-purple-500/30">
                  <span className="text-white text-3xl font-bold">{getAlignmentScore()}%</span>
                </div>
                <p className="text-white text-lg mb-6">{getAlignmentMessage()}</p>
              </motion.div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                  <span className="text-gray-400">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleContinueToDrop}
              className="w-full max-w-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
            >
              Drop block
            </motion.button>
          </motion.div>
        )}

        {/* Dropping */}
        {gameState === 'dropping' && (
          <motion.div
            key="dropping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white text-2xl font-bold mb-2"
            >
              Watch the tower...
            </motion.p>
            <p className="text-gray-500 text-sm">Block is falling</p>
          </motion.div>
        )}

        {/* Checking */}
        {gameState === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/30">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-white text-3xl font-bold mb-2">Tower stands!</h2>
                <p className="text-gray-400 text-lg">
                  {currentQuestionIndex + 1} block{currentQuestionIndex !== 0 ? 's' : ''} stacked
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleNextQuestion}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
              >
                {currentQuestionIndex + 1 >= questions.length ? 'Finish game' : 'Next question'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Complete */}
        {gameState === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <h1 className="text-white text-5xl font-bold mb-4">🎉</h1>
              <h2 className="text-white text-4xl font-bold">Congratulations!</h2>
              <p className="text-gray-400 text-lg">You completed all {questions.length} questions</p>

              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
                <p className="text-gray-400 text-sm mb-2">Final Tower</p>
                <p className="text-white text-6xl font-bold mb-2">{questions.length}</p>
                <p className="text-gray-400 text-sm">blocks stacked</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
                >
                  Play again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-400 rounded-lg px-6 py-3 font-medium hover:text-white hover:border-gray-700 transition-all"
                >
                  Back to home
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Failed */}
        {gameState === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 backdrop-blur-md flex items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <h1 className="text-white text-5xl font-bold mb-4">💥</h1>
              <h2 className="text-white text-4xl font-bold">Tower Collapsed!</h2>
              <p className="text-gray-400 text-lg">
                Your tower fell after {currentQuestionIndex + 1} question{currentQuestionIndex !== 0 ? 's' : ''}
              </p>

              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8">
                <p className="text-red-400 text-sm mb-2">Blocks Placed</p>
                <p className="text-white text-6xl font-bold mb-2">{currentQuestionIndex + 1}</p>
                <p className="text-gray-400 text-sm">Better luck next time!</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-4 font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
                >
                  Try again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-400 rounded-lg px-6 py-3 font-medium hover:text-white hover:border-gray-700 transition-all"
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
