import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  myPlayer,
  usePlayersList,
  useMultiplayerState,
  useIsHost,
} from 'playroomkit'
import PhysicsTower from '../components/PhysicsTower'
import QuadChart from '../components/QuadChart'
import { allQuestions } from '../data/questions'

const QUESTION_COUNT = 5

export default function TowerGame() {
  const navigate = useNavigate()
  const towerRef = useRef(null)
  const isHost = useIsHost()
  const players = usePlayersList(true) // re-render whenever any player state changes

  // ── Global shared state (managed by host) ──
  const [phase, setPhase] = useMultiplayerState('phase', 'question')
  const [questionIndex, setQuestionIndex] = useMultiplayerState('questionIndex', 0)
  const [questionIds, setQuestionIds] = useMultiplayerState('questionIds', null)
  const [towerResult, setTowerResult] = useMultiplayerState('towerResult', null) // 'standing' | 'fallen'

  // ── Local UI state ──
  const [localAnswer, setLocalAnswer] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [dropParams, setDropParams] = useState(null)
  const [showContinueBtn, setShowContinueBtn] = useState(false)

  const me = myPlayer()
  const partner = players.find(p => p.id !== me?.id)

  // Host picks the question set once on mount
  useEffect(() => {
    if (!isHost || questionIds) return
    const shuffled = [...allQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, QUESTION_COUNT)
      .map(q => q.id)
    setQuestionIds(shuffled, true)
  }, [isHost, questionIds, setQuestionIds])

  // Reset local state when question changes
  useEffect(() => {
    setLocalAnswer(null)
    setSubmitted(false)
    setDropParams(null)
    setShowContinueBtn(false)
  }, [questionIndex])

  // After PhysicsTower mounts (phase just became 'dropping'), call dropBlock
  // Uses rAF so the ref is guaranteed to be attached before we call it
  useEffect(() => {
    if (phase !== 'dropping' || !dropParams) return
    const frame = requestAnimationFrame(() => {
      towerRef.current?.dropBlock(dropParams.offsetX, dropParams.alignmentScore)
    })
    const timer = setTimeout(() => setShowContinueBtn(true), 3000)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [phase, dropParams])

  // Guard: if Playroom isn't initialized go back
  useEffect(() => {
    try { myPlayer() } catch { navigate('/create-join') }
  }, [navigate])

  // Derive current question from shared questionIds
  const currentQuestion = questionIds
    ? allQuestions.find(q => q.id === questionIds[questionIndex])
    : null

  // Get both players' answers for the current question
  const myAnswer = me?.getState(`answer_${questionIndex}`)
  const partnerAnswer = partner?.getState(`answer_${questionIndex}`)
  const bothAnswered = myAnswer && partnerAnswer

  // Host: when both answered → move to review
  useEffect(() => {
    if (!isHost || phase !== 'answer' || !bothAnswered) return
    setPhase('review', true)
  }, [isHost, phase, bothAnswered, setPhase])

  // Tower fall syncs phase to 'failed' for both players
  useEffect(() => {
    if (towerResult === 'fallen' && phase === 'dropping') {
      setPhase('failed', true)
    }
  }, [towerResult, phase, setPhase])

  // ── Handlers ──

  const handleSubmitAnswer = () => {
    if (!localAnswer) return
    me.setState(`answer_${questionIndex}`, localAnswer)
    setSubmitted(true)
    setPhase('answer', true) // ensure phase is 'answer' while waiting
  }

  const handleContinueToDrop = () => {
    if (!myAnswer || !partnerAnswer) return
    const offsetX = (myAnswer.x - partnerAnswer.x) / 2
    const alignmentScore = Math.max(0, 1 - getDistance() / 2)
    // Store params — dropBlock is called via useEffect AFTER PhysicsTower mounts
    setDropParams({ offsetX, alignmentScore })
    setTowerResult(null, true)
    setShowContinueBtn(false)
    setPhase('dropping', true)
  }

  const handleTowerFall = () => {
    // Any player detecting a fall syncs it globally
    setTowerResult('fallen', true)
  }

  const handleConfirmDrop = () => {
    setPhase('checking', true)
  }

  const handleNextQuestion = () => {
    const next = questionIndex + 1
    if (next >= QUESTION_COUNT) {
      setPhase('complete', true)
    } else {
      setQuestionIndex(next, true)
      setPhase('question', true)
    }
  }

  const getDistance = () => {
    if (!myAnswer || !partnerAnswer) return 0
    return Math.sqrt(
      Math.pow(myAnswer.x - partnerAnswer.x, 2) +
      Math.pow(myAnswer.y - partnerAnswer.y, 2)
    )
  }

  const getAlignmentScore = () => Math.max(0, Math.round((1 - getDistance() / 2) * 100))

  const getAlignmentMessage = () => {
    const d = getDistance()
    if (d < 0.5) return 'Perfect alignment'
    if (d < 1.0) return 'Great minds think alike'
    if (d < 1.5) return 'Close enough'
    return 'Interesting differences'
  }

  // Loading until question set is shared
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-gray-500 text-sm"
        >
          Loading game...
        </motion.p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Tower ONLY visible during dropping */}
      {phase === 'dropping' && (
        <PhysicsTower
          ref={towerRef}
          onTowerFall={handleTowerFall}
          isActive={true}
        />
      )}

      <AnimatePresence mode="wait">

        {/* ── Question ── */}
        {phase === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-3">
                Question {questionIndex + 1} of {QUESTION_COUNT}
              </p>
              <div className="flex gap-1.5 justify-center mb-10">
                {Array.from({ length: QUESTION_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 flex-1 rounded-full transition-all ${
                      i <= questionIndex ? 'bg-white' : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-center mb-8">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
                >
                  {questionIndex + 1}
                </div>
              </div>

              <h2 className="font-serif text-3xl text-white leading-snug mb-12 px-2">
                {currentQuestion.prompt}
              </h2>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setPhase('answer', true)}
                className="w-full bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
              >
                Place your answer
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Answer ── */}
        {phase === 'answer' && (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">Question {questionIndex + 1}</p>
              <h3 className="font-serif text-xl text-white leading-snug">{currentQuestion.prompt}</h3>
            </div>

            <QuadChart
              axes={currentQuestion.axes}
              onAnswer={(x, y) => setLocalAnswer({ x, y })}
              playerAnswer={localAnswer}
              interactive={!submitted}
            />

            <div className="w-full max-w-sm space-y-3">
              {submitted ? (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-center text-gray-500 text-sm py-4"
                >
                  Waiting for {partner?.getState('name') || 'partner'}...
                </motion.p>
              ) : (
                <>
                  {localAnswer && (
                    <p className="text-center text-gray-600 text-xs">Tap again to adjust</p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitAnswer}
                    disabled={!localAnswer}
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
        {phase === 'review' && myAnswer && partnerAnswer && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-gray-500 text-sm mb-2">Question {questionIndex + 1}</p>
              <h3 className="font-serif text-xl text-white leading-snug mb-8">{currentQuestion.prompt}</h3>

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
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
                playerAnswer={myAnswer}
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

        {/* ── Dropping ── tower is visible behind, controls at bottom ── */}
        {phase === 'dropping' && (
          <motion.div
            key="dropping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 flex flex-col items-center pt-10 pointer-events-none"
          >
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full"
            >
              Watch the tower...
            </motion.p>
          </motion.div>
        )}

        {/* ── Dropping: Continue button (after block settles) ── */}
        {phase === 'dropping' && showContinueBtn && (
          <motion.div
            key="dropping-continue"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmDrop}
              className="w-full max-w-sm bg-white text-black rounded-2xl px-6 py-4 font-medium text-base"
            >
              Continue
            </motion.button>
          </motion.div>
        )}

        {/* ── Checking (tower stands) ── */}
        {phase === 'checking' && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <p className="text-gray-500 text-sm mb-4">
                  {questionIndex + 1} block{questionIndex !== 0 ? 's' : ''} stacked
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
                {questionIndex + 1 >= QUESTION_COUNT ? 'Finish game' : 'Next question'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Complete ── */}
        {phase === 'complete' && (
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
                <p className="text-gray-500 text-sm">You answered all {QUESTION_COUNT} questions</p>
              </div>

              <div className="bg-[#111] rounded-2xl p-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Final Tower</p>
                <p className="text-white text-6xl font-bold mb-1">{QUESTION_COUNT}</p>
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
        {phase === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
          >
            <div className="w-full max-w-sm text-center space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-4">
                  {questionIndex + 1} block{questionIndex !== 0 ? 's' : ''} placed
                </p>
                <h2 className="font-serif text-4xl text-white mb-2">Tower Collapsed</h2>
                <p className="text-gray-500 text-sm">Better luck next time</p>
              </div>

              <div className="bg-[#111] rounded-2xl p-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Blocks Placed</p>
                <p className="text-white text-6xl font-bold mb-1">{questionIndex + 1}</p>
                <p className="text-gray-600 text-sm">out of {QUESTION_COUNT}</p>
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
