import styles from './StatusBar.module.css'

interface StatusBarProps {
  zoom?: number
  mapStyle?: string
  agentCount?: number
}

const indicators = [
  { label: 'DB CONNECTED', color: 'var(--success)' },
  { label: 'WEATHER LIVE', color: 'var(--success)' },
  { label: 'SIM READY', color: 'var(--warn)' },
  { label: 'AI ONLINE', color: 'var(--success)' },
]

export default function StatusBar({ zoom, mapStyle, agentCount }: StatusBarProps) {
  return (
    <footer className={styles.bar}>
      {indicators.map((i) => (
        <div key={i.label} className={styles.item}>
          <span className={styles.dot} style={{ background: i.color }} />
          {i.label}
        </div>
      ))}
      <div className={styles.right}>
        {agentCount !== undefined && (
          <span className={styles.meta}>AGENTS: {agentCount}</span>
        )}
        {mapStyle && (
          <span className={styles.meta}>MAP: {mapStyle.toUpperCase()}</span>
        )}
        {zoom !== undefined && (
          <span className={styles.meta}>ZOOM: {zoom}</span>
        )}
      </div>
    </footer>
  )
}