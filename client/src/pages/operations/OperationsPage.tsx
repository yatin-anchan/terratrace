import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperationStore } from '../../store/useOperationStore'
import { getOperations, deleteOperation, createOperation } from '../../api/operations'
import Topbar from '../../components/layout/Topbar'
import StatusBar from '../../components/layout/StatusBar'
import Badge from '../../components/ui/Badge'
import LocationPicker from '../../components/ui/LocationPicker'
import type { Operation } from '../../types'
import styles from './OperationsPage.module.css'

export default function OperationsPage() {
  const navigate = useNavigate()
  const { operations, setOperations, removeOperation, addOperation, selectOperation } =
    useOperationStore()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const [newName, setNewName] = useState('')
  const [newTerrain, setNewTerrain] = useState('Forest')
  const [newRadius, setNewRadius] = useState('10')
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [newMode, setNewMode] = useState<'manual' | 'ai_driven'>('manual')

  useEffect(() => {
    getOperations()
      .then(setOperations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setOperations])

  const filtered = operations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.terrainRegion ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleOpen = (op: Operation) => {
    selectOperation(op)
    navigate(`/workspace/${op.id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this operation?')) return
    await deleteOperation(id)
    removeOperation(id)
    setSelected((s) => s.filter((x) => x !== id))
  }

  const handleDeleteSelected = async () => {
    if (!selected.length) return
    if (!confirm(`Delete ${selected.length} operation(s)?`)) return
    await Promise.all(selected.map(deleteOperation))
    selected.forEach(removeOperation)
    setSelected([])
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    const op = await createOperation({
      name: newName.trim(),
      terrainRegion: newTerrain,
      status: 'draft',
      operationalDays: 7,
      searchRadius: parseFloat(newRadius) || 10,
      areaOfInterest:
        newMode === 'manual' && newLat && newLng
          ? { lat: parseFloat(newLat), lng: parseFloat(newLng) }
          : null,
      mode: newMode,
    })

    addOperation(op)
    selectOperation(op)
    setShowNew(false)
    setNewName('')
    setNewLat('')
    setNewLng('')
    setNewRadius('10')
    setNewTerrain('Forest')
    setNewMode('manual')
    navigate(`/workspace/${op.id}`)
  }

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className={styles.page}>
      <Topbar />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search operations by name or terrain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={styles.btnNew} onClick={() => setShowNew(true)}>
          + NEW OPERATION
        </button>
        {selected.length > 0 && (
          <button className={styles.btnDel} onClick={handleDeleteSelected}>
            DELETE ({selected.length})
          </button>
        )}
      </div>

      {showNew && (
        <div className={styles.newModal}>
          <div className={styles.newCard}>
            <p className={styles.newTitle}>NEW OPERATION</p>

            <label className={styles.newLabel}>OPERATION MODE</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['manual', 'ai_driven'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setNewMode(m)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    border: `2px solid ${newMode === m ? 'var(--accent)' : 'var(--border2)'}`,
                    background: newMode === m ? 'rgba(232,200,122,0.08)' : 'var(--bg3)',
                    color: newMode === m ? 'var(--accent)' : 'var(--text3)',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '1px',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                  }}
                >
                  {m === 'manual' ? '⚙ MANUAL' : '◈ AI DRIVEN'}
                  <div
                    style={{
                      fontSize: 9,
                      marginTop: 4,
                      opacity: 0.6,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {m === 'manual'
                      ? 'You control all data entry'
                      : 'AI guides the operation via chat'}
                  </div>
                </button>
              ))}
            </div>

            <label className={styles.newLabel}>OPERATION NAME</label>
            <input
              className={styles.newInput}
              placeholder="e.g. KESTREL-7"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />

            <label className={styles.newLabel}>TERRAIN</label>
            <select
              className={styles.newInput}
              value={newTerrain}
              onChange={(e) => setNewTerrain(e.target.value)}
            >
              <option>Forest</option>
              <option>Urban</option>
              <option>Coastal</option>
              <option>Highland</option>
              <option>Rural</option>
              <option>Desert</option>
              <option>Mixed</option>
            </select>

            <label className={styles.newLabel}>SEARCH RADIUS (km)</label>
            <input
              className={styles.newInput}
              type="number"
              placeholder="10"
              value={newRadius}
              onChange={(e) => setNewRadius(e.target.value)}
            />

            {newMode === 'manual' ? (
              <div style={{ marginBottom: 14 }}>
                <LocationPicker
                  label="AREA OF INTEREST (OPERATION CENTER)"
                  lat={newLat}
                  lng={newLng}
                  onChangeLat={setNewLat}
                  onChangeLng={setNewLng}
                />
              </div>
            ) : (
              <div
                style={{
                  marginBottom: 14,
                  padding: '12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  borderRadius: 4,
                  color: 'var(--text2)',
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 6,
                  }}
                >
                  AI-DRIVEN SETUP
                </div>
                The AI assistant will collect the missing person’s last known location
                during guided setup. The user can type coordinates manually or pick a
                point on the map later.
              </div>
            )}

            <div className={styles.newActions}>
              <button className={styles.btnNew} onClick={handleCreate}>
                CREATE
              </button>
              <button className={styles.btnCancel} onClick={() => setShowNew(false)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>LOADING OPERATIONS...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          NO OPERATIONS FOUND. <span onClick={() => setShowNew(true)}>CREATE ONE →</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((op) => (
            <div
              key={op.id}
              className={`${styles.card} ${selected.includes(op.id) ? styles.cardSel : ''}`}
              onClick={() => toggleSelect(op.id)}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardCheck}>
                  <input
                    type="checkbox"
                    checked={selected.includes(op.id)}
                    onChange={() => toggleSelect(op.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <span className={styles.cardName}>{op.name}</span>
                <Badge status={op.status} />
              </div>

              <div className={styles.cardMeta}>
                <span>{op.terrainRegion || 'Unknown terrain'}</span>
                <span>{op.searchRadius ? `${op.searchRadius}km radius` : ''}</span>
                <span
                  style={{
                    color: op.mode === 'ai_driven' ? 'var(--accent)' : 'var(--text3)',
                    fontSize: 9,
                    letterSpacing: '0.5px',
                  }}
                >
                  {op.mode === 'ai_driven' ? '◈ AI DRIVEN' : '⚙ MANUAL'}
                </span>
              </div>

              <div className={styles.progBg}>
                <div
                  className={styles.progFill}
                  style={{
                    width: `${Math.min(100, (1 / (op.operationalDays || 7)) * 100)}%`,
                  }}
                />
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpen(op)
                  }}
                >
                  OPEN
                </button>
                <button
                  className={styles.btnDelCard}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(op.id)
                  }}
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StatusBar />
    </div>
  )
}