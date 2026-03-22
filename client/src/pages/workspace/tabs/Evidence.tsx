import { useEffect, useState } from 'react'
import client from '../../../api/client'
import LocationPicker from '../../../components/ui/LocationPicker'
import styles from './tabs.module.css'

const EVIDENCE_TYPES = [
  'witness_statement','cctv_sighting','mobile_ping',
  'clothing_item','tracks','drone_image','field_observation','negative_search',
]

interface EvidenceItem {
  id: string
  type: string
  confidenceScore: number
  source: string
  notes: string
  location: { lat: number; lng: number } | null
  timestamp: string
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  witness_statement: '#e8c87a',
  cctv_sighting:     '#7a9ee8',
  mobile_ping:       '#7a9ee8',
  clothing_item:     '#c8a860',
  tracks:            '#3a9e6a',
  drone_image:       '#9a7ee8',
  field_observation: '#3a9e6a',
  negative_search:   '#888888',
}

export default function Evidence({ operationId }: { operationId: string }) {
  const [items, setItems]     = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    type: 'witness_statement',
    confidenceScore: '70',
    source: '',
    notes: '',
    lat: '',
    lng: '',
    timestamp: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    client.get(`/evidence/operation/${operationId}`)
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [operationId])

  const handleAdd = async () => {
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        operationId,
        type: form.type,
        confidenceScore: parseFloat(form.confidenceScore),
        source: form.source,
        notes: form.notes,
        timestamp: form.timestamp || new Date().toISOString(),
      }
      if (form.lat && form.lng) {
        payload.location = {
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
        }
      }
      const res = await client.post('/evidence', payload)
      setItems((i) => [res.data, ...i])
      setShowAdd(false)
      setForm({
        type: 'witness_statement', confidenceScore: '70',
        source: '', notes: '', lat: '', lng: '', timestamp: '',
      })
    } catch {
      setError('Failed to add evidence.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this evidence item?')) return
    try {
      await client.delete(`/evidence/${id}`)
      setItems((i) => i.filter((x) => x.id !== id))
    } catch {}
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        EVIDENCE ({items.length})
        <a onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'CANCEL' : '+ ADD'}
        </a>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>TYPE</div>
            <select
              className={styles.inlineSelect}
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              CONFIDENCE — {form.confidenceScore}%
            </div>
            <input
              type="range" min="0" max="100"
              value={form.confidenceScore}
              className={styles.simSlider}
              onChange={(e) => set('confidenceScore', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>SOURCE</div>
            <input
              className={styles.inlineInput}
              placeholder="Team Alpha, witness John D."
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>NOTES</div>
            <textarea
              className={styles.inlineTextarea}
              rows={2}
              placeholder="Describe what was found..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <LocationPicker
            label="LOCATION (optional)"
            lat={form.lat}
            lng={form.lng}
            onChangeLat={(v) => set('lat', v)}
            onChangeLng={(v) => set('lng', v)}
          />

          <div className={styles.field}>
            <div className={styles.fieldLabel}>TIMESTAMP</div>
            <input
              className={styles.inlineInput}
              type="datetime-local"
              value={form.timestamp}
              onChange={(e) => set('timestamp', e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--danger)', fontSize: 12,
              marginBottom: 6, padding: '5px 8px',
              background: 'rgba(204,68,68,0.08)',
              border: '1px solid rgba(204,68,68,0.2)',
              borderRadius: 2,
            }}>
              {error}
            </div>
          )}

          <button
            className={styles.saveBtn}
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? 'ADDING...' : 'ADD EVIDENCE'}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading...</div>
      )}

      {!loading && items.length === 0 && !showAdd && (
        <div className={styles.card}>
          <div className={styles.cardSub}>
            No evidence logged yet. Add evidence as it is found.
          </div>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className={styles.card} style={{ marginBottom: 6 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
          }}>
            <div
              className={styles.evType}
              style={{ color: TYPE_COLORS[item.type] ?? 'var(--accent)' }}
            >
              {item.type.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.timestamp && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text3)',
                }}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  fontSize: 10, padding: '1px 6px',
                  background: 'transparent',
                  border: '1px solid rgba(204,68,68,0.25)',
                  color: 'var(--danger)', cursor: 'pointer',
                  borderRadius: 2, fontFamily: 'var(--font-mono)',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {(item.notes || item.source) && (
            <div className={styles.cardSub} style={{ marginBottom: 4 }}>
              {item.notes || item.source}
            </div>
          )}

          {item.source && item.notes && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
              Source: {item.source}
            </div>
          )}

          {item.location && (
            <div style={{
              fontSize: 10, color: 'var(--text3)',
              fontFamily: 'var(--font-mono)', marginBottom: 4,
            }}>
              {item.location.lat.toFixed(4)}N · {item.location.lng.toFixed(4)}E
            </div>
          )}

          <div className={styles.confBar}>
            <div
              className={styles.confFill}
              style={{ width: `${item.confidenceScore ?? 0}%` }}
            />
          </div>
          <div style={{
            fontSize: 9, color: 'var(--text3)',
            marginTop: 3, fontFamily: 'var(--font-mono)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>CONFIDENCE</span>
            <span style={{ color: 'var(--accent)' }}>
              {item.confidenceScore ?? 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}