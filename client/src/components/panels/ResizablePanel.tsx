import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './ResizablePanel.module.css'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth: number
  minWidth: number
  maxWidth: number
  side: 'left' | 'right'
  collapsed: boolean
  onCollapse: () => void
  label: string
}

export default function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  side,
  collapsed,
  onCollapse,
  label,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startW.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const next = side === 'left' ? startW.current + delta : startW.current - delta
      setWidth(Math.min(maxWidth, Math.max(minWidth, next)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [side, minWidth, maxWidth])

  if (collapsed) {
    return (
      <div className={`${styles.collapsed} ${styles[side]}`}>
        <span className={styles.collapsedLabel}>{label}</span>
        <button
          className={styles.expandBtn}
          onClick={onCollapse}
          title={`Expand ${label}`}
        >
          {side === 'left' ? '›' : '‹'}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`${styles.panel} ${styles[side]}`}
      style={{ width }}
    >
      <div className={styles.content}>{children}</div>

      <button
        className={styles.collapseBtn}
        onClick={onCollapse}
        title={`Collapse ${label}`}
      >
        {side === 'left' ? '‹' : '›'}
      </button>

      <div
        className={`${styles.handle} ${styles[`handle_${side}`]}`}
        onMouseDown={onMouseDown}
      />
    </div>
  )
}