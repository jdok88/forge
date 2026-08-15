import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount, toConfig, type AccountRow } from '../hooks/useAccounts'
import { RARITIES, RARITY_LABEL, RATE_PER_LEVEL, MAX_NODE_LEVEL } from '../game/constants'
import { eggHatchSec } from '../game/durations'
import { formatDuration } from '../game/format'
import { Button } from '../components/ui/Button'
import type { Rarity } from '../game/types'

function LevelRow({ label, value, ratePct, onChange, note }: {
  label: string; value: number; ratePct: number
  onChange: (v: number) => void; note?: string
}) {
  const total = value * ratePct
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
      <span style={{ flex: 1 }}>{label}</span>
      <Button size="sm" onClick={() => onChange(Math.max(0, value - 1))}>−</Button>
      <span style={{ minWidth: '2.5em', textAlign: 'center' }}>{value}</span>
      <Button size="sm" onClick={() => onChange(Math.min(MAX_NODE_LEVEL, value + 1))}>+</Button>
      <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', minWidth: '9em' }}>
        {total > 0 ? `${total}%` : '—'} {note}
      </span>
    </div>
  )
}

export function AccountSettings() {
  const { id } = useParams<{ id: string }>()
  const { accounts, reload } = useAccounts()
  const [draft, setDraft] = useState<AccountRow | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const a = accounts.find(x => x.id === id)
    if (a && !draft) setDraft(a)
  }, [accounts, id, draft])

  if (!draft) return <p>불러오는 중…</p>

  const set = (patch: Partial<AccountRow>) => { setDraft({ ...draft, ...patch }); setSaved(false) }
  const setEgg = (r: Rarity, v: number) =>
    set({ egg_speed_lv: { ...draft.egg_speed_lv, [r]: v } })

  async function save() {
    if (!draft) return
    setSaveError(null)
    try {
      await updateAccount(draft.id, {
        forge_speed_lv: draft.forge_speed_lv, forge_cost_lv: draft.forge_cost_lv,
        tech_speed_lv: draft.tech_speed_lv, tech_cost_lv: draft.tech_cost_lv,
        egg_speed_lv: draft.egg_speed_lv, forge_level: draft.forge_level,
        gold_per_min: draft.gold_per_min, hammer_per_min: draft.hammer_per_min,
        potion_per_day: draft.potion_per_day, nickname: draft.nickname,
      })
      await reload()
      setSaved(true)
    } catch (e) {
      setSaved(false)
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    }
  }

  const cfg = toConfig(draft)

  return (
    <div>
      <Link to={`/account/${draft.id}`}>← 돌아가기</Link>
      <h1>계정 설정</h1>

      <label>계정명
        <input value={draft.nickname} onChange={e => set({ nickname: e.target.value })} />
      </label>

      <label>현재 대장간 레벨
        <input type="number" min={1} max={35} value={draft.forge_level}
          onChange={e => {
            const v = Number(e.target.value)
            set({ forge_level: Number.isFinite(v) ? Math.min(35, Math.max(1, Math.trunc(v))) : 1 })
          }} />
      </label>

      <h2>단축·할인 노드 (0~25)</h2>
      <LevelRow label="제련 타이머" value={draft.forge_speed_lv} ratePct={RATE_PER_LEVEL.forgeSpeed}
        onChange={v => set({ forge_speed_lv: v })} note="시간 단축" />
      <LevelRow label="제련 업그레이드 비용" value={draft.forge_cost_lv} ratePct={RATE_PER_LEVEL.forgeCost}
        onChange={v => set({ forge_cost_lv: v })} note="골드 할인" />
      <LevelRow label="기술 연구 타이머" value={draft.tech_speed_lv} ratePct={RATE_PER_LEVEL.techSpeed}
        onChange={v => set({ tech_speed_lv: v })} note="시간 단축" />
      <LevelRow label="기술 노드 업그레이드 비용" value={draft.tech_cost_lv} ratePct={RATE_PER_LEVEL.techCost}
        onChange={v => set({ tech_cost_lv: v })} note="물약 할인" />

      <h3>알 타이머</h3>
      {RARITIES.map(r => (
        <LevelRow
          key={r} label={`${RARITY_LABEL[r]} 알`} value={draft.egg_speed_lv[r]}
          ratePct={RATE_PER_LEVEL.eggSpeed} onChange={v => setEgg(r, v)}
          note={`→ ${formatDuration(eggHatchSec(r, cfg))}`}
        />
      ))}

      <h2>수급률 (선택)</h2>
      <label>분당 골드
        <input type="number" value={draft.gold_per_min ?? ''}
          onChange={e => set({ gold_per_min: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>
      <label>분당 망치
        <input type="number" value={draft.hammer_per_min ?? ''}
          onChange={e => set({ hammer_per_min: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>
      <label>일일 물약
        <input type="number" value={draft.potion_per_day ?? ''}
          onChange={e => set({ potion_per_day: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>

      <Button variant="primary" onClick={() => void save()}>저장</Button>
      {saved && <span style={{ color: 'var(--success)' }}>저장됨</span>}
      {saveError && <span style={{ color: 'var(--danger)' }}>{saveError}</span>}
    </div>
  )
}
