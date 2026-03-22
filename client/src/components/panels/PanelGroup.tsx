import styles from './PanelGroup.module.css'

interface PanelGroupProps {
  children: React.ReactNode
}

export default function PanelGroup({ children }: PanelGroupProps) {
  return <div className={styles.group}>{children}</div>
}