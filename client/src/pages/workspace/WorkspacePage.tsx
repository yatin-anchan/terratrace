import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import StatusBar from '../../components/layout/StatusBar'
import PanelGroup from '../../components/panels/PanelGroup'
import ResizablePanel from '../../components/panels/ResizablePanel'
import MapView from '../../components/map/MapView'
import OpDetails from './tabs/OpDetails'
import Evidence from './tabs/Evidence'
import Subjects from './tabs/Subjects'
import LogDays from './tabs/LogDays'
import FieldResults from './tabs/FieldResults'
import ActionsMenu from './tabs/ActionsMenu'
import RunSimulation from './tabs/RunSimulation'
import Results from './tabs/Results'
import ChatAI from './tabs/ChatAI'
import styles from './WorkspacePage.module.css'

const LEFT_TABS = ['OP DETAILS', 'EVIDENCE', 'SUBJECTS', 'LOG DAYS', 'FIELD'] as const
const RIGHT_TABS = ['ACTIONS', 'SIMULATE', 'RESULTS', 'AI CHAT'] as const

type LeftTab = typeof LEFT_TABS[number]
type RightTab = typeof RIGHT_TABS[number]

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [leftTab, setLeftTab] = useState<LeftTab>('OP DETAILS')
  const [rightTab, setRightTab] = useState<RightTab>('ACTIONS')
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [mapStyle, setMapStyle] = useState('DARK')
  const [zoom, setZoom] = useState(13)

  const renderLeftTab = () => {
    switch (leftTab) {
      case 'OP DETAILS': return <OpDetails operationId={id!} />
      case 'EVIDENCE':   return <Evidence operationId={id!} />
      case 'SUBJECTS':   return <Subjects operationId={id!} />
      case 'LOG DAYS':   return <LogDays operationId={id!} />
      case 'FIELD':      return <FieldResults operationId={id!} />
    }
  }

  const renderRightTab = () => {
    switch (rightTab) {
      case 'ACTIONS':  return <ActionsMenu operationId={id!} />
      case 'SIMULATE': return <RunSimulation operationId={id!} />
      case 'RESULTS':  return <Results operationId={id!} />
      case 'AI CHAT':  return <ChatAI operationId={id!} />
    }
  }

  return (
    <div className={styles.page}>
      <Topbar
        operationName="KESTREL-7"
        operationStatus="active"
        day="DAY 2 / 14:32 UTC"
        pendingCount={2}
        showBack
      />

      <PanelGroup>
        <ResizablePanel
          defaultWidth={250}
          minWidth={180}
          maxWidth={480}
          side="left"
          collapsed={leftCollapsed}
          onCollapse={() => setLeftCollapsed((v) => !v)}
          label="LEFT PANEL"
        >
          <div className={styles.tabBar}>
            {LEFT_TABS.map((t) => (
              <button
                key={t}
                className={`${styles.tab} ${leftTab === t ? styles.tabActive : ''}`}
                onClick={() => setLeftTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {renderLeftTab()}
          </div>
        </ResizablePanel>

        <div className={styles.mapArea}>
          <MapView
            mapStyle={mapStyle}
            onStyleChange={setMapStyle}
            onZoomChange={setZoom}
            operationId={id}
          />
        </div>

        <ResizablePanel
          defaultWidth={240}
          minWidth={180}
          maxWidth={480}
          side="right"
          collapsed={rightCollapsed}
          onCollapse={() => setRightCollapsed((v) => !v)}
          label="RIGHT PANEL"
        >
          <div className={styles.tabBar}>
            {RIGHT_TABS.map((t) => (
              <button
                key={t}
                className={`${styles.tab} ${rightTab === t ? styles.tabActive : ''}`}
                onClick={() => setRightTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {renderRightTab()}
          </div>
        </ResizablePanel>
      </PanelGroup>

      <StatusBar zoom={zoom} mapStyle={mapStyle} agentCount={847} />
    </div>
  )
}