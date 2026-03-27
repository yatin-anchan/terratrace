import { useEffect, useState } from 'react'
import client from '../../../api/client'
import styles from './tabs.module.css'
import { subscribeOperationRefresh } from '../../../lib/operationSync'

interface FieldResult {
  id: string
  sectorName: string
  teamName: string
  searched: boolean
  coverageQuality: number
  findings: string
  dateSearched: string
  notes: string
}

export default function FieldResults({ operationId }: { operationId: string }) {
  const [results, setResults] = useState<FieldResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sectorName: '', teamName: '', coverageQuality: '80',
    findings: '', notes: '', dateSearched: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!operationId) return
     const fetchdata = async () => {
    client.get(`/field-results/operation/${operationId}`)
      .then((r) => setResults(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  fetchdata()
  const unsubscribe = subscribeOperationRefresh(operationId, () => {
    fetchdata()}
  )
}, [operationId])

  const handleAdd = async () => {
    if (!form.sectorName.trim()) { setError('Sector name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await client.post('/field-results', {
        operationId,
        sectorName: form.sectorName,
        teamName: form.teamName,
        coverageQuality: parseFloat(form.coverageQuality),
        findings: form.findings,
        notes: form.notes,
        dateSearched: form.dateSearched || new Date().toISOString(),
        searched: true,
      })
      setResults((r) => [res.data, ...r])
      setShowAdd(false)
      setForm({ sectorName:'', teamName:'', coverageQuality:'80', findings:'', notes:'', dateSearched:'' })
    } catch {
      setError('Failed to submit field result.')
    } finally {
      setSaving(false)
    }
  }

  const qualityColor = (q: number) =>
    q >= 80 ? 'var(--success)' : q >= 50 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        FIELD RESULTS ({results.length})
        <a onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'CANCEL' : '+ ADD'}</a>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>SECTOR NAME *</div>
              <input className={styles.inlineInput} placeholder="SEC-A" value={form.sectorName} onChange={(e) => set('sectorName', e.target.value)} />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>TEAM NAME</div>
              <input className={styles.inlineInput} placeholder="Alpha" value={form.teamName} onChange={(e) => set('teamName', e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>COVERAGE QUALITY — {form.coverageQuality}%</div>
            <input type="range" min="0" max="100" value={form.coverageQuality}
              className={styles.simSlider} onChange={(e) => set('coverageQuality', e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>FINDINGS</div>
            <textarea className={styles.inlineTextarea} rows={2}
              placeholder="Boot tracks near stream, no visual contact..."
              value={form.findings} onChange={(e) => set('findings', e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>ADDITIONAL NOTES</div>
            <textarea className={styles.inlineTextarea} rows={2}
              placeholder="Dense undergrowth in NE corner, recommend re-search..."
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>DATE / TIME SEARCHED</div>
            <input className={styles.inlineInput} type="datetime-local"
              value={form.dateSearched} onChange={(e) => set('dateSearched', e.target.value)} />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 6 }}>{error}</div>}
          <button className={styles.saveBtn} onClick={handleAdd} disabled={saving}>
            {saving ? 'SUBMITTING...' : 'SUBMIT FIELD RESULT'}
          </button>
        </div>
      )}

      {loading && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading...</div>}

      {!loading && results.length === 0 && !showAdd && (
        <div className={styles.card}>
          <div className={styles.cardSub}>No field results submitted yet. Add results as teams complete searches.</div>
        </div>
      )}

      {results.map((r) => (
        <div key={r.id} className={styles.card} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div className={styles.cardTitle}>
                {r.sectorName}
                {r.teamName && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>— Team {r.teamName}</span>}
              </div>
            </div>
            <span className={styles.statusBadge} style={{
              background: 'rgba(58,158,106,0.12)',
              color: 'var(--success)',
              borderColor: 'rgba(58,158,106,0.3)',
            }}>
              SEARCHED ✓
            </span>
          </div>

          {r.findings && <div className={styles.cardSub} style={{ marginBottom: 6 }}>{r.findings}</div>}
          {r.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{r.notes}</div>}

          <div className={styles.cardMeta}>
            <span>Coverage quality</span>
            <span style={{ color: qualityColor(r.coverageQuality) }}>{r.coverageQuality}%</span>
          </div>
          <div className={styles.confBar}>
            <div style={{ width: `${r.coverageQuality}%`, height: 2, background: qualityColor(r.coverageQuality), borderRadius: 1 }} />
          </div>

          {r.dateSearched && (
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 5 }}>
              {new Date(r.dateSearched).toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}