import { useState, useRef, useEffect } from 'react'
import styles from './LocationPicker.module.css'

interface Props {
  lat: string
  lng: string
  onChangeLat: (v: string) => void
  onChangeLng: (v: string) => void
  label?: string
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

export default function LocationPicker({ lat, lng, onChangeLat, onChangeLng, label = 'LOCATION' }: Props) {
  const [mode, setMode] = useState<'manual' | 'search' | 'pick'>('manual')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [pickActive, setPickActive] = useState(false)
  const [pickError, setPickError] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length < 3) { setResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const pickResult = (r: NominatimResult) => {
    onChangeLat(parseFloat(r.lat).toFixed(5))
    onChangeLng(parseFloat(r.lon).toFixed(5))
    setResults([])
    setQuery(r.display_name.split(',')[0])
  }

  // For "pick on map" we use browser geolocation as a fallback
  // and show instructions to copy from the map
  const handlePickMode = () => {
  setMode('pick')
  setPickActive(true)
  setPickError('')
  if (!navigator.geolocation) {
    setPickError('Geolocation not supported. Use manual or search.')
    setPickActive(false)
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onChangeLat(pos.coords.latitude.toFixed(5))
      onChangeLng(pos.coords.longitude.toFixed(5))
      setPickActive(false)
    },
    (_err) => {
      setPickError('Could not get location. Enter manually or search.')
      setPickActive(false)
    },
    { timeout: 5000 }
  )
}

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <div className={styles.modes}>
          {(['manual','search','pick'] as const).map((m) => (
            <button
              key={m}
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => { setMode(m); if (m === 'pick') handlePickMode() }}
              type="button"
            >
              {m === 'manual' ? 'MANUAL' : m === 'search' ? 'SEARCH' : 'MY LOCATION'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'manual' && (
        <div className={styles.coords}>
          <div className={styles.coordField}>
            <span className={styles.coordLabel}>LAT</span>
            <input
              className={styles.coordInput}
              placeholder="16.4234"
              value={lat}
              onChange={(e) => onChangeLat(e.target.value)}
            />
          </div>
          <div className={styles.coordField}>
            <span className={styles.coordLabel}>LNG</span>
            <input
              className={styles.coordInput}
              placeholder="73.8812"
              value={lng}
              onChange={(e) => onChangeLng(e.target.value)}
            />
          </div>
        </div>
      )}

      {mode === 'search' && (
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            placeholder="Search place, address, landmark..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searching && <div className={styles.searchNote}>Searching...</div>}
          {results.length > 0 && (
            <div className={styles.results}>
              {results.map((r, i) => (
                <div key={i} className={styles.result} onClick={() => pickResult(r)}>
                  <div className={styles.resultName}>{r.display_name.split(',').slice(0, 2).join(', ')}</div>
                  <div className={styles.resultCoords}>{parseFloat(r.lat).toFixed(4)}N · {parseFloat(r.lon).toFixed(4)}E</div>
                </div>
              ))}
            </div>
          )}
          {lat && lng && (
            <div className={styles.selectedCoords}>
              Selected: {lat}N · {lng}E
            </div>
          )}
        </div>
      )}

      {mode === 'pick' && (
        <div className={styles.pickWrap}>
          {pickActive && <div className={styles.searchNote}>Getting your location...</div>}
          {pickError && <div className={styles.pickError}>{pickError}</div>}
          {lat && lng && !pickActive && (
            <div className={styles.selectedCoords}>
              Located: {lat}N · {lng}E
            </div>
          )}
          {(pickError || (!pickActive && lat && lng)) && (
            <div className={styles.coords} style={{ marginTop: 6 }}>
              <div className={styles.coordField}>
                <span className={styles.coordLabel}>LAT</span>
                <input className={styles.coordInput} placeholder="16.4234" value={lat} onChange={(e) => onChangeLat(e.target.value)} />
              </div>
              <div className={styles.coordField}>
                <span className={styles.coordLabel}>LNG</span>
                <input className={styles.coordInput} placeholder="73.8812" value={lng} onChange={(e) => onChangeLng(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
