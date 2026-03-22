import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSimulationStore } from '../../store/useSimulationStore'
import client from '../../api/client'
import styles from './MapView.module.css'

const MAP_STYLES = ['DARK','SAT','LIGHT','TOPO','CONTOUR','3D','TRAFFIC','WEATHER','POPULATION'] as const
type MapStyle = typeof MAP_STYLES[number]

interface MapViewProps {
  mapStyle: string
  onStyleChange: (s: string) => void
  onZoomChange: (z: number) => void
  operationId?: string
}

const getBaseStyle = (style: MapStyle): maplibregl.StyleSpecification => {
  switch (style) {
    case 'SAT':        return { version:8, sources:{ sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256}}, layers:[{id:'sat',type:'raster',source:'sat',paint:{'raster-saturation':-0.2,'raster-brightness-max':0.7}}] }
    case 'LIGHT':      return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-brightness-min':0.85,'raster-brightness-max':1,'raster-saturation':-0.3}}] }
    case 'TOPO':       return { version:8, sources:{ topo:{type:'raster',tiles:['https://tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'topo',type:'raster',source:'topo',paint:{'raster-brightness-max':0.6,'raster-saturation':-0.4}}] }
    case 'CONTOUR':    return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-brightness-max':0.1,'raster-saturation':-1,'raster-contrast':0.3}}] }
    case '3D':         return { version:8, sources:{ sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256}, terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium'}}, terrain:{source:'terrain',exaggeration:2.5}, layers:[{id:'sat',type:'raster',source:'sat',paint:{'raster-saturation':-0.2}}] }
    case 'TRAFFIC':    return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-0.8,'raster-brightness-max':0.2}}] }
    case 'WEATHER':    return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-0.7,'raster-brightness-max':0.25}}] }
    case 'POPULATION': return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-0.6,'raster-brightness-max':0.3,'raster-hue-rotate':200}}] }
    default:           return { version:8, sources:{ osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-brightness-max':0.15,'raster-saturation':-1,'raster-contrast':0.2}}] }
  }
}

const EVIDENCE_COLORS: Record<string,string> = {
  witness_statement:'#e8c87a', cctv_sighting:'#7a9ee8', mobile_ping:'#7a9ee8',
  clothing_item:'#c8a860', tracks:'#3a9e6a', drone_image:'#9a7ee8',
  field_observation:'#3a9e6a', negative_search:'#888888',
}

const LABEL_LAYERS = [
  {id:'roads',label:'Roads',color:'#e8c87a'},{id:'streets',label:'Streets',color:'#c8a860'},
  {id:'rivers',label:'Rivers',color:'#7a9ee8'},{id:'seas',label:'Seas',color:'#4a7ec8'},
  {id:'oceans',label:'Oceans',color:'#2a5ea8'},{id:'peaks',label:'Peaks',color:'#cc4444'},
  {id:'mountains',label:'Mountains',color:'#a03030'},{id:'ranges',label:'Ranges',color:'#804020'},
] as const
type LabelLayerId = typeof LABEL_LAYERS[number]['id']

export default function MapView({ mapStyle, onStyleChange, onZoomChange, operationId }: MapViewProps) {
  const containerRef       = useRef<HTMLDivElement>(null)
  const mapRef             = useRef<maplibregl.Map | null>(null)
  const evidenceMarkersRef = useRef<maplibregl.Marker[]>([])
  const basecampMarkersRef = useRef<maplibregl.Marker[]>([])
  const subjectMarkersRef  = useRef<maplibregl.Marker[]>([])
  const hotspotMarkersRef  = useRef<maplibregl.Marker[]>([])
  const labelMarkersRef    = useRef<maplibregl.Marker[]>([])
  const popupRef           = useRef<maplibregl.Popup | null>(null)
  const flewToRef          = useRef(false)

  const [coords, setCoords]   = useState({ lat: 20.5937, lng: 78.9629 })
  const [zoom, setZoom]       = useState(5)
  const [mapReady, setMapReady] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(['hotspot-circles','agent-paths']))
  const [activeLabelLayers, setActiveLabelLayers] = useState<Set<LabelLayerId>>(new Set())

  const { hotspots, samplePaths, hasResults } = useSimulationStore()

  const showPopup = useCallback((map: maplibregl.Map, lngLat: maplibregl.LngLatLike, html: string) => {
    if (popupRef.current) popupRef.current.remove()
    popupRef.current = new maplibregl.Popup({ closeButton: false, className: 'tt-popup', offset: 14 })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map)
  }, [])

  // ── evidence ───────────────────────────────────────────────────
  const loadEvidence = useCallback(async (map: maplibregl.Map) => {
    if (!operationId) return
    evidenceMarkersRef.current.forEach((m) => m.remove())
    evidenceMarkersRef.current = []
    try {
      const res = await client.get(`/evidence/operation/${operationId}`)
      const items: any[] = res.data ?? []
      items.forEach((ev) => {
        if (!ev.location?.lat || !ev.location?.lng) return
        const color = EVIDENCE_COLORS[ev.type] ?? '#e8c87a'
        const el = document.createElement('div')
        el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.2);box-shadow:0 0 8px ${color}88;cursor:pointer;transition:transform 0.15s`
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.7)'
          showPopup(map, [ev.location.lng, ev.location.lat],
            `<div class="tt-popup-inner">
              <div class="tt-popup-title" style="color:${color}">${ev.type.replace(/_/g,' ').toUpperCase()}</div>
              <div class="tt-popup-row">${ev.notes || '—'}</div>
              ${ev.source ? `<div class="tt-popup-row">Source: <span>${ev.source}</span></div>` : ''}
              <div class="tt-popup-row">Confidence: <span>${ev.confidenceScore ?? 0}%</span></div>
              <div class="tt-popup-row" style="font-size:9px;color:var(--text3);margin-top:4px">${Number(ev.location.lat).toFixed(4)}N · ${Number(ev.location.lng).toFixed(4)}E</div>
            </div>`)
        })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        evidenceMarkersRef.current.push(
          new maplibregl.Marker({ element: el }).setLngLat([ev.location.lng, ev.location.lat]).addTo(map)
        )
      })
    } catch {}
  }, [operationId, showPopup])

  // ── subjects ───────────────────────────────────────────────────
  const loadSubjects = useCallback(async (map: maplibregl.Map) => {
    if (!operationId) return
    subjectMarkersRef.current.forEach((m) => m.remove())
    subjectMarkersRef.current = []
    try {
      const res = await client.get(`/subjects/operation/${operationId}`)
      const subs: any[] = res.data ?? []
      let firstLKP: [number,number] | null = null
      subs.forEach((s) => {
        if (!s.lastKnownLocation?.lat || !s.lastKnownLocation?.lng) return
        const lngLat: [number,number] = [s.lastKnownLocation.lng, s.lastKnownLocation.lat]
        if (!firstLKP) firstLKP = lngLat
        const el = document.createElement('div')
        el.style.cssText = 'position:relative;width:24px;height:24px;cursor:pointer'
        el.innerHTML = `
          <div style="position:absolute;inset:0;border-radius:50%;border:1px solid rgba(204,68,68,0.5);animation:lkpPulse 2s ease-in-out infinite"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#cc4444;border:2px solid rgba(204,68,68,0.7)"></div>
        `
        el.addEventListener('mouseenter', () => {
          showPopup(map, lngLat,
            `<div class="tt-popup-inner">
              <div class="tt-popup-title" style="color:#cc4444">LKP — ${s.name ?? 'Unknown'}</div>
              ${s.age ? `<div class="tt-popup-row">Age: <span>${s.age}</span></div>` : ''}
              ${s.intentCategory ? `<div class="tt-popup-row">Intent: <span>${s.intentCategory.replace(/_/g,' ')}</span></div>` : ''}
              ${s.clothing ? `<div class="tt-popup-row">Clothing: <span>${s.clothing}</span></div>` : ''}
              ${s.lastContactTime ? `<div class="tt-popup-row">Last contact: <span>${new Date(s.lastContactTime).toLocaleString()}</span></div>` : ''}
              <div class="tt-popup-row" style="font-size:9px;color:var(--text3);margin-top:4px">${Number(s.lastKnownLocation.lat).toFixed(4)}N · ${Number(s.lastKnownLocation.lng).toFixed(4)}E</div>
            </div>`)
        })
        subjectMarkersRef.current.push(
          new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
        )
      })
      if (firstLKP && !flewToRef.current) {
        flewToRef.current = true
        map.flyTo({ center: firstLKP, zoom: 13, duration: 1400 })
      }
    } catch {}
  }, [operationId, showPopup])

  // ── basecamps ──────────────────────────────────────────────────
  const loadBasecamps = useCallback(async (map: maplibregl.Map) => {
    if (!operationId) return
    basecampMarkersRef.current.forEach((m) => m.remove())
    basecampMarkersRef.current = []
    try {
      const res = await client.get(`/basecamps/operation/${operationId}`)
      const items: any[] = res.data ?? []
      items.forEach((b) => {
        if (!b.location?.lat || !b.location?.lng) return
        const el = document.createElement('div')
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
        el.innerHTML = `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #3a9e6a;filter:drop-shadow(0 0 5px rgba(58,158,106,0.7))"></div><div style="font-family:'Courier New',monospace;font-size:8px;color:#3a9e6a;letter-spacing:1px;margin-top:2px;white-space:nowrap">${b.name ?? 'BASE'}</div>`
        el.addEventListener('mouseenter', () => {
          showPopup(map, [b.location.lng, b.location.lat],
            `<div class="tt-popup-inner"><div class="tt-popup-title" style="color:#3a9e6a">BASECAMP — ${b.name}</div>${b.notes ? `<div class="tt-popup-row">${b.notes}</div>` : ''}</div>`)
        })
        basecampMarkersRef.current.push(
          new maplibregl.Marker({ element: el }).setLngLat([b.location.lng, b.location.lat]).addTo(map)
        )
      })
    } catch {}
  }, [operationId, showPopup])

  // ── fly to operation area if no subject LKP ────────────────────
  const flyToOperationArea = useCallback(async (map: maplibregl.Map) => {
    if (!operationId || flewToRef.current) return
    try {
      const res = await client.get(`/operations/${operationId}`)
      const op = res.data
      if (op?.areaOfInterest?.lat && op?.areaOfInterest?.lng) {
        flewToRef.current = true
        map.flyTo({
          center: [op.areaOfInterest.lng, op.areaOfInterest.lat],
          zoom: 12,
          duration: 1400,
        })
      }
    } catch {}
  }, [operationId])

  // ── load all ───────────────────────────────────────────────────
  const loadAllData = useCallback(async (map: maplibregl.Map) => {
    await loadSubjects(map)
    await loadEvidence(map)
    await loadBasecamps(map)
    await flyToOperationArea(map)
  }, [loadSubjects, loadEvidence, loadBasecamps, flyToOperationArea])

  // ── label layers ───────────────────────────────────────────────
  const addLabelLayerToMap = useCallback((map: maplibregl.Map, layerId: LabelLayerId) => {
    const cfgMap: Record<LabelLayerId, { coords:[number,number][]; lineCoords?:[number,number][]; label:string; color:string }> = {
      roads:     { coords:[[78.96,20.58]], lineCoords:[[78.90,20.55],[78.96,20.58],[79.02,20.55]], label:'ROAD',          color:'#e8c87a' },
      streets:   { coords:[[78.96,20.60]], lineCoords:[[78.93,20.60],[79.00,20.58]],               label:'STREET',        color:'#c8a860' },
      rivers:    { coords:[[78.93,20.57]], lineCoords:[[78.90,20.54],[78.95,20.57],[79.00,20.55]], label:'RIVER',         color:'#7a9ee8' },
      seas:      { coords:[[78.85,20.50]],                                                          label:'SEA',           color:'#4a7ec8' },
      oceans:    { coords:[[78.80,20.45]],                                                          label:'OCEAN',         color:'#2a5ea8' },
      peaks:     { coords:[[78.98,20.62]],                                                          label:'▲ PEAK',        color:'#cc4444' },
      mountains: { coords:[[79.02,20.65]],                                                          label:'▲ MOUNTAIN',    color:'#a03030' },
      ranges:    { coords:[[78.92,20.68]],                                                          label:'RANGE',         color:'#804020' },
    }
    const cfg = cfgMap[layerId]
    if (!cfg) return
    if (cfg.lineCoords) {
      const srcId = `lbl-line-${layerId}`
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:cfg.lineCoords }, properties:{} } })
        map.addLayer({ id:`${srcId}-layer`, type:'line', source:srcId, paint:{ 'line-color':cfg.color, 'line-width':layerId==='roads'?2.5:1.5, 'line-opacity':0.6, 'line-dasharray':layerId==='rivers'?[1,2]:[1,0] } })
      }
    }
    cfg.coords.forEach((coord) => {
      const el = document.createElement('div')
      el.style.cssText = `font-family:'Courier New',monospace;font-size:10px;color:${cfg.color};letter-spacing:1px;pointer-events:none;white-space:nowrap;text-shadow:0 0 8px rgba(0,0,0,0.9);padding:2px 5px;background:rgba(8,10,18,0.5);border-radius:1px`
      el.textContent = cfg.label
      labelMarkersRef.current.push(new maplibregl.Marker({ element:el, anchor:'bottom' }).setLngLat(coord).addTo(map))
    })
  }, [])

  const removeLabelLayerFromMap = useCallback((map: maplibregl.Map, layerId: LabelLayerId) => {
    const srcId = `lbl-line-${layerId}`
    if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`)
    if (map.getSource(srcId)) map.removeSource(srcId)
  }, [])

  // ── simulation ─────────────────────────────────────────────────
  const plotSimulation = useCallback((map: maplibregl.Map, hs: typeof hotspots, paths: typeof samplePaths) => {
    hotspotMarkersRef.current.forEach((m) => m.remove())
    hotspotMarkersRef.current = []
    try {
      if (map.getLayer('agent-paths'))      map.removeLayer('agent-paths')
      if (map.getSource('agent-paths'))     map.removeSource('agent-paths')
      if (map.getLayer('hotspot-circles'))  map.removeLayer('hotspot-circles')
      if (map.getSource('hotspot-circles')) map.removeSource('hotspot-circles')
    } catch {}
    if (hs.length === 0) return

    map.addSource('hotspot-circles', { type:'geojson', data:{ type:'FeatureCollection', features:hs.map((h) => ({ type:'Feature' as const, properties:{ probability:h.probability }, geometry:{ type:'Point' as const, coordinates:[h.lng,h.lat] } })) } })
    map.addLayer({ id:'hotspot-circles', type:'circle', source:'hotspot-circles', paint:{
      'circle-radius':['interpolate',['linear'],['get','probability'],0,15,100,60],
      'circle-color':['interpolate',['linear'],['get','probability'],0,'rgba(232,200,122,0.08)',30,'rgba(192,128,58,0.2)',60,'rgba(204,68,68,0.3)',100,'rgba(204,68,68,0.5)'],
      'circle-stroke-color':['interpolate',['linear'],['get','probability'],0,'#e8c87a',50,'#c0803a',100,'#cc4444'],
      'circle-stroke-width':1.5,'circle-blur':0.5,
    }})

    hs.forEach((h, i) => {
      const color = i===0?'#cc4444':i===1?'#c0803a':'#e8c87a'
      const el = document.createElement('div')
      el.style.cssText = `font-family:'Courier New',monospace;font-size:11px;color:${color};background:rgba(8,10,18,0.88);border:1px solid ${color}66;padding:3px 8px;border-radius:2px;pointer-events:none;white-space:nowrap;letter-spacing:1px`
      el.textContent = `${h.label}  ${h.probability}%`
      hotspotMarkersRef.current.push(new maplibregl.Marker({ element:el, anchor:'bottom' }).setLngLat([h.lng,h.lat]).addTo(map))
    })

    if (paths.length > 0) {
      const bc: Record<string,string> = { trail_follower:'#e8c87a', downhill:'#7a9ee8', random_walk:'#7a9e7a', shelter_seek:'#cc4444', stationary:'#888' }
      map.addSource('agent-paths', { type:'geojson', data:{ type:'FeatureCollection', features:paths.map((a) => ({ type:'Feature' as const, properties:{ behavior:a.behavior }, geometry:{ type:'LineString' as const, coordinates:a.path.map((p) => [p.lng,p.lat]) } })) } })
      map.addLayer({ id:'agent-paths', type:'line', source:'agent-paths', paint:{ 'line-color':['match',['get','behavior'],'trail_follower',bc.trail_follower,'downhill',bc.downhill,'random_walk',bc.random_walk,'shelter_seek',bc.shelter_seek,'stationary',bc.stationary,'#e8c87a'], 'line-width':0.8, 'line-opacity':0.22 } })
    }

    if (hs[0]) map.flyTo({ center:[hs[0].lng,hs[0].lat], zoom:13, duration:1200 })
  }, [])

  // ── init ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBaseStyle('DARK'),
      center: [78.9629, 20.5937],
      zoom: 5,
      pitch: 30,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass:true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left' as any)
    map.on('mousemove', (e) => setCoords({ lat:parseFloat(e.lngLat.lat.toFixed(4)), lng:parseFloat(e.lngLat.lng.toFixed(4)) }))
    map.on('zoom', () => { const z=Math.round(map.getZoom()); setZoom(z); onZoomChange(z) })
    map.on('load', () => { loadAllData(map); setMapReady(true) })
    mapRef.current = map
    return () => {
      setMapReady(false)
      evidenceMarkersRef.current.forEach((m) => m.remove())
      basecampMarkersRef.current.forEach((m) => m.remove())
      subjectMarkersRef.current.forEach((m) => m.remove())
      hotspotMarkersRef.current.forEach((m) => m.remove())
      labelMarkersRef.current.forEach((m) => m.remove())
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── reload when operationId changes ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    flewToRef.current = false
    loadAllData(map)
  }, [operationId, mapReady])

  // ── style change ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.easeTo({ pitch: mapStyle==='3D'?55:30, duration:400 })
    map.setStyle(getBaseStyle(mapStyle as MapStyle))
    map.once('styledata', () => {
      loadAllData(map)
      activeLabelLayers.forEach((id) => addLabelLayerToMap(map, id))
      if (hasResults && hotspots.length > 0) plotSimulation(map, hotspots, samplePaths)
    })
  }, [mapStyle, mapReady])

  // ── simulation results ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    plotSimulation(map, hotspots, samplePaths)
  }, [hotspots, samplePaths, hasResults, mapReady])

  // ── auto-refresh evidence every 30s ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !operationId) return
    const interval = setInterval(() => loadEvidence(map), 30000)
    return () => clearInterval(interval)
  }, [mapReady, operationId, loadEvidence])

  // ── layer toggle ───────────────────────────────────────────────
  const toggleLayer = useCallback((layerId: string) => {
    const map = mapRef.current
    if (!map || !mapReady) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) { next.delete(layerId); try { map.setLayoutProperty(layerId,'visibility','none') } catch {} }
      else                   { next.add(layerId);    try { map.setLayoutProperty(layerId,'visibility','visible') } catch {} }
      return next
    })
  }, [mapReady])

  const toggleLabelLayer = useCallback((layerId: LabelLayerId) => {
    const map = mapRef.current
    if (!map || !mapReady) return
    setActiveLabelLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) {
        next.delete(layerId)
        removeLabelLayerFromMap(map, layerId)
        labelMarkersRef.current.forEach((m) => m.remove())
        labelMarkersRef.current = []
        next.forEach((id) => addLabelLayerToMap(map, id))
      } else {
        next.add(layerId)
        addLabelLayerToMap(map, layerId)
      }
      return next
    })
  }, [mapReady, addLabelLayerToMap, removeLabelLayerFromMap])

  const refreshMarkers = () => {
    const map = mapRef.current
    if (!map) return
    loadEvidence(map)
    loadSubjects(map)
    loadBasecamps(map)
  }

  const LAYER_TOGGLES = [
    { id:'hotspot-circles', label:'Hotspots',    color:'#cc4444' },
    { id:'agent-paths',     label:'Agent paths', color:'#7a9ee8' },
    { id:'traffic-lines',   label:'Traffic',     color:'#cc4444' },
    { id:'weather-dots',    label:'Weather',     color:'#4a9ee8' },
    { id:'pop-heatmap',     label:'Population',  color:'#ff6040' },
  ]

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.mapContainer} />

      <div className={styles.styleBar}>
        {MAP_STYLES.map((s) => (
          <button key={s} className={`${styles.styleBtn} ${mapStyle===s?styles.styleBtnActive:''}`} onClick={() => onStyleChange(s)}>{s}</button>
        ))}
      </div>

      <div className={styles.layerPanel}>
        <div className={styles.layerPanelTitle}>LAYERS</div>
        {LAYER_TOGGLES.map((l) => (
          <button key={l.id} className={`${styles.layerToggle} ${visibleLayers.has(l.id)?styles.layerToggleOn:''}`} onClick={() => toggleLayer(l.id)}>
            <span className={styles.layerDot} style={{ background:visibleLayers.has(l.id)?l.color:'#2a3048' }} />
            {l.label}
            {l.id==='hotspot-circles' && hasResults && <span style={{ marginLeft:'auto', fontSize:9, color:'#3a9e6a' }}>LIVE</span>}
          </button>
        ))}
        <div className={styles.layerDivider}>MAP LABELS</div>
        {LABEL_LAYERS.map((l) => (
          <button key={l.id} className={`${styles.layerToggle} ${activeLabelLayers.has(l.id)?styles.layerToggleOn:''}`} onClick={() => toggleLabelLayer(l.id)}>
            <span className={styles.layerDot} style={{ background:activeLabelLayers.has(l.id)?l.color:'#2a3048' }} />
            {l.label}
          </button>
        ))}
        <div className={styles.layerDivider} />
        <button className={styles.layerToggle} onClick={refreshMarkers}>
          <span className={styles.layerDot} style={{ background:'var(--success)' }} />
          Refresh markers
        </button>
      </div>

      <div className={styles.coordBar}>
        <span>{coords.lat}N · {coords.lng}E · ZOOM {zoom}</span>
        {mapStyle==='WEATHER'    && <span className={styles.wxBadge}>WEATHER OVERLAY</span>}
        {mapStyle==='TRAFFIC'    && <span className={styles.wxBadge} style={{ color:'#c0803a' }}>TRAFFIC LIVE</span>}
        {mapStyle==='3D'         && <span className={styles.wxBadge}>3D TERRAIN</span>}
        {mapStyle==='POPULATION' && <span className={styles.wxBadge} style={{ color:'#ff6040' }}>POPULATION DENSITY</span>}
        {hasResults              && <span className={styles.wxBadge} style={{ color:'#3a9e6a' }}>SIM PLOTTED</span>}
      </div>

      <div className={styles.legend}>
        {[
          { color:'#cc4444', label:'LKP' },
          { color:'#e8c87a', label:'Evidence' },
          { color:'#3a9e6a', label:'Tracks' },
          { color:'#7a9ee8', label:'Ping/CCTV' },
          { color:'#cc4444', label:'Hotspot', faded:true },
        ].map((item) => (
          <div key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background:item.color, opacity:item.faded?0.5:1 }} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <span style={{ width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderBottom:'8px solid #3a9e6a', display:'inline-block', flexShrink:0 }} />
          <span>Basecamp</span>
        </div>
      </div>
    </div>
  )
}