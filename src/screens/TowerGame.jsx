import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  myPlayer,
  usePlayersList,
  useMultiplayerState,
  useIsHost,
} from 'playroomkit'
import PhysicsTower from '../components/PhysicsTower'
import SliderInput from '../components/SliderInput'
import { allQuestions } from '../data/questions'

const QUESTION_COUNT  = 20
const MAX_OFFSET_RATIO = 0.35

function pickQuestions(n) {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n).map(q => q.id)
}

export default function TowerGame() {
  const navigate   = useNavigate()
  const towerRef   = useRef(null)
  const isHost     = useIsHost()
  const players    = usePlayersList(true)

  // ── Shared state ──
  const [phase,            setPhase]            = useMultiplayerState('phase',            'splash')
  const [questionIndex,    setQuestionIndex]    = useMultiplayerState('questionIndex',    0)
  const [questionIds,      setQuestionIds]      = useMultiplayerState('questionIds',      null)
  const [towerResult,      setTowerResult]      = useMultiplayerState('towerResult',      null)
  const [bestRun,          setBestRun]          = useMultiplayerState('bestRun',          0)
  const [currentRunBlocks, setCurrentRunBlocks] = useMultiplayerState('currentRunBlocks', 0)
  const [totalCollapsed,   setTotalCollapsed]   = useMultiplayerState('totalCollapsed',   0)
  const [alignmentSum,     setAlignmentSum]     = useMultiplayerState('alignmentSum',     0)

  // ── Local state ──
  const [localAnswer,     setLocalAnswer]     = useState(null)
  const [submitted,       setSubmitted]       = useState(false)
  const [showContinueBtn, setShowContinueBtn] = useState(false)
  const [partnerLeft,     setPartnerLeft]     = useState(false)
  const [showLeaveModal,  setShowLeaveModal]  = useState(false)
  const hasDroppedRef = useRef(false)

  // Safe player access — myPlayer() throws if PlayroomKit not initialised
  let me = null
  try { me = myPlayer() } catch {}
  const partner = players.find(p => p.id !== me?.id)

  // Derived values — must be above all effects that use them
  const currentQuestion = questionIds
    ? allQuestions.find(q => q.id === questionIds[questionIndex])
    : null
  const myAnswer      = me?.getState(`answer_${questionIndex}`)
  const partnerAnswer = partner?.getState(`answer_${questionIndex}`)

  // Guard
  useEffect(() => {
    try { myPlayer() } catch { navigate('/create-join') }
  }, [navigate])

  // Warn on browser refresh / tab close
  useEffect(() => {
    const handle = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handle)
    return () => window.removeEventListener('beforeunload', handle)
  }, [])

  // Intercept back button — push a dummy history entry so we can catch it
  useEffect(() => {
    if (['complete'].includes(phase) || partnerLeft) return
    window.history.pushState(null, '', window.location.href)
    const handle = () => {
      setShowLeaveModal(true)
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', handle)
    return () => window.removeEventListener('popstate', handle)
  }, [phase, partnerLeft])

  // Detect partner leaving mid-game
  useEffect(() => {
    if (players.length < 2 && !['splash', 'complete'].includes(phase)) {
      setPartnerLeft(true)
    }
  }, [players.length, phase])

  // Host picks questions once
  useEffect(() => {
    if (!isHost || questionIds) return
    setQuestionIds(pickQuestions(QUESTION_COUNT), true)
  }, [isHost, questionIds, setQuestionIds])

  // Splash → first question (host drives, 3s delay)
  useEffect(() => {
    if (phase !== 'splash' || !isHost) return
    const t = setTimeout(() => setPhase('answer', true), 3000)
    return () => clearTimeout(t)
  }, [phase, isHost, setPhase])

  // Reset local answer state on each new question
  useEffect(() => {
    setLocalAnswer(null)
    setSubmitted(false)
    setShowContinueBtn(false)
    hasDroppedRef.current = false
  }, [questionIndex])

  // Host: both answered → review
  useEffect(() => {
    if (!isHost || phase !== 'answer') return
    const myA = me?.getState(`answer_${questionIndex}`)
    const pA  = partner?.getState(`answer_${questionIndex}`)
    if (myA && pA) setPhase('review', true)
  }, [players, isHost, phase, questionIndex, me, partner, setPhase])

  // Trigger drop on BOTH clients when phase becomes 'dropping'.
  // Re-runs if answers haven't arrived yet (PlayroomKit sync delay).
  // hasDroppedRef prevents calling dropBlock more than once per question.
  useEffect(() => {
    if (phase !== 'dropping') { hasDroppedRef.current = false; return }
    if (hasDroppedRef.current) return

    const mA = me?.getState(`answer_${questionIndex}`)
    const pA = partner?.getState(`answer_${questionIndex}`)
    if (!mA || !pA) return   // wait — effect re-runs when answers arrive

    hasDroppedRef.current = true

    const deviation  = Math.abs(mA - pA) / 4
    const alignScore = 1 - deviation
    const direction  = questionIndex % 2 === 0 ? 1 : -1
    const offsetX    = direction * deviation * MAX_OFFSET_RATIO

    const frame = requestAnimationFrame(() => {
      towerRef.current?.dropBlock(offsetX, alignScore)
    })
    const t = setTimeout(() => setShowContinueBtn(true), 3500)
    return () => { cancelAnimationFrame(frame); clearTimeout(t) }
  }, [phase, questionIndex, myAnswer, partnerAnswer, players])

  // Sync tower fall → failed phase
  useEffect(() => {
    if (towerResult !== 'fallen' || phase !== 'dropping') return
    setPhase('failed', true)
  }, [towerResult, phase, setPhase])

  // Host updates run stats whenever checking is entered (whoever clicked continue)
  useEffect(() => {
    if (phase !== 'checking' || !isHost) return
    const next = currentRunBlocks + 1
    setCurrentRunBlocks(next, true)
    if (next > bestRun) setBestRun(next, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Pan tower camera to base when game completes (reveal the tower)
  useEffect(() => {
    if (phase === 'complete') towerRef.current?.panToBase()
  }, [phase])

  const getDeviation      = () => (!myAnswer || !partnerAnswer) ? 0 : Math.abs(myAnswer - partnerAnswer) / 4
  const getAlignmentScore = () => Math.round((1 - getDeviation()) * 100)
  const getAlignmentMsg   = () => {
    const s = getAlignmentScore()
    if (s >= 90) return 'Perfect match 🎯'
    if (s >= 70) return 'Really close 💚'
    if (s >= 50) return 'Similar vibes ✨'
    if (s >= 30) return 'Some differences 🌊'
    return 'Opposite ends 🔥'
  }

  // ── Handlers ──
  const handleSubmit = () => {
    if (!localAnswer) return
    me.setState(`answer_${questionIndex}`, localAnswer)
    setSubmitted(true)
  }

  const handleDropBlock = () => {
    if (!myAnswer || !partnerAnswer) return
    if (isHost) setAlignmentSum(alignmentSum + getAlignmentScore(), true)
    setTowerResult(null, true)
    setShowContinueBtn(false)
    setPhase('dropping', true)
  }

  const handleTowerFall = useCallback(() => {
    setTowerResult('fallen', true)
  }, [setTowerResult])

  const handleAfterDrop = () => {
    setPhase('checking', true)
  }

  const handleNextQuestion = () => {
    const next = questionIndex + 1
    if (next >= QUESTION_COUNT) {
      setPhase('complete', true)
    } else {
      setQuestionIndex(next, true)
      setPhase('answer', true)
    }
  }

  const handleResetAfterFall = () => {
    towerRef.current?.resetBlocks()
    if (isHost) {
      setTotalCollapsed(totalCollapsed + 1, true)
      setCurrentRunBlocks(0, true)
    }
    const next = questionIndex + 1
    if (next >= QUESTION_COUNT) {
      setPhase('complete', true)
    } else {
      setQuestionIndex(next, true)
      setPhase('answer', true)
    }
  }

  const avgAlignment = questionIndex > 0
    ? Math.round(alignmentSum / (questionIndex + 1))
    : getAlignmentScore()

  // Loading
  if (!currentQuestion && !['splash', 'complete'].includes(phase)) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="pulse" style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading...</p>
      </div>
    )
  }

  const overlaySheetVisible = !['splash', 'dropping', 'complete'].includes(phase)

  return (
    // Fills the constrained #root completely
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── Tower background (always mounted) ── */}
      <PhysicsTower
        ref={towerRef}
        onTowerFall={handleTowerFall}
        isActive={phase === 'dropping'}
      />

      {/* ── Splash ── */}
      <AnimatePresence>
        {phase === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.7 } }}
            style={{
              position:       'absolute', inset: 0, zIndex: 20,
              display:        'flex', flexDirection: 'column',
              alignItems:     'center', justifyContent: 'center',
              background:     'rgba(13,13,15,0.94)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 10, letterSpacing: '0.04em' }}>
                Get ready
              </p>
              <h1 className="font-serif" style={{ fontSize: 44, color: 'var(--text-1)', lineHeight: 1.15 }}>
                Let's get<br />
                <span style={{ fontStyle: 'italic', color: 'var(--violet)' }}>building</span>
              </h1>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 2.0, ease: 'linear' }}
                style={{
                  height:          2,
                  background:      'linear-gradient(90deg, var(--violet), var(--cyan))',
                  borderRadius:    9999,
                  marginTop:       28,
                  transformOrigin: 'left',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dim + blur behind sheet ── */}
      <AnimatePresence>
        {overlaySheetVisible && (
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position:       'absolute', inset: 0, zIndex: 9,
              background:     'rgba(0,0,0,0.52)',
              backdropFilter: 'blur(6px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom sheet ── */}
      <AnimatePresence>
        {overlaySheetVisible && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{
              position:      'absolute',
              left: 0, right: 0, bottom: 0,
              zIndex:        10,
              background:    'var(--surface)',
              borderTop:     '1px solid var(--border)',
              borderRadius:  '24px 24px 0 0',
              paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
              maxHeight:     '90svh',
              overflowY:     'auto',
            }}
          >
            {/* Handle */}
            <div style={{ paddingTop: 12, paddingBottom: 4, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '0 20px' }}>
              <AnimatePresence mode="wait">

                {/* ══ Answer (question + slider combined) ══ */}
                {phase === 'answer' && currentQuestion && (
                  <motion.div
                    key={`answer-${questionIndex}`}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Progress bar */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 20, marginTop: 4 }}>
                      {Array.from({ length: QUESTION_COUNT }).map((_, i) => (
                        <div key={i} style={{
                          height:     3,
                          flex:       1,
                          borderRadius: 9999,
                          background: i < questionIndex
                            ? 'var(--violet)'
                            : i === questionIndex
                              ? 'var(--cyan)'
                              : 'var(--border)',
                          transition: 'background 0.4s',
                        }} />
                      ))}
                    </div>

                    {/* Question number + prompt */}
                    <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 6 }}>
                      {questionIndex + 1} / {QUESTION_COUNT}
                    </p>
                    <h2 style={{
                      fontSize:     20,
                      fontWeight:   700,
                      color:        'var(--text-1)',
                      lineHeight:   1.38,
                      marginBottom: 28,
                    }}>
                      {currentQuestion.prompt}
                    </h2>

                    {/* Slider */}
                    <div style={{ marginBottom: 28 }}>
                      <SliderInput
                        leftLabel={currentQuestion.leftLabel}
                        rightLabel={currentQuestion.rightLabel}
                        value={localAnswer}
                        onChange={setLocalAnswer}
                        disabled={submitted}
                      />
                    </div>

                    {/* Action */}
                    {submitted ? (
                      <div style={{ textAlign: 'center', paddingBottom: 4 }}>
                        <p style={{ color: 'var(--green)', fontSize: 14, marginBottom: 6 }}>✓ Submitted</p>
                        <p className="pulse" style={{ color: 'var(--text-2)', fontSize: 13 }}>
                          Waiting for {partner?.getState('name') || 'partner'}...
                        </p>
                      </div>
                    ) : (
                      <motion.button
                        className="btn-primary"
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={!localAnswer}
                        style={localAnswer
                          ? { background: 'var(--violet)', color: '#fff' }
                          : {}}
                      >
                        {localAnswer ? 'Submit answer' : 'Pick an option above'}
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {/* ══ Review ══ */}
                {phase === 'review' && currentQuestion && myAnswer && partnerAnswer && (
                  <motion.div
                    key={`review-${questionIndex}`}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 16, marginTop: 4 }}>
                      {currentQuestion.prompt}
                    </p>

                    {/* Score */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1,   opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                      style={{ textAlign: 'center', marginBottom: 20 }}
                    >
                      <p style={{ fontSize: 60, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, marginBottom: 4 }}>
                        {getAlignmentScore()}%
                      </p>
                      <p style={{ color: 'var(--text-2)', fontSize: 15 }}>{getAlignmentMsg()}</p>
                    </motion.div>

                    {/* Answer comparison */}
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>You</p>
                          <p style={{ color: 'var(--violet)', fontWeight: 800, fontSize: 24 }}>{myAnswer}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {partner?.getState('name') || 'Partner'}
                          </p>
                          <p style={{ color: 'var(--cyan)', fontWeight: 800, fontSize: 24 }}>{partnerAnswer}</p>
                        </div>
                      </div>
                      {/* Position bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                        <span>{currentQuestion.leftLabel}</span>
                        <span>{currentQuestion.rightLabel}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 9999, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: `${((myAnswer - 1) / 4) * 100}%`, top: '50%',
                          width: 14, height: 14, borderRadius: '50%', background: 'var(--violet)',
                          transform: 'translate(-50%, -50%)', border: '2px solid var(--surface)',
                        }} />
                        <div style={{
                          position: 'absolute', left: `${((partnerAnswer - 1) / 4) * 100}%`, top: '50%',
                          width: 14, height: 14, borderRadius: '50%', background: 'var(--cyan)',
                          transform: 'translate(-50%, -50%)', border: '2px solid var(--surface)',
                        }} />
                      </div>
                    </div>

                    <motion.button
                      className="btn-primary"
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDropBlock}
                      style={{ background: 'var(--violet)', color: '#fff' }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      Drop the block
                    </motion.button>
                  </motion.div>
                )}

                {/* ══ Checking ══ */}
                {phase === 'checking' && (
                  <motion.div
                    key="checking"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ paddingTop: 8, paddingBottom: 4, textAlign: 'center' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      style={{ fontSize: 50, marginBottom: 12 }}
                    >
                      🏗️
                    </motion.div>
                    <h3 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
                      Tower stands!
                    </h3>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
                      {currentRunBlocks} block{currentRunBlocks !== 1 ? 's' : ''} in this run
                    </p>
                    <motion.button
                      className="btn-primary"
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextQuestion}
                      style={{ background: 'var(--green)', color: '#000' }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {questionIndex + 1 >= QUESTION_COUNT ? 'See final results →' : 'Next question →'}
                    </motion.button>
                  </motion.div>
                )}

                {/* ══ Failed ══ */}
                {phase === 'failed' && (
                  <motion.div
                    key="failed"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ paddingTop: 8, paddingBottom: 4, textAlign: 'center' }}
                  >
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, -14, 14, -8, 8, 0] }}
                      transition={{ delay: 0.2, duration: 0.55 }}
                      style={{ fontSize: 50, marginBottom: 12 }}
                    >
                      💥
                    </motion.div>
                    <h3 style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)', marginBottom: 6 }}>
                      Tower collapsed!
                    </h3>
                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 4 }}>
                      Best run: <strong>{bestRun}</strong> block{bestRun !== 1 ? 's' : ''}
                    </p>
                    <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
                      Tower resets — the game continues
                    </p>
                    <motion.button
                      className="btn-primary"
                      whileTap={{ scale: 0.98 }}
                      onClick={handleResetAfterFall}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      {questionIndex + 1 >= QUESTION_COUNT ? 'See results →' : 'Keep going →'}
                    </motion.button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dropping: continue button sits in the 76px strip below the tower ── */}
      <AnimatePresence>
        {phase === 'dropping' && showContinueBtn && (
          <motion.div
            key="dropping-continue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              height:   76,
              display:  'flex', alignItems: 'center',
              padding:  '0 20px',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              zIndex:   5,
            }}
          >
            <motion.button
              className="btn-primary"
              whileTap={{ scale: 0.98 }}
              onClick={handleAfterDrop}
              style={{ background: 'var(--violet)', color: '#fff' }}
            >
              Continue →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Complete: tower reveal + stats (no blur — tower stays visible) ── */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          >
            {/* Gradient fade so tower peeks through the top */}
            <div style={{
              position:      'absolute', bottom: 0, left: 0, right: 0,
              height:        '72%',
              background:    'linear-gradient(to top, rgba(13,13,15,0.97) 55%, transparent)',
              pointerEvents: 'none',
            }} />

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position:      'relative', zIndex: 1,
                padding:       '0 20px',
                paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.5 }}
                  style={{ fontSize: 44, marginBottom: 10 }}
                >
                  🎉
                </motion.div>
                <h3 className="font-serif" style={{ fontSize: 28, color: 'var(--text-1)', marginBottom: 4 }}>
                  Game complete!
                </h3>
                <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
                  {QUESTION_COUNT} questions answered together
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Best run',  value: bestRun,           unit: 'blocks', color: 'var(--green)'  },
                  { label: 'Avg sync',  value: `${avgAlignment}%`,                color: 'var(--violet)' },
                  { label: 'Collapses', value: totalCollapsed,                    color: 'var(--danger)'  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.08 }}
                    style={{ flex: 1, textAlign: 'center', padding: '14px 6px' }}
                  >
                    <p style={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                    </p>
                    {stat.unit && (
                      <p style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 2 }}>{stat.unit}</p>
                    )}
                    <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                className="btn-primary"
                whileTap={{ scale: 0.98 }}
                style={{ background: 'var(--violet)', color: '#fff', marginBottom: 10 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => {
                  const text = `🏗️ Common Ground\nBest run: ${bestRun} blocks · Avg sync: ${avgAlignment}% · Collapses: ${totalCollapsed}`
                  navigator.share?.({ text }) ?? navigator.clipboard?.writeText(text)
                }}
              >
                Share result
              </motion.button>
              <motion.button
                className="btn-primary"
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.88 }}
                onClick={() => window.location.reload()}
                style={{ marginBottom: 4 }}
              >
                Play again
              </motion.button>
              <motion.button
                className="btn-ghost"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.96 }}
                onClick={() => navigate('/')}
              >
                Back to home
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leave confirmation modal ── */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            key="leave-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position:       'absolute', inset: 0, zIndex: 50,
              display:        'flex', alignItems: 'center', justifyContent: 'center',
              background:     'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(12px)',
              padding:        '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1,   opacity: 1, y: 0  }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 24,
                padding:      '28px 24px',
                width:        '100%',
                textAlign:    'center',
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
                Leave the game?
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
                Your partner will be left behind and the game will end for them.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={() => setShowLeaveModal(false)}
                  style={{ background: 'var(--violet)', color: '#fff' }}
                >
                  Stay in game
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => navigate('/')}
                >
                  Leave anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Partner left overlay ── */}
      <AnimatePresence>
        {partnerLeft && (
          <motion.div
            key="partner-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position:       'absolute', inset: 0, zIndex: 30,
              display:        'flex', flexDirection: 'column',
              alignItems:     'center', justifyContent: 'center',
              background:     'rgba(13,13,15,0.92)',
              backdropFilter: 'blur(14px)',
              padding:        '32px 24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 12 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ textAlign: 'center', width: '100%' }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
                Your partner left
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 36 }}>
                They disconnected or refreshed the page.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate('/')}
                style={{ background: 'var(--violet)', color: '#fff' }}
              >
                Quit to home
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
