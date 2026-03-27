import { useEffect, useState } from 'react'
import { getOperation, updateOperation } from '../../../api/operations'
import styles from './tabs.module.css'
import { subscribeOperationRefresh } from '../../../lib/operationSync'

const STATUS_OPTIONS = ['draft','active','suspended','escalated','closed','archived']
const TERRAIN_OPTIONS = ['Forest','Urban','Coastal','Highland','Rural','Desert','Mixed']

export default function OpDetails({ operationId }: { operationId: string }) {
  const [op, setOp] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!operationId) return
    const fetchdata = async () => {

    getOperation(operationId)
      .then((data) => { setOp(data); setForm(data) })
      .catch(() => setError('Failed to load operation.'))
  }
  fetchdata()
  const unsubscribe = subscribeOperationRefresh(operationId, () => {
    fetchdata()}
  )
}, [operationId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateOperation(operationId, {
        name: form.name,
        status: form.status,
        terrainRegion: form.terrainRegion,
        searchRadius: parseFloat(form.searchRadius),
        operationalDays: parseInt(form.operationalDays),
        notes: form.notes,
      })
      setOp(updated)
      setEditing(false)
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  if (error) return <div className={styles.wrap}><div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div></div>
  if (!op) return <div className={styles.wrap}><div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading...</div></div>

  if (editing) {
    return (
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          EDIT OPERATION
          <a onClick={() => setEditing(false)}>CANCEL</a>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>NAME</div>
          <input className={styles.inlineInput} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>STATUS</div>
          <select className={styles.inlineSelect} value={form.status ?? 'draft'} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>TERRAIN</div>
          <select className={styles.inlineSelect} value={form.terrainRegion ?? ''} onChange={(e) => set('terrainRegion', e.target.value)}>
            {TERRAIN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>SEARCH RADIUS (km)</div>
          <input className={styles.inlineInput} type="number" value={form.searchRadius ?? ''} onChange={(e) => set('searchRadius', e.target.value)} />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>OPERATIONAL DAYS</div>
          <input className={styles.inlineInput} type="number" value={form.operationalDays ?? ''} onChange={(e) => set('operationalDays', e.target.value)} />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>NOTES</div>
          <textarea className={styles.inlineTextarea} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        OPERATION INFO
        <a onClick={() => setEditing(true)}>EDIT</a>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>NAME</div>
        <div className={styles.fieldVal}>{op.name}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>STATUS</div>
        <div className={styles.fieldVal}>
          <span className={`${styles.statusBadge} ${styles[`status_${op.status}`]}`}>
            {op.status?.toUpperCase()}
          </span>
        </div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>TERRAIN</div>
        <div className={styles.fieldVal}>{op.terrainRegion || '—'}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>SEARCH RADIUS</div>
        <div className={styles.fieldVal}>{op.searchRadius ? `${op.searchRadius} km` : '—'}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>OPERATIONAL DAYS</div>
        <div className={styles.fieldVal}>{op.operationalDays ?? '—'}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>CREATED</div>
        <div className={styles.fieldVal} style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {op.createdAt ? new Date(op.createdAt).toLocaleString() : '—'}
        </div>
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>NOTES</div>
        <div className={styles.fieldMuted}>{op.notes || 'No notes.'}</div>
      </div>
    </div>
  )
}