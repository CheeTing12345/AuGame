export default function SliderInput({ leftLabel, rightLabel, value, onChange, disabled }) {
  const positions = [1, 2, 3, 4, 5]

  const handleSelect = (pos) => {
    if (disabled) return
    onChange(pos)
    if (navigator.vibrate) navigator.vibrate(8)
  }

  // Fill width: value=1 → 0%, value=5 → 100%
  const fillPct = value ? ((value - 1) / 4) * 100 : 0

  return (
    <div style={{ width: '100%' }}>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: '40%', lineHeight: 1.3 }}>
          {leftLabel}
        </span>
        <span style={{
          fontSize: 13, color: 'var(--text-2)', maxWidth: '40%',
          lineHeight: 1.3, textAlign: 'right'
        }}>
          {rightLabel}
        </span>
      </div>

      {/* Track + dots */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Track line behind dots */}
        <div className="slider-track" style={{ position: 'absolute', left: 24, right: 24 }}>
          <div className="slider-fill" style={{ width: `${fillPct}%` }} />
        </div>

        {/* Dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}>
          {positions.map((pos) => (
            <button
              key={pos}
              className={`slider-dot${value === pos ? ' selected' : ''}`}
              onClick={() => handleSelect(pos)}
              disabled={disabled}
              aria-label={`Option ${pos}`}
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <div className="slider-dot-inner" />
            </button>
          ))}
        </div>
      </div>

      {/* Position labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingLeft: 12,
        paddingRight: 12,
      }}>
        {positions.map((pos) => (
          <span key={pos} style={{
            fontSize: 11,
            color: value === pos ? 'var(--violet)' : 'var(--text-3)',
            width: 24,
            textAlign: 'center',
            transition: 'color 0.2s',
          }}>
            {pos}
          </span>
        ))}
      </div>
    </div>
  )
}
