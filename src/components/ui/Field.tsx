import type { ReactNode } from 'react'
import './ui.css'

interface Props {
  label: string
  children: ReactNode
}

/** 라벨 텍스트를 입력 요소 위에 쌓아 배치하는 폼 필드 — 좁은 화면에서 라벨과 입력이 한 줄에 붙는 것을 막는다 */
export function Field({ label, children }: Props) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">{label}</span>
      {children}
    </label>
  )
}
