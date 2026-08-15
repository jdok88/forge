import type { CSSProperties, ReactNode } from 'react'
import './ui.css'

interface Props {
  children: ReactNode
  /** 좌측 강조 색 (계정 색상 등). 지정 시 4px 왼쪽 보더로 표시. */
  accentColor?: string
  style?: CSSProperties
  className?: string
}

export function Card({ children, accentColor, style, className }: Props) {
  return (
    <div
      className={['ui-card', className].filter(Boolean).join(' ')}
      style={{
        ...(accentColor ? { borderLeft: `4px solid ${accentColor}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
