import { useState } from 'react'
import { runSimulation } from '../../../api/simulation'
import { useSimulationStore } from '../../../store/useSimulationStore'
import styles from './tabs.module.css'

interface SimResult {
  hotspots: { lat: number; lng: number; probability: number; radius: number; label: string }[]
  sectorProbabilities: { name: string; probability: number }[]
  samplePaths: { agentId: number; behavior: string; path: { lat: number; lng: number; t: number }[] }[]
  summary: string
  agentCount: number
}

export default function RunSimulation({ operationId }: { operationId: string }) {
  const [agents, setAgents] = useState(100)
  const [duration, setDuration] = useState(24)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState('')

  const setResults = useSimulationStore((s) => s.setResults)
  const clearResults = useSimulationStore((s) => s.clearResults)

  const handleRun = async () => {
    setRunning(true)
    setError('')
    setResult(null)
    clearResults()
    try {
      const data = await runSimulation({
        operationId,
        agentCount: agents,
        durationHours: duration,
        weatherSnapshot: {
          temperature: 24,
          windSpeed: 12,
          windDirection: 'NW',
          precipitation: 0,
          visibility: 'clear',
        },
      })
      setResult(data)
      setResults(data.hotspots, data.sectorProbabilities, data.samplePaths)
    } catch {
      setError('Simulation failed. Check backend connection.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>SIMULATION CONFIG</div>

      <div className={styles.simRow}>
        <span>AGENTS</span>
        <span>{agents}</span>
      </div>
      <input
        type="range" min={10} max={500} value={agents}
        className={styles.simSlider}
        onChange={(e) => setAgents(Number(e.target.value))}
      />

      <div className={styles.simRow} style={{ marginTop: 12 }}>
        <span>DURATION</span>
        <span>{duration}h</span>
      </div>
      <input
        type="range" min={1} max={72} value={duration}
        className={styles.simSlider}
        onChange={(e) => setDuration(Number(e.target.value))}
      />

      <div className={styles.divider} />
      <div className={styles.sectionHead}>WEATHER SNAPSHOT</div>
      <div className={styles.wxGrid}>
        <div className={styles.wxItem}><div className={styles.wxVal}>24°C</div><div className={styles.wxKey}>TEMP</div></div>
        <div className={styles.wxItem}><div className={styles.wxVal}>NW 12</div><div className={styles.wxKey}>WIND</div></div>
        <div className={styles.wxItem}><div className={styles.wxVal}>78%</div><div className={styles.wxKey}>HUMIDITY</div></div>
        <div className={styles.wxItem}><div className={styles.wxVal}>CLEAR</div><div className={styles.wxKey}>VIS</div></div>
      </div>

      {error && (
        <div style={{
          fontSize: 12, color: 'var(--danger)', padding: '7px 10px',
          background: 'rgba(204,68,68,0.08)', border: '1px solid rgba(204,68,68,0.2)',
          borderRadius: 2, marginTop: 8,
        }}>
          {error}
        </div>
      )}

      <button
        className={styles.runBtn}
        onClick={handleRun}
        disabled={running}
      >
        {running ? `SIMULATING ${agents} AGENTS...` : 'RUN SIMULATION →'}
      </button>

      {running && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            SPAWNING AGENTS...
          </div>
          <div style={{ height: 3, background: 'var(--border2)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'var(--accent)', borderRadius: 1,
              animation: 'simProgress 2s ease-in-out infinite',
            }} />
          </div>
          <style>{`@keyframes simProgress { 0%{width:0%} 50%{width:80%} 100%{width:100%} }`}</style>
        </div>
      )}

      {result && !running && (
        <>
          <div className={styles.divider} />
          <div className={styles.sectionHead}>
            RESULTS — {result.agentCount} AGENTS
            <span style={{ color: 'var(--success)', fontSize: 10 }}>✓ PLOTTED ON MAP</span>
          </div>

          <div className={styles.sectionHead} style={{ marginTop: 8 }}>SECTOR PROBABILITY</div>
          {result.sectorProbabilities.map((s) => (
            <div key={s.name}>
              <div className={styles.resRow}>
                <span className={styles.resName}>{s.name}</span>
                <span className={styles.resPct}>{s.probability}%</span>
              </div>
              <div className={styles.resBar}>
                <div style={{
                  width: `${Math.min(s.probability, 100)}%`, height: 3,
                  background: s.probability > 50 ? 'var(--danger)' : s.probability > 25 ? 'var(--warn)' : 'var(--accent)',
                  borderRadius: 1,
                }} />
              </div>
            </div>
          ))}

          <div className={styles.sectionHead} style={{ marginTop: 12 }}>TOP HOTSPOTS</div>
          {result.hotspots.slice(0, 3).map((h, i) => (
            <div key={i} className={styles.card} style={{ marginBottom: 6 }}>
              <div className={styles.cardTitle} style={{ color: i === 0 ? 'var(--danger)' : i === 1 ? 'var(--warn)' : 'var(--accent)', fontSize: 11 }}>
                {h.label}
              </div>
              <div className={styles.cardSub}>
                {h.lat.toFixed(4)}N · {h.lng.toFixed(4)}E
              </div>
              <div className={styles.cardMeta}>
                <span>Probability</span>
                <span style={{ color: 'var(--accent)' }}>{h.probability}%</span>
              </div>
            </div>
          ))}

          <div className={styles.sectionHead} style={{ marginTop: 12 }}>BEHAVIOR BREAKDOWN</div>
          {['trail_follower','downhill','random_walk','shelter_seek','stationary'].map((b) => {
            const count = result.samplePaths.filter((p) => p.behavior === b).length
            const pct = Math.round((count / Math.max(result.samplePaths.length, 1)) * 100)
            const colors: Record<string, string> = {
              trail_follower: '#e8c87a', downhill: '#7a9ee8',
              random_walk: '#7a9e7a', shelter_seek: '#cc4444', stationary: '#888',
            }
            return (
              <div key={b} style={{ marginBottom: 5 }}>
                <div className={styles.simRow}>
                  <span style={{ color: colors[b], fontSize: 10 }}>{b.replace(/_/g, ' ').toUpperCase()}</span>
                  <span style={{ fontSize: 10 }}>{pct}%</span>
                </div>
                <div className={styles.resBar}>
                  <div style={{ width: `${pct}%`, height: 2, background: colors[b], borderRadius: 1 }} />
                </div>
              </div>
            )
          })}

          <div className={styles.divider} />
          <div className={styles.sectionHead}>AI SUMMARY</div>
          <div className={styles.card}>
            <div className={styles.cardSub} style={{ lineHeight: 1.7 }}>{result.summary}</div>
          </div>
        </>
      )}
    </div>
  )
}