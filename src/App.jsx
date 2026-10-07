import { useState } from 'react'
import './App.css'

const calibration = [
  { reading: 15, kgf: 52 }, { reading: 16, kgf: 55 }, { reading: 17, kgf: 59 },
  { reading: 18, kgf: 64 }, { reading: 19, kgf: 69 }, { reading: 20, kgf: 74 },
  { reading: 21, kgf: 80.06 }, { reading: 22, kgf: 87 }, { reading: 23, kgf: 94 },
  { reading: 24, kgf: 102 }, { reading: 25, kgf: 111 }, { reading: 26, kgf: 122 },
  { reading: 27, kgf: 133 }, { reading: 28, kgf: 146 }, { reading: 29, kgf: 160 },
]

const samples = {
  left: [22, 22, 23, 22, 21, 22, 23, 22, 22, 21, 22, 23],
  right: [24, 23, 24, 23, 24, 25, 24, 23, 24, 24, 25, 24],
}

const materialFactors = {
  Steel: 1.16,
  Aluminum: 1,
  Titanium: 0.91,
  'Berd® PolyLight™': 0.78,
  'Spinergy® PBO': 0.84,
  'Carbon Fiber Mavic® R2R': 0.9,
}

function tensionFor(reading, material, shape, thickness) {
  const value = Number(reading)
  if (!Number.isFinite(value) || value <= 0) return null

  let lower = calibration[0]
  let upper = calibration[1]
  if (value >= calibration.at(-1).reading) {
    lower = calibration.at(-2)
    upper = calibration.at(-1)
  } else if (value > calibration[0].reading) {
    const index = calibration.findIndex((point) => point.reading >= value)
    lower = calibration[index - 1]
    upper = calibration[index]
  }

  const base = lower.kgf + ((value - lower.reading) / (upper.reading - lower.reading)) * (upper.kgf - lower.kgf)
  const gaugeFactor = Number(thickness) / 2.28
  return base * materialFactors[material] * gaugeFactor * (shape === 'Blade' ? 0.94 : 1)
}

function summarize(readings, settings, variance) {
  const values = readings.map((reading) => tensionFor(reading, settings.material, settings.shape, settings.thickness)).filter((value) => value !== null)
  if (!values.length) return { average: null, deviation: null, low: null, high: null, flagged: 0 }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length)
  const low = average * (1 - variance / 100)
  const high = average * (1 + variance / 100)
  const flagged = values.filter((value) => value < low || value > high).length
  return { average, deviation, low, high, flagged }
}

function format(value) {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(2)
}

function SpokeTable({ side, readings, summary, settings, onReadingChange, onCountChange, onSelectSpoke, selectedSpoke, variance }) {
  const label = side === 'left' ? 'Left' : 'Right'
  return (
    <section className={`spoke-panel ${side}-panel`}>
      <div className="side-heading">
        <div>
          <span className={`side-dot ${side}`} />
          <h3>{label} side spokes</h3>
        </div>
        <label className="count-select">
          <span className="visually-hidden">{label} side spoke count</span>
          <select value={readings.length} onChange={(event) => onCountChange(Number(event.target.value))}>
            {Array.from({ length: 22 }, (_, index) => index + 3).map((count) => (
              <option key={count} value={count}>{count} spokes</option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table className="spoke-table">
          <thead>
            <tr><th>#</th><th>TM-1 reading</th><th>Tension <span>(kgf)</span></th><th>Within {variance}%</th></tr>
          </thead>
          <tbody>
            {readings.map((reading, index) => {
              const tension = tensionFor(reading, settings.material, settings.shape, settings.thickness)
              const outside = tension !== null && summary.average !== null && (tension < summary.low || tension > summary.high)
              return (
                <tr className={`${outside ? 'outside-row' : ''} ${selectedSpoke === index ? 'selected-row' : ''}`} key={`${side}-${index}`}>
                  <td className="row-number">{String(index + 1).padStart(2, '0')}</td>
                  <td>
                    <input
                      aria-label={`${label} spoke ${index + 1} TM-1 reading`}
                      type="number"
                      min="0"
                      max="40"
                      step="0.1"
                      value={reading}
                      onFocus={() => onSelectSpoke(index)}
                      onChange={(event) => onReadingChange(index, event.target.value)}
                    />
                  </td>
                  <td className="tension-value">{format(tension)}</td>
                  <td className="limit-state">
                    {outside ? <span className="flag"><span aria-hidden="true">!</span> Check</span> : tension === null ? <span className="empty-state">—</span> : <span className="pass-state"><span aria-hidden="true">✓</span> In range</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footnote">Average tension <strong>{format(summary.average)} kgf</strong></div>
    </section>
  )
}

function WheelDiagram({ left, right, leftSummary, rightSummary, settings, activeSide, selectedSpoke, onSpokeSelect }) {
  const count = Math.max(left.length, right.length)
  const allTensions = [...left, ...right]
    .map((reading) => tensionFor(reading, settings.material, settings.shape, settings.thickness))
    .filter((value) => value !== null)
  const chartMaximum = Math.max(50, Math.ceil(Math.max(...allTensions, 0) / 25) * 25)
  const center = 160
  const radius = 125
  const pointFor = (index, value) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const distance = Math.max(0, Math.min(value / chartMaximum, 1)) * radius
    return { x: center + Math.cos(angle) * distance, y: center + Math.sin(angle) * distance }
  }
  const series = [
    { side: 'left', readings: left, summary: leftSummary },
    { side: 'right', readings: right, summary: rightSummary },
  ].map((item) => ({
    ...item,
    points: item.readings.map((reading, index) => {
      const tension = tensionFor(reading, settings.material, settings.shape, settings.thickness)
      return tension === null ? null : { ...pointFor(index, tension), tension, index }
    }),
  }))

  return (
    <figure className="wheel-figure">
      <figcaption>TENSION BY SPOKE <span>KGF · MAX {chartMaximum}</span></figcaption>
      <svg viewBox="0 0 320 320" role="img" aria-label={`Radial tension diagram showing ${left.length} left and ${right.length} right spokes`}>
        {[0.25, 0.5, 0.75, 1].map((step) => <circle key={step} className="chart-ring" cx={center} cy={center} r={radius * step} />)}
        {Array.from({ length: count }, (_, index) => {
          const edge = pointFor(index, chartMaximum)
          const label = pointFor(index, chartMaximum * 1.12)
          return <g key={index} className="chart-spoke-label">
            <line className="chart-axis" x1={center} y1={center} x2={edge.x} y2={edge.y} />
            <circle cx={label.x} cy={label.y} r="10" />
            <text className="chart-number" x={label.x} y={label.y + 3}>{String(index + 1).padStart(2, '0')}</text>
          </g>
        })}
        {series.map(({ side, points, summary }) => {
          const visiblePoints = points.filter(Boolean)
          return <g className={`chart-series ${side}`} key={side}>
            {visiblePoints.length > 1 && <polygon points={visiblePoints.map(({ x, y }) => `${x},${y}`).join(' ')} />}
            {visiblePoints.map(({ x, y, tension, index }) => {
              const isSelected = activeSide === side && selectedSpoke === index
              const isOutside = tension < summary.low || tension > summary.high
              return <circle
                key={index}
                className={`${isSelected ? 'selected' : ''} ${isOutside ? 'outside' : ''}`}
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                role="button"
                tabIndex="0"
                aria-label={`${side} spoke ${index + 1}, ${format(tension)} kgf`}
                onClick={() => onSpokeSelect(side, index)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSpokeSelect(side, index) } }}
              />
            })}
          </g>
        })}
        <circle className="chart-center" cx={center} cy={center} r="3" />
      </svg>
      <div className="diagram-legend"><span><i className="left-spoke-key" /> Left</span><span><i className="right-spoke-key" /> Right</span><span><i className="out-spoke-key" /> Outside limit</span></div>
    </figure>
  )
}

function SummaryCard({ title, summary, color }) {
  return (
    <div className="summary-card">
      <div className="summary-title"><span className={`side-dot ${color}`} /><h3>{title}</h3></div>
      <div className="summary-main"><strong>{format(summary.average)}</strong><span>kgf average</span></div>
      <div className="summary-details">
        <div><span>Standard deviation</span><strong>{format(summary.deviation)} kgf</strong></div>
        <div><span>Acceptable range</span><strong>{format(summary.low)}–{format(summary.high)} kgf</strong></div>
        <div><span>Outside limit</span><strong className={summary.flagged ? 'warning-text' : ''}>{summary.flagged} spokes</strong></div>
      </div>
    </div>
  )
}

function App() {
  const [settings, setSettings] = useState({ material: 'Aluminum', shape: 'Round', thickness: '2.28' })
  const [variance, setVariance] = useState(20)
  const [left, setLeft] = useState(samples.left)
  const [right, setRight] = useState(samples.right)
  const [activeSide, setActiveSide] = useState('left')
  const [selectedSpoke, setSelectedSpoke] = useState(0)
  const leftSummary = summarize(left, settings, variance)
  const rightSummary = summarize(right, settings, variance)

  function updateReading(setter, index, value) {
    setter((current) => current.map((reading, position) => position === index ? value : reading))
  }

  function updateCount(setter, count) {
    setter((current) => count > current.length ? [...current, ...Array(count - current.length).fill('')] : current.slice(0, count))
  }

  function selectSpoke(side, index) {
    setActiveSide(side)
    setSelectedSpoke(index)
  }

  function reset() {
    setSettings({ material: 'Aluminum', shape: 'Round', thickness: '2.28' })
    setVariance(20)
    setLeft(samples.left)
    setRight(samples.right)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Spoke Bench home">
          <span className="brand-mark">S</span>
          <span className="brand-name">SPOKE<span> BENCH</span></span>
        </a>
        <div className="topbar-right"><span className="tool-indicator" /> WORKSHOP TOOLS <span className="topbar-rule" /> WHEEL TENSION APP</div>
      </header>

      <main id="top" className="main-content">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="#top">Home</a><span>/</span><a href="#top">Workshop tools</a><span>/</span><strong>Wheel tension app</strong>
        </nav>

        <section className="page-intro">
          <div>
            <span className="eyebrow">WHEEL SERVICE / TENSION ANALYSIS</span>
            <h1>Wheel Tension App</h1>
            <p>Measure, compare, and balance spoke tension across your wheel.</p>
          </div>
          <a className="instructions-link" href="#conversion-title">
            <span className="book-icon" aria-hidden="true">↘</span> Conversion table
          </a>
        </section>

        <section className="wheel-profile" aria-label="Wheel profile">
          <div className="profile-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" /><circle cx="24" cy="24" r="4" /><path d="M24 6v14m0 8v14M6 24h14m8 0h14M11.3 11.3l9.9 9.9m5.6 5.6 9.9 9.9m0-25.4-9.9 9.9m-5.6 5.6-9.9 9.9" /></svg></div>
          <div className="profile-name"><span>ACTIVE WHEEL PROFILE</span><h2>DT Swiss EX 1700 <em>Front / 2025 Scott Spark</em></h2></div>
          <div className="profile-meta"><span>TYPE<strong>Front wheel</strong></span><span>RIM<strong>DT Swiss EX 1700</strong></span><span>SPOKES<strong>{left.length + right.length} total</strong></span><span>HUB<strong>DT Swiss 350</strong></span></div>
          <span className="tire-tag"><span /> Tire on</span>
        </section>

        <section className="settings-section" aria-labelledby="settings-title">
          <div className="section-heading"><div><span className="section-index">01</span><h2 id="settings-title">Spoke settings</h2></div><span className="section-note">Set the spoke profile for accurate conversion</span></div>
          <div className="settings-grid">
            <label className="setting-field"><span>Material</span><select value={settings.material} onChange={(event) => setSettings({ ...settings, material: event.target.value })}>{Object.keys(materialFactors).map((material) => <option key={material}>{material}</option>)}</select></label>
            <label className="setting-field"><span>Shape</span><select value={settings.shape} onChange={(event) => setSettings({ ...settings, shape: event.target.value })}><option>Round</option><option>Blade</option></select></label>
            <label className="setting-field"><span>Thickness</span><select value={settings.thickness} onChange={(event) => setSettings({ ...settings, thickness: event.target.value })}><option value="2.28">2.28 mm</option><option value="2.54">2.54 mm</option><option value="2.8">2.80 mm</option><option value="3.3">3.30 mm</option></select></label>
            <button className="text-button" type="button" onClick={reset}>Reset profile</button>
          </div>
        </section>

        <section className="conversion-section" aria-labelledby="conversion-title">
          <div className="conversion-heading"><div><span className="section-index">REFERENCE</span><h2 id="conversion-title">TM-1 conversion table</h2></div><span>Aluminum · Round · 2.28 mm baseline</span></div>
          <div className="conversion-scroll"><table className="conversion-table"><tbody><tr><th>TM-1 reading</th>{calibration.map((point) => <td key={point.reading}>{point.reading}</td>)}</tr><tr><th>Spoke tension <span>(kgf)</span></th>{calibration.map((point) => <td key={point.reading}>{Math.round(point.kgf)}</td>)}</tr></tbody></table></div>
        </section>

        <section className="balancing-section" aria-labelledby="balance-title">
          <div className="section-heading balance-heading"><div><span className="section-index">02</span><h2 id="balance-title">Wheel tension balancing</h2></div><div className="variance-control"><span>Variance limit</span><div className="segmented-control" role="group" aria-label="Variance limit">{[5, 10, 15, 20].map((value) => <button type="button" aria-pressed={variance === value} className={variance === value ? 'selected' : ''} key={value} onClick={() => setVariance(value)}>{value}%</button>)}</div></div></div>

          <div className="overview-grid">
            <SummaryCard title="Left side" summary={leftSummary} color="left" />
            <WheelDiagram left={left} right={right} leftSummary={leftSummary} rightSummary={rightSummary} settings={settings} activeSide={activeSide} selectedSpoke={selectedSpoke} onSpokeSelect={(side, index) => selectSpoke(side, index)} />
            <SummaryCard title="Right side" summary={rightSummary} color="right" />
          </div>

          <div className="spoke-tables">
            <SpokeTable side="left" readings={left} summary={leftSummary} settings={settings} variance={variance} selectedSpoke={activeSide === 'left' ? selectedSpoke : -1} onSelectSpoke={(index) => selectSpoke('left', index)} onReadingChange={(index, value) => updateReading(setLeft, index, value)} onCountChange={(count) => updateCount(setLeft, count)} />
            <SpokeTable side="right" readings={right} summary={rightSummary} settings={settings} variance={variance} selectedSpoke={activeSide === 'right' ? selectedSpoke : -1} onSelectSpoke={(index) => selectSpoke('right', index)} onReadingChange={(index, value) => updateReading(setRight, index, value)} onCountChange={(count) => updateCount(setRight, count)} />
          </div>
          <div className="legend"><span><i className="legend-dot good" /> Within selected limit</span><span><i className="legend-dot bad" /> Outside selected limit</span><span><i className="legend-dot blank" /> No reading</span></div>
        </section>
        <footer className="page-footer"><span>SPOKE BENCH <b>TENSION CALCULATOR</b></span><span>TM-1 readings are converted using the selected spoke profile.</span></footer>
      </main>
    </div>
  )
}

export default App
