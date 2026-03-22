import styles from './tabs.module.css'

const ACTIONS = [
  'Add basecamp',
  'Add POI',
  'Add evidence',
  'Add subject',
  'Draw sector',
  'Mark sector searched',
  'Update search day',
  'Export report',
]

export default function ActionsMenu({ operationId }: { operationId: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sectionHead}>ACTIONS</div>
      {ACTIONS.map((a) => (
        <button key={a} className={styles.actBtn}>
          <div className={styles.actIco} />
          {a}
        </button>
      ))}
    </div>
  )
}