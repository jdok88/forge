import type { ReactNode } from 'react'
import './ui.css'

interface Props {
  children: ReactNode
  /** 우측에 붙는 배지·링크 등 부가 요소 */
  right?: ReactNode
}

export function SectionTitle({ children, right }: Props) {
  return (
    <div className="ui-section-title">
      <span style={{ flex: 1 }}>{children}</span>
      {right}
    </div>
  )
}
