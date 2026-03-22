import { useEffect, useState } from 'react'
import client from '../../../api/client'
import styles from './tabs.module.css'

interface Subject {
  id: string
  name: string
  age: number
  sex: string
  personType: string
  experienceLevel: string
  intentCategory: string
  medicalHistory: string
  mobilityLevel: string
  clothing: string
  lastKnownLocation: any
  lastContactTime: string
  behaviorProfile: any
}

const INTENT_OPTIONS = ['lost','injured','fleeing','disoriented','suicidal','voluntary_absence','unknown']
const EXPERIENCE_OPTIONS = ['none','low','medium','high','expert']
const MOBILITY_OPTIONS = ['full','limited','injured','immobile']

export default function Subjects({ operationId }: { operationId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', age: '', sex: 'male', personType: '',
    experienceLevel: 'medium', intentCategory: 'unknown',
    medicalHistory: '', mobilityLevel: 'full',
    clothing: '', lastContactTime: '',
    lastKnownLat: '', lastKnownLng: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    client.get(`/subjects/operation/${operationId}`)
      .then((r) => setSubjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [operationId])

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        operationId,
        name: form.name,
        age: form.age ? parseInt(form.age) : null,
        sex: form.sex,
        personType: form.personType,
        experienceLevel: form.experienceLevel,
        intentCategory: form.intentCategory,
        medicalHistory: form.medicalHistory,
        mobilityLevel: form.mobilityLevel,
        clothing: form.clothing,
        lastContactTime: form.lastContactTime || null,
      }
      if (form.lastKnownLat && form.lastKnownLng) {
        payload.lastKnownLocation = {
          lat: parseFloat(form.lastKnownLat),
          lng: parseFloat(form.lastKnownLng),
        }
      }
      const res = await client.post('/subjects', payload)
      setSubjects((s) => [...s, res.data])
      setShowAdd(false)
      setForm({ name:'',age:'',sex:'male',personType:'',experienceLevel:'medium',intentCategory:'unknown',medicalHistory:'',mobilityLevel:'full',clothing:'',lastContactTime:'',lastKnownLat:'',lastKnownLng:'' })
    } catch {
      setError('Failed to add subject.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this subject?')) return
    try {
      await client.delete(`/subjects/${id}`)
      setSubjects((s) => s.filter((x) => x.id !== id))
    } catch {}
  }

  const riskColor = (intent: string) => {
    if (['suicidal','fleeing'].includes(intent)) return 'var(--danger)'
    if (['injured','disoriented'].includes(intent)) return 'var(--warn)'
    return 'var(--success)'
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        SUBJECTS ({subjects.length})
        <a onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'CANCEL' : '+ ADD'}</a>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>NAME *</div>
            <input className={styles.inlineInput} placeholder="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>AGE</div>
              <input className={styles.inlineInput} type="number" placeholder="34" value={form.age} onChange={(e) => set('age', e.target.value)} />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>SEX</div>
              <select className={styles.inlineSelect} value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>INTENT</div>
            <select className={styles.inlineSelect} value={form.intentCategory} onChange={(e) => set('intentCategory', e.target.value)}>
              {INTENT_OPTIONS.map((o) => <option key={o} value={o}>{o.replace(/_/g,' ').toUpperCase()}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>EXPERIENCE</div>
              <select className={styles.inlineSelect} value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>MOBILITY</div>
              <select className={styles.inlineSelect} value={form.mobilityLevel} onChange={(e) => set('mobilityLevel', e.target.value)}>
                {MOBILITY_OPTIONS.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>CLOTHING</div>
            <input className={styles.inlineInput} placeholder="Blue jacket, grey trousers" value={form.clothing} onChange={(e) => set('clothing', e.target.value)} />
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>MEDICAL HISTORY</div>
            <input className={styles.inlineInput} placeholder="Diabetes, no injuries" value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>LKP LAT</div>
              <input className={styles.inlineInput} placeholder="16.4234" value={form.lastKnownLat} onChange={(e) => set('lastKnownLat', e.target.value)} />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>LKP LNG</div>
              <input className={styles.inlineInput} placeholder="73.8812" value={form.lastKnownLng} onChange={(e) => set('lastKnownLng', e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>LAST CONTACT TIME</div>
            <input className={styles.inlineInput} type="datetime-local" value={form.lastContactTime} onChange={(e) => set('lastContactTime', e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 6 }}>{error}</div>}
          <button className={styles.saveBtn} onClick={handleAdd} disabled={saving}>
            {saving ? 'ADDING...' : 'ADD SUBJECT'}
          </button>
        </div>
      )}

      {loading && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading...</div>}

      {!loading && subjects.length === 0 && !showAdd && (
        <div className={styles.card}>
          <div className={styles.cardSub}>No subjects added yet.</div>
        </div>
      )}

      {subjects.map((s) => (
        <div key={s.id} className={styles.card} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className={styles.cardTitle}>{s.name} {s.age ? `/ AGE ${s.age}` : ''}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                {s.intentCategory && (
                  <span className={styles.tag} style={{ color: riskColor(s.intentCategory), borderColor: riskColor(s.intentCategory) + '44' }}>
                    {s.intentCategory.replace(/_/g,' ').toUpperCase()}
                  </span>
                )}
                {s.experienceLevel && <span className={styles.tag}>{s.experienceLevel.toUpperCase()}</span>}
                {s.mobilityLevel && <span className={styles.tag}>{s.mobilityLevel.toUpperCase()}</span>}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
              style={{ fontSize: 9, padding: '2px 7px', background: 'transparent', border: '1px solid rgba(204,68,68,0.3)', color: 'var(--danger)', cursor: 'pointer', borderRadius: 2, fontFamily: 'var(--font-mono)', flexShrink: 0 }}
            >
              REMOVE
            </button>
          </div>

          {expandedId === s.id && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              {s.clothing && <div className={styles.cardMeta}><span>Clothing</span><span>{s.clothing}</span></div>}
              {s.medicalHistory && <div className={styles.cardMeta}><span>Medical</span><span>{s.medicalHistory}</span></div>}
              {s.lastKnownLocation && (
                <div className={styles.cardMeta}>
                  <span>LKP</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {s.lastKnownLocation.lat}N · {s.lastKnownLocation.lng}E
                  </span>
                </div>
              )}
              {s.lastContactTime && (
                <div className={styles.cardMeta}>
                  <span>Last contact</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {new Date(s.lastContactTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}