import { useEffect, useState } from 'react'
import client from '../../../api/client'
import LocationPicker from '../../../components/ui/LocationPicker'
import styles from './tabs.module.css'
import { subscribeOperationRefresh } from '../../../lib/operationSync'

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
  lastKnownLocation: { lat: number; lng: number } | null
  lastContactTime: string
}

const INTENT_OPTIONS     = ['lost','injured','fleeing','disoriented','suicidal','voluntary_absence','unknown']
const EXPERIENCE_OPTIONS = ['none','low','medium','high','expert']
const MOBILITY_OPTIONS   = ['full','limited','injured','immobile']

const INTENT_COLORS: Record<string, string> = {
  suicidal:          'var(--danger)',
  fleeing:           'var(--danger)',
  injured:           'var(--warn)',
  disoriented:       'var(--warn)',
  lost:              'var(--accent)',
  voluntary_absence: 'var(--text3)',
  unknown:           'var(--text3)',
}

export default function Subjects({ operationId }: { operationId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name: '', age: '', sex: 'male', personType: '',
    experienceLevel: 'medium', intentCategory: 'unknown',
    medicalHistory: '', mobilityLevel: 'full',
    clothing: '', lastContactTime: '',
    lat: '', lng: '',
  })

  const set = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const resetForm = () => setForm({
    name: '', age: '', sex: 'male', personType: '',
    experienceLevel: 'medium', intentCategory: 'unknown',
    medicalHistory: '', mobilityLevel: 'full',
    clothing: '', lastContactTime: '',
    lat: '', lng: '',
  })

  useEffect(() => {
    if (!operationId) return
     const fetchdata = async () => {
    client.get(`/subjects/operation/${operationId}`)
      .then((r) => setSubjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  fetchdata()
  
  const unsubscribe = subscribeOperationRefresh(operationId, () => {
    fetchdata()}
  )
}, [operationId])

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        operationId,
        name: form.name.trim(),
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
      if (form.lat && form.lng) {
        payload.lastKnownLocation = {
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
        }
      }
      const res = await client.post('/subjects', payload)
      setSubjects((s) => [...s, res.data])
      setShowAdd(false)
      resetForm()
    } catch {
      setError('Failed to add subject.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this subject from the operation?')) return
    try {
      await client.delete(`/subjects/${id}`)
      setSubjects((s) => s.filter((x) => x.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch {}
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>
        SUBJECTS ({subjects.length})
        <a onClick={() => { setShowAdd((v) => !v); setError('') }}>
          {showAdd ? 'CANCEL' : '+ ADD'}
        </a>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          {/* Name */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>FULL NAME *</div>
            <input
              className={styles.inlineInput}
              placeholder="Rahul Mehta"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Age + Sex */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>AGE</div>
              <input
                className={styles.inlineInput}
                type="number"
                placeholder="34"
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>SEX</div>
              <select
                className={styles.inlineSelect}
                value={form.sex}
                onChange={(e) => set('sex', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          {/* Intent */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>INTENT CATEGORY</div>
            <select
              className={styles.inlineSelect}
              value={form.intentCategory}
              onChange={(e) => set('intentCategory', e.target.value)}
            >
              {INTENT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Experience + Mobility */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>EXPERIENCE</div>
              <select
                className={styles.inlineSelect}
                value={form.experienceLevel}
                onChange={(e) => set('experienceLevel', e.target.value)}
              >
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>MOBILITY</div>
              <select
                className={styles.inlineSelect}
                value={form.mobilityLevel}
                onChange={(e) => set('mobilityLevel', e.target.value)}
              >
                {MOBILITY_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clothing */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>CLOTHING DESCRIPTION</div>
            <input
              className={styles.inlineInput}
              placeholder="Blue jacket, grey trousers, red cap..."
              value={form.clothing}
              onChange={(e) => set('clothing', e.target.value)}
            />
          </div>

          {/* Medical */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>MEDICAL HISTORY</div>
            <input
              className={styles.inlineInput}
              placeholder="Diabetes, heart condition, no known allergies..."
              value={form.medicalHistory}
              onChange={(e) => set('medicalHistory', e.target.value)}
            />
          </div>

          {/* Person type */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>PERSON TYPE</div>
            <input
              className={styles.inlineInput}
              placeholder="Hiker, dementia patient, child..."
              value={form.personType}
              onChange={(e) => set('personType', e.target.value)}
            />
          </div>

          {/* LKP with LocationPicker */}
          <LocationPicker
            label="LAST KNOWN POSITION (LKP)"
            lat={form.lat}
            lng={form.lng}
            onChangeLat={(v) => set('lat', v)}
            onChangeLng={(v) => set('lng', v)}
          />

          {/* Last contact */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>LAST CONTACT TIME</div>
            <input
              className={styles.inlineInput}
              type="datetime-local"
              value={form.lastContactTime}
              onChange={(e) => set('lastContactTime', e.target.value)}
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
            {saving ? 'ADDING...' : 'ADD SUBJECT'}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading...</div>
      )}

      {!loading && subjects.length === 0 && !showAdd && (
        <div className={styles.card}>
          <div className={styles.cardSub}>
            No subjects added yet. Add a missing person to begin tracking.
          </div>
        </div>
      )}

      {subjects.map((s) => (
        <div
          key={s.id}
          className={styles.card}
          style={{ marginBottom: 8, cursor: 'pointer' }}
          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.cardTitle}>
                {s.name}
                {s.age ? (
                  <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>
                    / Age {s.age}
                  </span>
                ) : null}
                {s.sex && s.sex !== 'unknown' ? (
                  <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 4, fontSize: 11 }}>
                    · {s.sex.toUpperCase()}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                {s.intentCategory && (
                  <span
                    className={styles.tag}
                    style={{
                      color: INTENT_COLORS[s.intentCategory] ?? 'var(--text3)',
                      borderColor: (INTENT_COLORS[s.intentCategory] ?? 'var(--border2)') + '44',
                    }}
                  >
                    {s.intentCategory.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
                {s.experienceLevel && s.experienceLevel !== 'unknown' && (
                  <span className={styles.tag}>{s.experienceLevel.toUpperCase()}</span>
                )}
                {s.mobilityLevel && s.mobilityLevel !== 'full' && (
                  <span className={`${styles.tag} ${styles.tagRisk}`}>
                    {s.mobilityLevel.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
              style={{
                fontSize: 9, padding: '3px 8px',
                background: 'transparent',
                border: '1px solid rgba(204,68,68,0.3)',
                color: 'var(--danger)', cursor: 'pointer',
                borderRadius: 2, fontFamily: 'var(--font-mono)',
                flexShrink: 0, marginLeft: 8,
              }}
            >
              REMOVE
            </button>
          </div>

          {expandedId === s.id && (
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}>
              {s.clothing && (
                <div className={styles.cardMeta}>
                  <span>Clothing</span>
                  <span style={{ textAlign: 'right', maxWidth: '60%' }}>{s.clothing}</span>
                </div>
              )}
              {s.medicalHistory && (
                <div className={styles.cardMeta}>
                  <span>Medical</span>
                  <span style={{ textAlign: 'right', maxWidth: '60%' }}>{s.medicalHistory}</span>
                </div>
              )}
              {s.personType && (
                <div className={styles.cardMeta}>
                  <span>Type</span>
                  <span>{s.personType}</span>
                </div>
              )}
              {s.lastKnownLocation && (
                <div className={styles.cardMeta}>
                  <span>LKP</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {s.lastKnownLocation.lat.toFixed(4)}N · {s.lastKnownLocation.lng.toFixed(4)}E
                  </span>
                </div>
              )}
              {s.lastContactTime && (
                <div className={styles.cardMeta}>
                  <span>Last contact</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {new Date(s.lastContactTime).toLocaleString()}
                  </span>
                </div>
              )}
              {!s.lastKnownLocation && (
                <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                  No LKP set — add via Edit or Actions menu.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}