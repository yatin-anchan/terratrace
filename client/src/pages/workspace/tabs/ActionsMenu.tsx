import { useState } from 'react'
import client from '../../../api/client'
import LocationPicker from '../../../components/ui/LocationPicker'
import styles from './tabs.module.css'

type Modal = 'basecamp'|'poi'|'evidence'|'subject'|'sector'|'day'|'export'|null

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:4, padding:20, width:360, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:2, color:'var(--accent)' }}>{title}</div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text3)', fontSize:18, cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function F({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className={styles.field}><div className={styles.fieldLabel}>{label}</div>{children}</div>
}

export default function ActionsMenu({ operationId }: { operationId:string }) {
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string,string>>({})

  const set = (k:string, v:string) => setForm((f) => ({ ...f, [k]:v }))

  const close = () => { setModal(null); setForm({}); setSuccess(''); setError('') }

  const notify = (msg:string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const save = async (endpoint:string, payload:any) => {
    setSaving(true); setError('')
    try {
      await client.post(endpoint, { ...payload, operationId })
      notify('Saved successfully.')
      close()
    } catch { setError('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const ACTIONS = [
    { id:'basecamp' as Modal, label:'Add basecamp',          icon:'▲' },
    { id:'poi'      as Modal, label:'Add point of interest', icon:'●' },
    { id:'evidence' as Modal, label:'Add evidence',          icon:'◎' },
    { id:'subject'  as Modal, label:'Add subject',           icon:'◉' },
    { id:'sector'   as Modal, label:'Add search sector',     icon:'◈' },
    { id:'day'      as Modal, label:'Update search day',     icon:'◆' },
    { id:'export'   as Modal, label:'Export report',         icon:'↓' },
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>ACTIONS MENU</div>

      {success && (
        <div style={{ fontSize:12, color:'var(--success)', padding:'6px 8px', background:'rgba(58,158,106,0.08)', border:'1px solid rgba(58,158,106,0.2)', borderRadius:2, marginBottom:6 }}>
          {success}
        </div>
      )}

      {ACTIONS.map((a) => (
        <button key={a.id ?? ''} className={styles.actBtn} onClick={() => setModal(a.id)}>
          <span style={{ fontSize:13, color:'var(--accent)', flexShrink:0 }}>{a.icon}</span>
          {a.label}
        </button>
      ))}

      {/* BASECAMP */}
      {modal === 'basecamp' && (
        <Modal title="ADD BASECAMP" onClose={close}>
          <F label="NAME"><input className={styles.inlineInput} placeholder="Main basecamp" value={form.name??''} onChange={(e) => set('name',e.target.value)} /></F>
          <LocationPicker label="LOCATION" lat={form.lat??''} lng={form.lng??''} onChangeLat={(v) => set('lat',v)} onChangeLng={(v) => set('lng',v)} />
          <F label="NOTES"><textarea className={styles.inlineTextarea} rows={2} placeholder="Vehicle access, medical tent..." value={form.notes??''} onChange={(e) => set('notes',e.target.value)} /></F>
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/basecamps', { name:form.name, location:{ lat:parseFloat(form.lat), lng:parseFloat(form.lng) }, notes:form.notes })}>
            {saving ? 'SAVING...' : 'ADD BASECAMP'}
          </button>
        </Modal>
      )}

      {/* POI */}
      {modal === 'poi' && (
        <Modal title="ADD POINT OF INTEREST" onClose={close}>
          <F label="NAME"><input className={styles.inlineInput} placeholder="Water source" value={form.name??''} onChange={(e) => set('name',e.target.value)} /></F>
          <F label="TYPE">
            <select className={styles.inlineSelect} value={form.type??'water'} onChange={(e) => set('type',e.target.value)}>
              {['water','shelter','trail','road','cliff','bridge','building','camera','other'].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </F>
          <LocationPicker label="LOCATION" lat={form.lat??''} lng={form.lng??''} onChangeLat={(v) => set('lat',v)} onChangeLng={(v) => set('lng',v)} />
          <F label="NOTES"><textarea className={styles.inlineTextarea} rows={2} placeholder="Small stream, year-round flow..." value={form.notes??''} onChange={(e) => set('notes',e.target.value)} /></F>
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/pois', { name:form.name, type:form.type, location:{ lat:parseFloat(form.lat), lng:parseFloat(form.lng) }, notes:form.notes })}>
            {saving ? 'SAVING...' : 'ADD POI'}
          </button>
        </Modal>
      )}

      {/* EVIDENCE */}
      {modal === 'evidence' && (
        <Modal title="ADD EVIDENCE" onClose={close}>
          <F label="TYPE">
            <select className={styles.inlineSelect} value={form.type??'witness_statement'} onChange={(e) => set('type',e.target.value)}>
              {['witness_statement','cctv_sighting','mobile_ping','clothing_item','tracks','drone_image','field_observation','negative_search'].map((t) => <option key={t} value={t}>{t.replace(/_/g,' ').toUpperCase()}</option>)}
            </select>
          </F>
          <F label={`CONFIDENCE — ${form.confidence??70}%`}>
            <input type="range" min="0" max="100" value={form.confidence??'70'} className={styles.simSlider} onChange={(e) => set('confidence',e.target.value)} />
          </F>
          <F label="SOURCE"><input className={styles.inlineInput} placeholder="Team Alpha, witness name..." value={form.source??''} onChange={(e) => set('source',e.target.value)} /></F>
          <F label="NOTES"><textarea className={styles.inlineTextarea} rows={2} placeholder="Describe what was found..." value={form.notes??''} onChange={(e) => set('notes',e.target.value)} /></F>
          <LocationPicker label="LOCATION" lat={form.lat??''} lng={form.lng??''} onChangeLat={(v) => set('lat',v)} onChangeLng={(v) => set('lng',v)} />
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/evidence', {
              type:form.type??'witness_statement',
              confidenceScore:parseFloat(form.confidence??'70'),
              source:form.source, notes:form.notes,
              location:form.lat?{ lat:parseFloat(form.lat), lng:parseFloat(form.lng) }:null,
              timestamp:new Date().toISOString(),
            })}>
            {saving ? 'SAVING...' : 'ADD EVIDENCE'}
          </button>
        </Modal>
      )}

      {/* SUBJECT */}
      {modal === 'subject' && (
        <Modal title="ADD SUBJECT" onClose={close}>
          <F label="NAME *"><input className={styles.inlineInput} placeholder="Rahul Mehta" value={form.name??''} onChange={(e) => set('name',e.target.value)} /></F>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <F label="AGE"><input className={styles.inlineInput} type="number" placeholder="32" value={form.age??''} onChange={(e) => set('age',e.target.value)} /></F>
            <F label="SEX">
              <select className={styles.inlineSelect} value={form.sex??'male'} onChange={(e) => set('sex',e.target.value)}>
                <option value="male">Male</option><option value="female">Female</option><option value="unknown">Unknown</option>
              </select>
            </F>
          </div>
          <F label="INTENT">
            <select className={styles.inlineSelect} value={form.intentCategory??'unknown'} onChange={(e) => set('intentCategory',e.target.value)}>
              {['lost','injured','fleeing','disoriented','suicidal','voluntary_absence','unknown'].map((o) => <option key={o} value={o}>{o.replace(/_/g,' ').toUpperCase()}</option>)}
            </select>
          </F>
          <F label="CLOTHING"><input className={styles.inlineInput} placeholder="Blue jacket, grey trousers" value={form.clothing??''} onChange={(e) => set('clothing',e.target.value)} /></F>
          <LocationPicker label="LAST KNOWN POSITION (LKP)" lat={form.lat??''} lng={form.lng??''} onChangeLat={(v) => set('lat',v)} onChangeLng={(v) => set('lng',v)} />
          <F label="LAST CONTACT TIME"><input className={styles.inlineInput} type="datetime-local" value={form.lastContact??''} onChange={(e) => set('lastContact',e.target.value)} /></F>
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/subjects', {
              name:form.name, age:form.age?parseInt(form.age):null, sex:form.sex,
              intentCategory:form.intentCategory, clothing:form.clothing,
              lastKnownLocation:form.lat?{ lat:parseFloat(form.lat), lng:parseFloat(form.lng) }:null,
              lastContactTime:form.lastContact||null,
              experienceLevel:'unknown', mobilityLevel:'full',
            })}>
            {saving ? 'SAVING...' : 'ADD SUBJECT'}
          </button>
        </Modal>
      )}

      {/* SECTOR */}
      {modal === 'sector' && (
        <Modal title="ADD SEARCH SECTOR" onClose={close}>
          <F label="SECTOR NAME"><input className={styles.inlineInput} placeholder="SEC-D" value={form.name??''} onChange={(e) => set('name',e.target.value)} /></F>
          <F label="TERRAIN DIFFICULTY">
            <select className={styles.inlineSelect} value={form.difficulty??'moderate'} onChange={(e) => set('difficulty',e.target.value)}>
              {['easy','moderate','hard','extreme'].map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </F>
          <F label="ASSIGNED TEAM"><input className={styles.inlineInput} placeholder="Alpha" value={form.team??''} onChange={(e) => set('team',e.target.value)} /></F>
          <LocationPicker label="CENTER POINT" lat={form.lat??''} lng={form.lng??''} onChangeLat={(v) => set('lat',v)} onChangeLng={(v) => set('lng',v)} />
          <F label="RADIUS (km)"><input className={styles.inlineInput} type="number" placeholder="2" value={form.radius??''} onChange={(e) => set('radius',e.target.value)} /></F>
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/sectors', {
              name:form.name, terrainDifficulty:form.difficulty, assignedTeam:form.team, searched:false,
              polygon:{ center:{ lat:parseFloat(form.lat), lng:parseFloat(form.lng) }, radiusKm:parseFloat(form.radius??'2') },
            })}>
            {saving ? 'SAVING...' : 'ADD SECTOR'}
          </button>
        </Modal>
      )}

      {/* UPDATE DAY */}
      {modal === 'day' && (
        <Modal title="UPDATE SEARCH DAY" onClose={close}>
          <F label="CURRENT DAY"><input className={styles.inlineInput} type="number" placeholder="2" value={form.day??''} onChange={(e) => set('day',e.target.value)} /></F>
          <F label="TOTAL DAYS"><input className={styles.inlineInput} type="number" placeholder="7" value={form.total??''} onChange={(e) => set('total',e.target.value)} /></F>
          <F label="DAY SUMMARY"><textarea className={styles.inlineTextarea} rows={3} placeholder="Teams deployed, sectors searched, evidence found..." value={form.summary??''} onChange={(e) => set('summary',e.target.value)} /></F>
          {error && <div style={{ color:'var(--danger)', fontSize:12, marginBottom:6 }}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving}
            onClick={() => save('/logs', { actionType:'day_updated', affectedEntity:`Day ${form.day} of ${form.total}`, reason:form.summary, newValue:{ day:form.day, total:form.total, summary:form.summary } })}>
            {saving ? 'SAVING...' : 'UPDATE DAY'}
          </button>
        </Modal>
      )}

      {/* EXPORT */}
      {modal === 'export' && (
        <Modal title="EXPORT REPORT" onClose={close}>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:16, lineHeight:1.7 }}>
            Export full operational data including subjects, evidence, search results, and simulation outputs.
          </div>
          <button className={styles.saveBtn}
            onClick={async () => {
              try {
                const res = await client.get(`/operations/${operationId}/export`)
                const blob = new Blob([JSON.stringify(res.data,null,2)], { type:'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `terratrace-${operationId}.json`; a.click()
                URL.revokeObjectURL(url)
                notify('Report downloaded.'); close()
              } catch { setError('Export failed.') }
            }}>
            DOWNLOAD JSON REPORT
          </button>
        </Modal>
      )}
    </div>
  )
}