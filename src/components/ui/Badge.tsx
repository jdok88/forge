import type { ReactNode } from 'react'
import './ui.css'

interface Props {
  children: ReactNode
  variant?: 'neutral' | 'accent' | 'success' | 'danger'
}

export function Badge({ children, variant = 'neutral' }: Props) {
  const classes = ['ui-badge', variant !== 'neutral' ? `ui-badge--${variant}` : ''].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}
