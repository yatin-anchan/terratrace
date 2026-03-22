import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useOperationStore } from '../../store/useOperationStore'
import styles from './Topbar.module.css'

interface TopbarProps {
  showBack?: boolean
  pendingCount?: number
  day?: string
}

export default function Topbar({ showBack, pendingCount, day }: TopbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const selectedOperation = useOperationStore((s) => s.selectedOperation)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>TERRATRACE</div>

      {selectedOperation && (
        <>
          <div className={styles.item}>
            <span
              className={styles.dot}
              style={{
                background: selectedOperation.status === 'active'
                  ? 'var(--success)' : 'var(--warn)',
              }}
            />
            <span className={styles.opName}>{selectedOperation.name}</span>
          </div>
          <div className={styles.item} style={{ color: 'var(--text3)', fontSize: 10 }}>
            {selectedOperation.status?.toUpperCase()}
          </div>
        </>
      )}

      {day && <div className={styles.item}>{day}</div>}

      {pendingCount !== undefined && pendingCount > 0 && (
        <div className={styles.item} style={{ color: 'var(--warn)' }}>
          <span className={styles.dot} style={{ background: 'var(--warn)' }} />
          {pendingCount} PENDING
        </div>
      )}

      <div className={styles.right}>
        {user && (
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: 'var(--success)' }} />
            {user.name.toUpperCase()}
          </div>
        )}
        {showBack && (
          <button className={styles.backBtn} onClick={() => navigate('/operations')}>
            ← OPERATIONS
          </button>
        )}
        {user && (
          <button className={styles.logoutBtn} onClick={handleLogout}>
            LOGOUT
          </button>
        )}
      </div>
    </header>
  )
}