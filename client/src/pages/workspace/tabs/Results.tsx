import { useEffect, useState } from 'react'
import { marked } from 'marked'
import { useSimulationStore } from '../../../store/useSimulationStore'
import { getSimulations } from '../../../api/simulation'
import { explainSector, summarizeOperation } from '../../../api/ai'
import styles from './tabs.module.css'
import { subscribeOperationRefresh } from '../../../lib/operationSync'

marked.setOptions({ breaks: true, gfm: true })

export default function Results({ operationId }: { operationId: string }) {
  const { hotspots, sectorProbabilities, hasResults } = useSimulationStore()
  const [pastSims, setPastSims] = useState<any[]>([])
  const [explanation, setExplanation] = useState('')
  const [explainLoading, setExplainLoading] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!operationId) return
     const fetchdata = async () => {
    getSimulations(operationId)
      .then(setPastSims)
      .catch(() => {})
  }
  fetchdata()
  const unsubscribe = subscribeOperationRefresh(operationId, () => {
    fetchdata()}
  )
}, [operationId, hasResults])

  const latestSim = pastSims[pastSims.length - 1]
  const displayHotspots = hasResults ? hotspots : (latestSim?.hotspots ?? [])
  const displaySectors = hasResults ? sectorProbabilities : []

  const handleExplain = async (name: string, pct: number) => {
    setExplainLoading(true)
    setSelectedSector(name)
    setExplanation('')
    try {
      const data = await explainSector(name, pct)
      setExplanation(data.explanation)
    } catch {
      setExplanation('Could not get explanation.')
    } finally {
      setExplainLoading(false)
    }
  }

  const handleSummarize = async () => {
    setSummaryLoading(true)
    setSummary('')
    try {
      const data = await summarizeOperation(operationId)
      setSummary(data.summary)
    } catch {
      setSummary('Could not generate summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>

      <div className={styles.sectionHead}>
        OPERATION SUMMARY
        <a onClick={handleSummarize} style={{ cursor: 'pointer' }}>
          {summaryLoading ? 'GENERATING...' : 'GENERATE'}
        </a>
      </div>

      {summary && (
        <div className={styles.card} style={{ marginBottom: 10 }}>
          <div
            className={styles.markdownContent}
            dangerouslySetInnerHTML={{ __html: marked.parse(summary) as string }}
          />
        </div>
      )}

      <div className={styles.sectionHead}>
        SIMULATION RUNS
        <span style={{ color: 'var(--text3)' }}>{pastSims.length} TOTAL</span>
      </div>

      {pastSims.length === 0 ? (
        <div className={styles.card} style={{ marginBottom: 10 }}>
          <div className={styles.cardSub}>No simulations run yet. Go to SIMULATE tab.</div>
        </div>
      ) : (
        <div className={styles.card} style={{ marginBottom: 10 }}>
          <div className={styles.cardTitle}>
            Latest — {latestSim?.agentCount} agents · {latestSim?.durationHours}h
          </div>
          <div className={styles.cardMeta}>
            <span>Status</span>
            <span style={{ color: 'var(--success)', textTransform: 'uppercase' }}>
              {latestSim?.status}
            </span>
          </div>
          {latestSim?.weatherSnapshot && (
            <div className={styles.cardMeta}>
              <span>Weather</span>
              <span>
                {latestSim.weatherSnapshot.temperature}°C ·{' '}
                {latestSim.weatherSnapshot.windDirection}{' '}
                {latestSim.weatherSnapshot.windSpeed}km/h
              </span>
            </div>
          )}
        </div>
      )}

      {displaySectors.length > 0 && (
        <>
          <div className={styles.sectionHead}>SECTOR PROBABILITY</div>
          {displaySectors.map((s) => (
            <div key={s.name} style={{ marginBottom: 8 }}>
              <div className={styles.resRow}>
                <span className={styles.resName}>{s.name}</span>
                <span className={styles.resPct}>{s.probability}%</span>
                <button
                  onClick={() => handleExplain(s.name, s.probability)}
                  disabled={explainLoading && selectedSector === s.name}
                  style={{
                    fontSize: 9, padding: '2px 7px', background: 'transparent',
                    border: '1px solid var(--border2)', color: 'var(--text3)',
                    cursor: 'pointer', borderRadius: 2, fontFamily: 'var(--font-mono)',
                    marginLeft: 6, transition: 'all 0.15s',
                  }}
                >
                  {explainLoading && selectedSector === s.name ? '...' : 'WHY?'}
                </button>
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
        </>
      )}

      {displayHotspots.length > 0 && (
        <>
          <div className={styles.sectionHead} style={{ marginTop: 8 }}>
            TOP HOTSPOTS
            {hasResults && <span style={{ color: 'var(--success)', fontSize: 10 }}>LIVE</span>}
          </div>
          {displayHotspots.map((h: any, i: number) => (
            <div key={i} className={styles.card} style={{ marginBottom: 6 }}>
              <div className={styles.cardTitle} style={{
                color: i === 0 ? 'var(--danger)' : i === 1 ? 'var(--warn)' : 'var(--accent)',
                fontSize: 11,
              }}>
                {h.label}
              </div>
              <div className={styles.cardSub}>
                {h.lat.toFixed(4)}N · {h.lng.toFixed(4)}E
              </div>
              <div className={styles.cardMeta}>
                <span>Probability</span>
                <span style={{ color: 'var(--accent)' }}>{h.probability}%</span>
              </div>
              <div className={styles.confBar}>
                <div className={styles.confFill} style={{ width: `${h.probability}%` }} />
              </div>
            </div>
          ))}
        </>
      )}

      {explanation && (
        <>
          <div className={styles.divider} />
          <div className={styles.sectionHead}>AI EXPLANATION — {selectedSector}</div>
          <div className={styles.card}>
            <div
              className={styles.markdownContent}
              dangerouslySetInnerHTML={{ __html: marked.parse(explanation) as string }}
            />
          </div>
        </>
      )}
    </div>
  )
}