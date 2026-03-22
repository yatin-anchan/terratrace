import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import styles from './Topbar.module.css'

interface TopbarProps {
  operationName?: string
  operationStatus?: string
  day?: string
  pendingCount?: number
  showBack?: boolean
}

export default function Topbar({
  operationName,
  operationStatus,
  day,
  pendingCount,
  showBack,
}: TopbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>TERRATRACE</div>

      {operationName && (
        <div className={styles.item}>
          <span
            className={styles.dot}
            style={{
              background:
                operationStatus === 'active' ? 'var(--success)' : 'var(--warn)',
            }}
          />
          <span className={styles.opName}>{operationName}</span>
        </div>
      )}

      {day && <div className={styles.item}>{day}</div>}

      {pendingCount !== undefined && pendingCount > 0 && (
        <div className={styles.item} style={{ color: 'var(--warn)' }}>
          <span
            className={styles.dot}
            style={{ background: 'var(--warn)' }}
          />
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
          <button
            className={styles.backBtn}
            onClick={() => navigate('/operations')}
          >
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