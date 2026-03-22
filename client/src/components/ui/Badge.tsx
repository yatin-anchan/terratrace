import styles from './Badge.module.css'

type BadgeVariant = 'active' | 'suspended' | 'closed' | 'draft' | 'escalated' | 'archived'

interface BadgeProps {
  status: string
}

export default function Badge({ status }: BadgeProps) {
  const variant = status as BadgeVariant
  return (
    <span className={`${styles.badge} ${styles[variant] ?? styles.draft}`}>
      {status.toUpperCase()}
    </span>
  )
}