import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSimulationStore } from '../../store/useSimulationStore'
import styles from './MapView.module.css'

const MAP_STYLES = ['DARK', 'SAT', 'LIGHT', 'TOPO', 'CONTOUR', '3D', 'TRAFFIC', 'WEATHER', 'POPULATION'] as const
type MapStyle = typeof MAP_STYLES[number]

interface MapViewProps {
  mapStyle: string
  onStyleChange: (s: string) => void
  onZoomChange: (z: number) => void
  operationId?: string
}

const getBaseStyle = (style: MapStyle): maplibregl.StyleSpecification => {
  switch (style) {
    case 'SAT':
      return { version: 8, sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 } }, layers: [{ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.2, 'raster-brightness-max': 0.7 } }] }
    case 'LIGHT':
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-brightness-min': 0.85, 'raster-brightness-max': 1, 'raster-saturation': -0.3 } }] }
    case 'TOPO':
      return { version: 8, sources: { topo: { type: 'raster', tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'topo', type: 'raster', source: 'topo', paint: { 'raster-brightness-max': 0.6, 'raster-saturation': -0.4 } }] }
    case 'CONTOUR':
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-brightness-max': 0.1, 'raster-saturation': -1, 'raster-contrast': 0.3 } }] }
    case '3D':
      return { version: 8, sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 }, terrain: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, encoding: 'terrarium' } }, terrain: { source: 'terrain', exaggeration: 2.5 }, layers: [{ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.2 } }] }
    case 'TRAFFIC':
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.8, 'raster-brightness-max': 0.2 } }] }
    case 'WEATHER':
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.7, 'raster-brightness-max': 0.25 } }] }
    case 'POPULATION':
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.6, 'raster-brightness-max': 0.3, 'raster-hue-rotate': 200 } }] }
    default:
      return { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-brightness-max': 0.15, 'raster-saturation': -1, 'raster-contrast': 0.2 } }] }
  }
}

const DEMO_SECTORS = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { id: 'sec-a', name: 'SEC-A', searched: true,  priority: 0.78 }, geometry: { type: 'Polygon' as const, coordinates: [[[73.865,16.43],[73.875,16.43],[73.875,16.44],[73.865,16.44],[73.865,16.43]]] } },
    { type: 'Feature' as const, properties: { id: 'sec-b', name: 'SEC-B', searched: false, priority: 0.55 }, geometry: { type: 'Polygon' as const, coordinates: [[[73.878,16.415],[73.895,16.415],[73.895,16.430],[73.878,16.430],[73.878,16.415]]] } },
    { type: 'Feature' as const, properties: { id: 'sec-c', name: 'SEC-C', searched: false, priority: 0.32 }, geometry: { type: 'Polygon' as const, coordinates: [[[73.885,16.432],[73.900,16.432],[73.900,16.445],[73.885,16.445],[73.885,16.432]]] } },
  ],
}

const DEMO_EVIDENCE = [
  { lng: 73.875, lat: 16.432, type: 'witness_statement', confidence: 72, label: 'Witness sighting', color: '#e8c87a' },
  { lng: 73.886, lat: 16.425, type: 'mobile_ping',       confidence: 55, label: 'Mobile ping',     color: '#7a9ee8' },
  { lng: 73.892, lat: 16.438, type: 'tracks',            confidence: 88, label: 'Boot tracks',     color: '#3a9e6a' },
]

const DEMO_HEATMAP = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { weight: 1.0 }, geometry: { type: 'Point' as const, coordinates: [73.8812, 16.4234] } },
    { type: 'Feature' as const, properties: { weight: 0.8 }, geometry: { type: 'Point' as const, coordinates: [73.883,  16.425]  } },
    { type: 'Feature' as const, properties: { weight: 0.6 }, geometry: { type: 'Point' as const, coordinates: [73.879,  16.421]  } },
    { type: 'Feature' as const, properties: { weight: 0.5 }, geometry: { type: 'Point' as const, coordinates: [73.886,  16.428]  } },
    { type: 'Feature' as const, properties: { weight: 0.4 }, geometry: { type: 'Point' as const, coordinates: [73.876,  16.430]  } },
  ],
}

const LABEL_LAYERS = [
  { id: 'roads',     label: 'Roads',     color: '#e8c87a' },
  { id: 'streets',   label: 'Streets',   color: '#c8a860' },
  { id: 'rivers',    label: 'Rivers',    color: '#7a9ee8' },
  { id: 'seas',      label: 'Seas',      color: '#4a7ec8' },
  { id: 'oceans',    label: 'Oceans',    color: '#2a5ea8' },
  { id: 'peaks',     label: 'Peaks',     color: '#cc4444' },
  { id: 'mountains', label: 'Mountains', color: '#a03030' },
  { id: 'ranges',    label: 'Ranges',    color: '#804020' },
] as const
type LabelLayerId = typeof LABEL_LAYERS[number]['id']

const LABEL_CONFIGS: Record<LabelLayerId, { coords: [number,number][]; lineCoords?: [number,number][]; label: string; color: string }> = {
  roads:     { coords: [[73.868,16.425]], lineCoords: [[73.862,16.418],[73.878,16.425],[73.892,16.438]], label: 'ROAD',           color: '#e8c87a' },
  streets:   { coords: [[73.874,16.430]], lineCoords: [[73.870,16.430],[73.882,16.422]],                label: 'STREET',         color: '#c8a860' },
  rivers:    { coords: [[73.882,16.432]], lineCoords: [[73.875,16.428],[73.885,16.435],[73.895,16.430]],label: 'KRISHNA RIVER',  color: '#7a9ee8' },
  seas:      { coords: [[73.860,16.412]],                                                               label: 'ARABIAN SEA',    color: '#4a7ec8' },
  oceans:    { coords: [[73.855,16.406]],                                                               label: 'INDIAN OCEAN',   color: '#2a5ea8' },
  peaks:     { coords: [[73.882,16.442]],                                                               label: '▲ PEAK 1247m',   color: '#cc4444' },
  mountains: { coords: [[73.890,16.447]],                                                               label: '▲ MT. SAHYADRI', color: '#a03030' },
  ranges:    { coords: [[73.875,16.452]],                                                               label: 'WESTERN GHATS',  color: '#804020' },
}

export default function MapView({ mapStyle, onStyleChange, onZoomChange }: MapViewProps) {
  const containerRef        = useRef<HTMLDivElement>(null)
  const mapRef              = useRef<maplibregl.Map | null>(null)
  const markersRef          = useRef<maplibregl.Marker[]>([])
  const labelMarkersRef     = useRef<maplibregl.Marker[]>([])
  const hotspotMarkersRef   = useRef<maplibregl.Marker[]>([])

  const [coords, setCoords]               = useState({ lat: 16.4234, lng: 73.8812 })
  const [zoom, setZoom]                   = useState(13)
  const [mapReady, setMapReady]           = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(['heatmap-layer','sectors-fill-searched','sectors-fill-pending','sectors-line','route-line'])
  )
  const [activeLabelLayers, setActiveLabelLayers] = useState<Set<LabelLayerId>>(new Set())

  const { hotspots, samplePaths, hasResults } = useSimulationStore()

  // ─── operational layers ──────────────────────────────────────────
  const addOperationalLayers = useCallback((map: maplibregl.Map, currentStyle: string) => {
    if (!map.getSource('heatmap')) {
      map.addSource('heatmap', { type: 'geojson', data: DEMO_HEATMAP })
      map.addLayer({ id: 'heatmap-layer', type: 'heatmap', source: 'heatmap', paint: { 'heatmap-weight': ['get','weight'], 'heatmap-intensity': 1.5, 'heatmap-radius': 50, 'heatmap-opacity': 0.6, 'heatmap-color': ['interpolate',['linear'],['heatmap-density'], 0,'rgba(0,0,0,0)', 0.2,'rgba(100,50,50,0.3)', 0.5,'rgba(180,80,60,0.6)', 0.8,'rgba(220,120,60,0.8)', 1,'rgba(232,200,122,1)'] } })
    }
    if (!map.getSource('sectors')) {
      map.addSource('sectors', { type: 'geojson', data: DEMO_SECTORS })
      map.addLayer({ id: 'sectors-fill-searched', type: 'fill', source: 'sectors', filter: ['==',['get','searched'],true],  paint: { 'fill-color': '#3a9e6a', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'sectors-fill-pending',  type: 'fill', source: 'sectors', filter: ['==',['get','searched'],false], paint: { 'fill-color': '#e8c87a', 'fill-opacity': 0.08 } })
      map.addLayer({ id: 'sectors-line', type: 'line', source: 'sectors', paint: { 'line-color': ['case',['==',['get','searched'],true],'#3a9e6a','#e8c87a'], 'line-width': 1.5, 'line-dasharray': [4,3] } })
      map.addLayer({ id: 'sectors-labels', type: 'symbol', source: 'sectors', layout: { 'text-field': ['get','name'], 'text-size': 12 }, paint: { 'text-color': '#d4d8e8', 'text-halo-color': '#080a12', 'text-halo-width': 2 } })
    }
    const addPopup = (layerId: string, searched: boolean) => {
      map.on('click', layerId, (e) => {
        if (!e.features?.[0]) return
        const p = e.features[0].properties
        new maplibregl.Popup({ closeButton: true, className: 'tt-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`<div class="tt-popup-inner"><div class="tt-popup-title">${p?.name??''}</div>${!searched?`<div class="tt-popup-row">Priority: <span>${Math.round((p?.priority??0)*100)}%</span></div>`:''}<div class="tt-popup-row">Status: <span style="color:${searched?'#3a9e6a':'#c0803a'}">${searched?'SEARCHED ✓':'PENDING'}</span></div></div>`)
          .addTo(map)
      })
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
    }
    addPopup('sectors-fill-pending', false)
    addPopup('sectors-fill-searched', true)

    if (!map.getSource('route')) {
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[73.862,16.418],[73.868,16.432],[73.8812,16.4234],[73.888,16.428],[73.893,16.436]] }, properties: {} } })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#e8c87a', 'line-width': 1.5, 'line-opacity': 0.5, 'line-dasharray': [3,4] } })
    }
    if (currentStyle === 'TRAFFIC' && !map.getSource('traffic-overlay')) {
      map.addSource('traffic-overlay', { type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { congestion: 'high'   }, geometry: { type: 'LineString', coordinates: [[73.862,16.418],[73.875,16.425],[73.885,16.432]] } },
        { type: 'Feature', properties: { congestion: 'medium' }, geometry: { type: 'LineString', coordinates: [[73.875,16.432],[73.890,16.438]] } },
        { type: 'Feature', properties: { congestion: 'low'    }, geometry: { type: 'LineString', coordinates: [[73.890,16.438],[73.900,16.445]] } },
      ]}})
      map.addLayer({ id: 'traffic-lines', type: 'line', source: 'traffic-overlay', paint: { 'line-width': 5, 'line-opacity': 0.85, 'line-color': ['case',['==',['get','congestion'],'high'],'#cc4444',['==',['get','congestion'],'medium'],'#c0803a','#3a9e6a'] } })
    }
    if (currentStyle === 'WEATHER' && !map.getSource('weather-overlay')) {
      const wxF = Array.from({ length: 25 }, (_, i) => ({ type: 'Feature' as const, properties: { intensity: 0.3 + Math.random() * 0.7 }, geometry: { type: 'Point' as const, coordinates: [73.85+(i%5)*0.015, 16.41+Math.floor(i/5)*0.01] } }))
      map.addSource('weather-overlay', { type: 'geojson', data: { type: 'FeatureCollection', features: wxF } })
      map.addLayer({ id: 'weather-dots', type: 'circle', source: 'weather-overlay', paint: { 'circle-radius': 10, 'circle-color': '#4a9ee8', 'circle-opacity': ['get','intensity'], 'circle-blur': 1 } })
    }
    if (currentStyle === 'POPULATION' && !map.getSource('pop-overlay')) {
      map.addSource('pop-overlay', { type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { weight: 0.9 }, geometry: { type: 'Point', coordinates: [73.88,16.42] } },
        { type: 'Feature', properties: { weight: 0.5 }, geometry: { type: 'Point', coordinates: [73.87,16.435] } },
        { type: 'Feature', properties: { weight: 0.3 }, geometry: { type: 'Point', coordinates: [73.895,16.428] } },
      ]}})
      map.addLayer({ id: 'pop-heatmap', type: 'heatmap', source: 'pop-overlay', paint: { 'heatmap-weight': ['get','weight'], 'heatmap-radius': 60, 'heatmap-opacity': 0.5, 'heatmap-color': ['interpolate',['linear'],['heatmap-density'], 0,'rgba(0,0,0,0)', 0.3,'rgba(0,100,255,0.3)', 0.7,'rgba(255,100,0,0.6)', 1,'rgba(255,0,0,0.8)'] } })
    }
  }, [])

  // ─── markers ─────────────────────────────────────────────────────
  const addMarkers = useCallback((map: maplibregl.Map) => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    DEMO_EVIDENCE.forEach((ev) => {
      const el = document.createElement('div')
      el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${ev.color};border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 8px ${ev.color}88;cursor:pointer;transition:transform 0.15s`
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false, className: 'tt-popup' })
        .setHTML(`<div class="tt-popup-inner"><div class="tt-popup-title">${ev.type.replace(/_/g,' ').toUpperCase()}</div><div class="tt-popup-row">${ev.label}</div><div class="tt-popup-row">Confidence: <span>${ev.confidence}%</span></div></div>`)
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([ev.lng, ev.lat]).setPopup(popup).addTo(map))
    })

    const lkpEl = document.createElement('div')
    lkpEl.style.cssText = 'position:relative;width:22px;height:22px;cursor:pointer'
    lkpEl.innerHTML = `<div style="position:absolute;inset:0;border-radius:50%;border:1px solid rgba(204,68,68,0.5);animation:lkpPulse 2s ease-in-out infinite"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#cc4444;border:2px solid rgba(204,68,68,0.7)"></div>`
    const lkpPopup = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'tt-popup' })
      .setHTML(`<div class="tt-popup-inner"><div class="tt-popup-title" style="color:#cc4444">LKP — RAHUL M.</div><div class="tt-popup-row">Last contact: 31h ago</div><div class="tt-popup-row">16.4234N · 73.8812E</div></div>`)
    markersRef.current.push(new maplibregl.Marker({ element: lkpEl }).setLngLat([73.8812, 16.4234]).setPopup(lkpPopup).addTo(map))

    const baseEl = document.createElement('div')
    baseEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
    baseEl.innerHTML = `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #3a9e6a;filter:drop-shadow(0 0 5px rgba(58,158,106,0.7))"></div><div style="font-family:'Courier New',monospace;font-size:8px;color:#3a9e6a;letter-spacing:1px;margin-top:2px;white-space:nowrap">BASE</div>`
    markersRef.current.push(new maplibregl.Marker({ element: baseEl }).setLngLat([73.862, 16.418]).addTo(map))
  }, [])

  // ─── label layers ─────────────────────────────────────────────────
  const addLabelLayerToMap = useCallback((map: maplibregl.Map, layerId: LabelLayerId) => {
    const cfg = LABEL_CONFIGS[layerId]
    if (!cfg) return
    if (cfg.lineCoords) {
      const srcId = `lbl-line-${layerId}`
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: cfg.lineCoords }, properties: {} } })
        map.addLayer({ id: `${srcId}-layer`, type: 'line', source: srcId, paint: { 'line-color': cfg.color, 'line-width': layerId === 'roads' ? 2.5 : 1.5, 'line-opacity': 0.6, 'line-dasharray': layerId === 'rivers' ? [1,2] : [1,0] } })
      }
    }
    cfg.coords.forEach((coord) => {
      const el = document.createElement('div')
      el.style.cssText = `font-family:'Courier New',monospace;font-size:10px;color:${cfg.color};letter-spacing:1px;pointer-events:none;white-space:nowrap;text-shadow:0 0 8px rgba(0,0,0,0.9);padding:2px 5px;background:rgba(8,10,18,0.5);border-radius:1px`
      el.textContent = cfg.label
      labelMarkersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(coord).addTo(map))
    })
  }, [])

  const removeLabelLayerFromMap = useCallback((map: maplibregl.Map, layerId: LabelLayerId) => {
    const srcId = `lbl-line-${layerId}`
    if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`)
    if (map.getSource(srcId)) map.removeSource(srcId)
  }, [])

  // ─── init map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBaseStyle('DARK'),
      center: [73.8812, 16.4234],
      zoom: 13,
      pitch: 30,
      bearing: 0,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left' as any)
    map.on('mousemove', (e) => setCoords({ lat: parseFloat(e.lngLat.lat.toFixed(4)), lng: parseFloat(e.lngLat.lng.toFixed(4)) }))
    map.on('zoom', () => { const z = Math.round(map.getZoom()); setZoom(z); onZoomChange(z) })
    map.on('load', () => { addOperationalLayers(map, 'DARK'); addMarkers(map); setMapReady(true) })

    mapRef.current = map
    return () => {
      setMapReady(false)
      markersRef.current.forEach((m) => m.remove())
      labelMarkersRef.current.forEach((m) => m.remove())
      hotspotMarkersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      labelMarkersRef.current = []
      hotspotMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ─── style change ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.easeTo({ pitch: mapStyle === '3D' ? 55 : 30, duration: 400 })
    map.setStyle(getBaseStyle(mapStyle as MapStyle))
    map.once('styledata', () => {
      addOperationalLayers(map, mapStyle)
      addMarkers(map)
      activeLabelLayers.forEach((id) => addLabelLayerToMap(map, id))
      // Re-plot simulation results if available
      if (hasResults && hotspots.length > 0) {
        plotSimulationResults(map, hotspots, samplePaths)
      }
    })
  }, [mapStyle, mapReady])

  // ─── simulation results on map ───────────────────────────────────
  const plotSimulationResults = useCallback((
    map: maplibregl.Map,
    hs: typeof hotspots,
    paths: typeof samplePaths,
  ) => {
    // Clear old sim layers
    hotspotMarkersRef.current.forEach((m) => m.remove())
    hotspotMarkersRef.current = []
    try {
      if (map.getLayer('agent-paths'))      map.removeLayer('agent-paths')
      if (map.getSource('agent-paths'))     map.removeSource('agent-paths')
      if (map.getLayer('hotspot-circles'))  map.removeLayer('hotspot-circles')
      if (map.getSource('hotspot-circles')) map.removeSource('hotspot-circles')
      if (map.getLayer('hotspot-pulse'))    map.removeLayer('hotspot-pulse')
    } catch {}

    if (hs.length === 0) return

    // Hotspot glow circles
    map.addSource('hotspot-circles', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: hs.map((h) => ({
          type: 'Feature' as const,
          properties: { probability: h.probability, label: h.label },
          geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] },
        })),
      },
    })

    map.addLayer({
      id: 'hotspot-circles',
      type: 'circle',
      source: 'hotspot-circles',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'probability'], 0, 15, 100, 60],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'probability'],
          0,   'rgba(232,200,122,0.08)',
          30,  'rgba(192,128,58,0.2)',
          60,  'rgba(204,68,68,0.3)',
          100, 'rgba(204,68,68,0.5)',
        ],
        'circle-stroke-color': [
          'interpolate', ['linear'], ['get', 'probability'],
          0,   '#e8c87a',
          50,  '#c0803a',
          100, '#cc4444',
        ],
        'circle-stroke-width': 1.5,
        'circle-blur': 0.5,
      },
    })

    // Hotspot label markers
    hs.forEach((h, i) => {
      const color = i === 0 ? '#cc4444' : i === 1 ? '#c0803a' : '#e8c87a'
      const el = document.createElement('div')
      el.style.cssText = `
        font-family:'Courier New',monospace;font-size:11px;
        color:${color};background:rgba(8,10,18,0.88);
        border:1px solid ${color}66;padding:3px 8px;
        border-radius:2px;pointer-events:none;white-space:nowrap;
        letter-spacing:1px;box-shadow:0 0 12px ${color}33;
      `
      el.textContent = `${h.label}  ${h.probability}%`
      hotspotMarkersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([h.lng, h.lat])
          .addTo(map)
      )
    })

    // Agent path lines
    if (paths.length > 0) {
      const behaviorColors: Record<string, string> = {
        trail_follower: '#e8c87a',
        downhill:       '#7a9ee8',
        random_walk:    '#7a9e7a',
        shelter_seek:   '#cc4444',
        stationary:     '#888888',
      }
      map.addSource('agent-paths', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: paths.map((agent) => ({
            type: 'Feature' as const,
            properties: { behavior: agent.behavior },
            geometry: { type: 'LineString' as const, coordinates: agent.path.map((p) => [p.lng, p.lat]) },
          })),
        },
      })
      map.addLayer({
        id: 'agent-paths',
        type: 'line',
        source: 'agent-paths',
        paint: {
          'line-color': ['match', ['get', 'behavior'],
            'trail_follower', behaviorColors.trail_follower,
            'downhill',       behaviorColors.downhill,
            'random_walk',    behaviorColors.random_walk,
            'shelter_seek',   behaviorColors.shelter_seek,
            'stationary',     behaviorColors.stationary,
            '#e8c87a',
          ],
          'line-width': 0.8,
          'line-opacity': 0.22,
        },
      })
    }

    // Fly to primary hotspot
    map.flyTo({ center: [hs[0].lng, hs[0].lat], zoom: 13, duration: 1200 })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    plotSimulationResults(map, hotspots, samplePaths)
  }, [hotspots, samplePaths, hasResults, mapReady, plotSimulationResults])

  // ─── layer toggle ────────────────────────────────────────────────
  const toggleLayer = useCallback((layerId: string) => {
    const map = mapRef.current
    if (!map || !mapReady) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) { next.delete(layerId); try { map.setLayoutProperty(layerId, 'visibility', 'none') } catch {} }
      else                   { next.add(layerId);    try { map.setLayoutProperty(layerId, 'visibility', 'visible') } catch {} }
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

  const LAYER_TOGGLES = [
    { id: 'heatmap-layer',         label: 'Heatmap',     color: '#e8c87a' },
    { id: 'sectors-fill-pending',  label: 'Sectors',     color: '#e8c87a' },
    { id: 'route-line',            label: 'Route',       color: '#7a9ee8' },
    { id: 'hotspot-circles',       label: 'Hotspots',    color: '#cc4444' },
    { id: 'agent-paths',           label: 'Agent paths', color: '#7a9ee8' },
    { id: 'traffic-lines',         label: 'Traffic',     color: '#cc4444' },
    { id: 'weather-dots',          label: 'Weather',     color: '#4a9ee8' },
    { id: 'pop-heatmap',           label: 'Population',  color: '#ff6040' },
  ]

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.mapContainer} />

      <div className={styles.styleBar}>
        {MAP_STYLES.map((s) => (
          <button key={s} className={`${styles.styleBtn} ${mapStyle === s ? styles.styleBtnActive : ''}`} onClick={() => onStyleChange(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className={styles.layerPanel}>
        <div className={styles.layerPanelTitle}>LAYERS</div>
        {LAYER_TOGGLES.map((l) => (
          <button key={l.id} className={`${styles.layerToggle} ${visibleLayers.has(l.id) ? styles.layerToggleOn : ''}`} onClick={() => toggleLayer(l.id)}>
            <span className={styles.layerDot} style={{ background: visibleLayers.has(l.id) ? l.color : '#2a3048' }} />
            {l.label}
            {l.id === 'hotspot-circles' && hasResults && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#3a9e6a' }}>LIVE</span>}
          </button>
        ))}
        <div className={styles.layerDivider}>MAP LABELS</div>
        {LABEL_LAYERS.map((l) => (
          <button key={l.id} className={`${styles.layerToggle} ${activeLabelLayers.has(l.id) ? styles.layerToggleOn : ''}`} onClick={() => toggleLabelLayer(l.id)}>
            <span className={styles.layerDot} style={{ background: activeLabelLayers.has(l.id) ? l.color : '#2a3048' }} />
            {l.label}
          </button>
        ))}
      </div>

      <div className={styles.coordBar}>
        <span>{coords.lat}N · {coords.lng}E · ZOOM {zoom}</span>
        {mapStyle === 'WEATHER'    && <span className={styles.wxBadge}>24°C · NW 12km/h · CLEAR</span>}
        {mapStyle === 'TRAFFIC'    && <span className={styles.wxBadge} style={{ color: '#c0803a' }}>TRAFFIC LIVE</span>}
        {mapStyle === '3D'         && <span className={styles.wxBadge}>3D TERRAIN · PITCH 55°</span>}
        {mapStyle === 'POPULATION' && <span className={styles.wxBadge} style={{ color: '#ff6040' }}>POPULATION DENSITY</span>}
        {hasResults                && <span className={styles.wxBadge} style={{ color: '#3a9e6a' }}>SIM RESULTS PLOTTED</span>}
      </div>

      <div className={styles.legend}>
        {[
          { color: '#cc4444', label: 'LKP' },
          { color: '#3a9e6a', label: 'Searched' },
          { color: '#e8c87a', label: 'Pending' },
          { color: '#7a9ee8', label: 'Evidence' },
          { color: '#cc4444', label: 'Hotspot', dashed: true },
        ].map((item) => (
          <div key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: item.color, opacity: item.dashed ? 0.5 : 1, outline: item.dashed ? `1px solid ${item.color}` : 'none', outlineOffset: 2 }} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className={styles.legendItem}>
          <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid #3a9e6a', display: 'inline-block', flexShrink: 0 }} />
          <span>Basecamp</span>
        </div>
      </div>
    </div>
  )
}