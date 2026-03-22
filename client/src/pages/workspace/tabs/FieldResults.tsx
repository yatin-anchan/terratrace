import styles from './tabs.module.css'

const RESULTS = [
  { sector: 'SEC-A', team: 'Alpha', quality: 94, findings: 'No contact. Dense undergrowth searched.', searched: true },
  { sector: 'SEC-C', team: 'Bravo', quality: 60, findings: 'Boot tracks found near stream. Evidence logged.', searched: true },
]

export default function FieldResults({ operationId }: { operationId: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        FIELD RESULTS <a>+ ADD</a>
      </div>
      {RESULTS.map((r, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardTitle}>{r.sector} — Team {r.team}</div>
          <div className={styles.cardSub}>{r.findings}</div>
          <div className={styles.cardMeta}>
            <span>COVERAGE: {r.quality}%</span>
            <span className={styles.tagOk}>SEARCHED</span>
          </div>
          <div className={styles.confBar}>
            <div className={styles.confFill} style={{ width: `${r.quality}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}