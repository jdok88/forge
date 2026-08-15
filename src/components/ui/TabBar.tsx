import './ui.css'
import { Badge } from './Badge'

export interface TabDef {
  key: string
  label: string
  /** 슬롯 점유·미완료 개수 등 부가 배지. 없으면 표시하지 않는다. */
  badge?: string
}

interface Props {
  tabs: readonly TabDef[]
  active: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="ui-tabbar" role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === active}
          className={`ui-tabbar__btn${t.key === active ? ' ui-tabbar__btn--active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.badge !== undefined && <Badge variant={t.key === active ? 'accent' : 'neutral'}>{t.badge}</Badge>}
        </button>
      ))}
    </div>
  )
}
