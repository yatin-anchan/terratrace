import styles from './tabs.module.css'

const LOGS = [
  { time: '14:32', action: 'Simulation run started — 100 agents deployed', hi: true },
  { time: '13:10', action: 'SEC-A marked as searched by Team Alpha', hi: false },
  { time: '11:45', action: 'New evidence added: Boot tracks (conf. 88%)', hi: true },
  { time: '09:14', action: 'Witness sighting logged at trail junction', hi: false },
  { time: '07:42', action: 'Mobile ping received from cell tower 4', hi: true },
  { time: '06:00', action: 'Operation Day 2 started', hi: false },
]

export default function LogDays({ operationId }: { operationId: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>LOG — DAY 2</div>
      {LOGS.map((l, i) => (
        <div key={i} className={`${styles.logRow} ${l.hi ? styles.logRowHi : ''}`}>
          <div className={styles.logTime}>{l.time} UTC</div>
          <div className={styles.logAction}>{l.action}</div>
        </div>
      ))}
    </div>
  )
}