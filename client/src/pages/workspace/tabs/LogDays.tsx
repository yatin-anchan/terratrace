import { useEffect, useState } from 'react'
import client from '../../../api/client'
import styles from './tabs.module.css'

interface LogEntry {
  id: string
  actionType: string
  affectedEntity: string
  previousValue: any
  newValue: any
  reason: string
  createdAt: string
  userId: string
}

const ACTION_COLORS: Record<string, string> = {
  operation_created:    'var(--success)',
  operation_updated:    'var(--accent)',
  subject_added:        'var(--accent)',
  subject_removed:      'var(--danger)',
  evidence_added:       'var(--accent)',
  evidence_removed:     'var(--danger)',
  simulation_run:       '#9a7ee8',
  sector_searched:      'var(--success)',
  sector_added:         'var(--accent)',
  field_result_added:   'var(--success)',
  basecamp_added:       'var(--accent)',
  poi_added:            'var(--accent)',
}

const ACTION_ICONS: Record<string, string> = {
  operation_created:  '◆',
  operation_updated:  '◈',
  subject_added:      '◉',
  subject_removed:    '◌',
  evidence_added:     '◎',
  evidence_removed:   '◌',
  simulation_run:     '▶',
  sector_searched:    '✓',
  sector_added:       '◈',
  field_result_added: '◉',
  basecamp_added:     '▲',
  poi_added:          '●',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function LogDays({ operationId }: { operationId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    client.get(`/logs/operation/${operationId}`)
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [operationId])

  const ACTION_TYPES = ['all', ...Array.from(new Set(logs.map((l) => l.actionType)))]

  const filtered = filter === 'all'
    ? logs
    : logs.filter((l) => l.actionType === filter)

  // Group by day
  const grouped: Record<string, LogEntry[]> = {}
  filtered.forEach((log) => {
    const day = new Date(log.createdAt).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(log)
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        ACTIVITY LOG
        <span style={{ color: 'var(--text3)' }}>{logs.length} ENTRIES</span>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {ACTION_TYPES.slice(0, 6).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              fontSize: 9, padding: '2px 7px',
              background: filter === t ? 'var(--accent)' : 'var(--bg3)',
              color: filter === t ? '#080a10' : 'var(--text3)',
              border: `1px solid ${filter === t ? 'var(--accent)' : 'var(--border2)'}`,
              cursor: 'pointer', borderRadius: 2,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
              transition: 'all 0.15s',
            }}
          >
            {t === 'all' ? 'ALL' : t.replace(/_/g, ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading logs...</div>}

      {!loading && filtered.length === 0 && (
        <div className={styles.card}>
          <div className={styles.cardSub}>No activity logged yet. Actions taken in the operation will appear here.</div>
        </div>
      )}

      {Object.entries(grouped).map(([day, dayLogs]) => (
        <div key={day}>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: 'var(--text3)',
            fontFamily: 'var(--font-mono)', marginBottom: 6, marginTop: 8,
            paddingBottom: 4, borderBottom: '1px solid var(--border)',
          }}>
            {day.toUpperCase()}
          </div>
          {dayLogs.map((log) => (
            <div
              key={log.id}
              className={styles.logRow}
              style={{ borderLeftColor: ACTION_COLORS[log.actionType] ?? 'var(--border2)', cursor: 'pointer', marginBottom: 8 }}
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: ACTION_COLORS[log.actionType] ?? 'var(--text3)' }}>
                    {ACTION_ICONS[log.actionType] ?? '●'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>
                    {log.actionType.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <span className={styles.logTime}>{timeAgo(log.createdAt)}</span>
              </div>

              {log.affectedEntity && (
                <div className={styles.logAction}>{log.affectedEntity}</div>
              )}
              {log.reason && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{log.reason}</div>
              )}

              {expanded === log.id && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  {log.newValue && (
                    <div style={{ fontSize: 10, color: 'var(--text2)', background: 'var(--bg)', padding: '4px 6px', borderRadius: 2, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {typeof log.newValue === 'object' ? JSON.stringify(log.newValue, null, 2) : String(log.newValue)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}