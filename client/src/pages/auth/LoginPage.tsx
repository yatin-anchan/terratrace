import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { login, register } from '../../api/auth'
import styles from './LoginPage.module.css'

type Tab = 'login' | 'register'

function MapAnimation() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    let map: any
    let animId: number

    const init = async () => {
      const maplibregl = (await import('maplibre-gl')).default
      await import('maplibre-gl/dist/maplibre-gl.css')

      map = new maplibregl.Map({
        container: mapRef.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              paint: {
                'raster-brightness-min': 0,
                'raster-brightness-max': 0.15,
                'raster-saturation': -0.9,
                'raster-contrast': 0.1,
                'raster-opacity': 0.85,
              },
            },
          ],
        },
        center: [73.8812, 16.4234],
        zoom: 12,
        pitch: 40,
        bearing: -15,
        interactive: false,
      })

      let bearing = -15
      const rotate = () => {
        bearing += 0.015
        map.setBearing(bearing)
        animId = requestAnimationFrame(rotate)
      }

      map.on('load', () => {
        rotate()

        map.addSource('sectors', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { searched: true },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[73.865, 16.43],[73.875, 16.43],[73.875, 16.44],[73.865, 16.44],[73.865, 16.43]]],
                },
              },
              {
                type: 'Feature',
                properties: { searched: false },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[73.878, 16.415],[73.892, 16.415],[73.892, 16.427],[73.878, 16.427],[73.878, 16.415]]],
                },
              },
              {
                type: 'Feature',
                properties: { searched: false },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[73.885, 16.43],[73.898, 16.43],[73.898, 16.442],[73.885, 16.442],[73.885, 16.43]]],
                },
              },
            ],
          },
        })

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [73.862, 16.418],
                [73.868, 16.432],
                [73.8812, 16.4234],
                [73.888, 16.428],
                [73.893, 16.436],
                [73.889, 16.445],
              ],
            },
            properties: {},
          },
        })

        map.addSource('heatmap', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', properties: { weight: 1 },   geometry: { type: 'Point', coordinates: [73.8812, 16.4234] } },
              { type: 'Feature', properties: { weight: 0.7 }, geometry: { type: 'Point', coordinates: [73.883,  16.425]  } },
              { type: 'Feature', properties: { weight: 0.5 }, geometry: { type: 'Point', coordinates: [73.879,  16.421]  } },
              { type: 'Feature', properties: { weight: 0.4 }, geometry: { type: 'Point', coordinates: [73.886,  16.428]  } },
              { type: 'Feature', properties: { weight: 0.3 }, geometry: { type: 'Point', coordinates: [73.876,  16.428]  } },
            ],
          },
        })

        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 1.2,
            'heatmap-radius': 40,
            'heatmap-opacity': 0.55,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,0,0)',
              0.3, 'rgba(180,80,80,0.4)',
              0.6, 'rgba(220,100,60,0.6)',
              1,   'rgba(232,200,122,0.8)',
            ],
          },
        })

        map.addLayer({
          id: 'sectors-fill-searched',
          type: 'fill',
          source: 'sectors',
          filter: ['==', ['get', 'searched'], true],
          paint: { 'fill-color': '#3a9e6a', 'fill-opacity': 0.12 },
        })

        map.addLayer({
          id: 'sectors-fill',
          type: 'fill',
          source: 'sectors',
          filter: ['==', ['get', 'searched'], false],
          paint: { 'fill-color': '#e8c87a', 'fill-opacity': 0.06 },
        })

        map.addLayer({
          id: 'sectors-line',
          type: 'line',
          source: 'sectors',
          paint: {
            'line-color': ['case', ['==', ['get', 'searched'], true], '#3a9e6a', '#e8c87a'],
            'line-width': 1,
            'line-opacity': 0.5,
            'line-dasharray': [3, 3],
          },
        })

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#e8c87a',
            'line-width': 1.5,
            'line-opacity': 0.4,
            'line-dasharray': [4, 4],
          },
        })

        const lkpEl = document.createElement('div')
        lkpEl.className = styles.lkpMarker
        new maplibregl.Marker({ element: lkpEl })
          .setLngLat([73.8812, 16.4234])
          .addTo(map)

        const baseEl = document.createElement('div')
        baseEl.className = styles.baseMarker
        new maplibregl.Marker({ element: baseEl })
          .setLngLat([73.862, 16.418])
          .addTo(map)

        const evCoords: [number, number][] = [
          [73.875, 16.432],
          [73.886, 16.425],
          [73.892, 16.438],
        ]
        evCoords.forEach((coord) => {
          const el = document.createElement('div')
          el.className = styles.evMarker
          new maplibregl.Marker({ element: el })
            .setLngLat(coord)
            .addTo(map)
        })
      })
    }

    init().catch(console.error)

    return () => {
      cancelAnimationFrame(animId)
      if (map) map.remove()
    }
  }, [])

  return <div ref={mapRef} className={styles.mapCanvas} />
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'analyst',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  if (!form.email || !form.password) {
    setError('Email and password required.')
    return
  }
  setLoading(true)
  try {
    const data =
      tab === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, form.role)

    if (!data?.token || !data?.user) {
      setError('Invalid response from server.')
      return
    }

    // Save to localStorage FIRST before anything else
    localStorage.setItem('tt_token', data.token)
    localStorage.setItem('tt_user', JSON.stringify(data.user))

    // Then update store
    setAuth(data.user, data.token)

    // Small delay to ensure localStorage is written
    await new Promise((r) => setTimeout(r, 50))

    // Then navigate
    navigate('/operations')
  } catch {
    setError(
      tab === 'login'
        ? 'Invalid email or password.'
        : 'Registration failed. Try again.'
    )
  } finally {
    setLoading(false)
  }
}

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand} onClick={() => navigate('/')}>
          TERRA<span>TRACE</span>
        </div>
        <div className={styles.topbarMeta}>SECURE ACCESS</div>
      </header>

      <div className={styles.body}>
        {/* LEFT — real map */}
        <div className={styles.left}>
          <MapAnimation />
          <div className={styles.mapOverlay}>
            <div className={styles.mapHud}>
              <div className={styles.hudRow}>
                <span className={styles.hudDot} style={{ background: '#3a9e6a' }} />
                <span>OPERATION KESTREL-7 ACTIVE</span>
              </div>
              <div className={styles.hudRow}>
                <span className={styles.hudDot} style={{ background: '#e8c87a' }} />
                <span>3 TEAMS DEPLOYED</span>
              </div>
              <div className={styles.hudRow}>
                <span className={styles.hudDot} style={{ background: '#cc4444' }} />
                <span>SUBJECT LKP LOCKED</span>
              </div>
            </div>
            <div className={styles.mapLabel}>
              LIVE OPERATION VIEW — WESTERN GHATS
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className={styles.right}>
          <div className={styles.formWrap}>
            <div className={styles.formHeader}>
              <div className={styles.formLogo}>
                TERRA<span>TRACE</span>
              </div>
              <p className={styles.formSub}>
                Search &amp; Rescue Intelligence Platform
              </p>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
                onClick={() => { setTab('login'); setError('') }}
              >
                SIGN IN
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
                onClick={() => { setTab('register'); setError('') }}
              >
                REGISTER
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {tab === 'register' && (
                <div className={styles.field}>
                  <label className={styles.label}>FULL NAME</label>
                  <input
                    className={styles.input}
                    placeholder="Yatin Anchan"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>EMAIL ADDRESS</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="operator@sar.gov"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>PASSWORD</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
              </div>

              {tab === 'register' && (
                <div className={styles.field}>
                  <label className={styles.label}>ROLE</label>
                  <select
                    className={styles.select}
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                  >
                    <option value="incident_commander">Incident Commander</option>
                    <option value="search_coordinator">Search Coordinator</option>
                    <option value="field_team_leader">Field Team Leader</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading
                  ? 'AUTHENTICATING...'
                  : tab === 'login'
                  ? 'AUTHENTICATE →'
                  : 'CREATE ACCOUNT →'}
              </button>
            </form>

            <p className={styles.switchNote}>
              {tab === 'login' ? (
                <>No account? <span onClick={() => setTab('register')}>Register here</span></>
              ) : (
                <>Have an account? <span onClick={() => setTab('login')}>Sign in</span></>
              )}
            </p>

            <div className={styles.formFooter}>
              <span className={styles.footerDot} />
              All sessions are logged and audited
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}