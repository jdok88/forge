# Forge Master 알람 앱 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forge Master의 펫 부화·기술 연구·대장간 타이머를 서버/계정별로 관리하고, 앱이 닫혀 있어도 모바일 푸시로 알려주는 PWA를 만든다.

**Architecture:** 정적 PWA(React SPA)가 Supabase Postgres에 타이머를 저장하고, pg_cron이 1분마다 Edge Function을 깨워 만기 타이머를 Web Push로 발송한다. 게임 상수와 계산식은 DB가 아닌 프론트 순수 TypeScript 모듈에 두어 오프라인에서도 계산되고 단위 테스트가 가능하다.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Vitest, vite-plugin-pwa, @supabase/supabase-js v2, Supabase(Postgres + Auth + Edge Functions + pg_cron), Web Push(VAPID)

**Spec:** `docs/superpowers/specs/2026-08-14-forge-master-alarm-design.md`
**게임 데이터 정본:** `docs/reference/tech-nodes.md`

## Global Constraints

- Node.js 20 이상. 패키지 매니저는 npm.
- TypeScript `strict: true`. `any` 금지.
- 게임 상수는 `src/game/` 아래에만 둔다. DB에 저장하지 않는다.
- `src/game/` 모듈은 React·Supabase를 import 하지 않는다. 순수 함수만.
- 시간 계산 = `기본초 / (1 + 속도/100)`, 비용 계산 = `기본값 × (1 - 할인/100)`. 절대 혼동하지 않는다.
- 젬 환산 = `Math.round(초 × 23 / 10000)`.
- 반올림은 전부 `Math.round`(JS 기본, 0.5는 올림). `Math.ceil`/`Math.floor` 쓰지 않는다.
- 모든 DB 테이블에 RLS를 켜고 `user_id = auth.uid()` 정책을 건다.
- 일일퀘스트 리셋은 KST 09:00 = UTC 00:00 고정.
- UI 문구는 한국어. 등급 표기는 `일반/희귀/에픽/전설/궁극/신화`로 통일한다(게임 내 `서사시` 표기는 쓰지 않는다).
- 색·간격·모서리·폰트는 `src/styles/tokens.css`의 CSS 변수만 사용한다. 컴포넌트에 색 리터럴 금지.
- 커밋 메시지는 한국어 한 줄. 자동 서명 푸터 금지.

---

## File Structure

```
src/
  game/                      # 순수 계산 — React/Supabase 의존 없음
    constants.ts             # 테크 25행, 대장간 34행, 알 6종 기본값
    nodes.ts                 # 기술 노드 47개 목록(브랜치·명칭·효과)
    formulas.ts              # applySpeed / applyDiscount / gemsToSkip
    durations.ts             # eggHatchSec / techDuration / forgeDuration
    eta.ts                   # resourceEta
    format.ts                # 초 → "2일 7시간 13분" 문자열
    types.ts                 # Rarity, AccountConfig 등 공용 타입
  lib/
    supabase.ts              # 클라이언트 싱글턴
    push.ts                  # 구독 등록/해제
  hooks/
    useAccounts.ts
    useTimers.ts
    useDailyQuests.ts
  components/
    TimerStartSheet.tsx      # 3단계 시작 플로우 (공통)
    DurationInput.tsx        # 일/시/분 분리 입력 + 자동값 대조
    Countdown.tsx
    SlotCard.tsx
  routes/
    Home.tsx
    AccountDetail.tsx
    AccountSettings.tsx
    InstallGuide.tsx
  styles/
    tokens.css
  App.tsx
  main.tsx
supabase/
  migrations/
    0001_schema.sql
    0002_rls.sql
    0003_cron.sql
  functions/
    dispatch-push/index.ts
tests/
  game/*.test.ts
```

---

## Phase A — 계산 엔진

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test`, `npm run dev`, `npm run build` 가 동작하는 빈 프로젝트

- [ ] **Step 1: Vite 프로젝트 생성**

```bash
cd /c/forge
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest
```

`.` 에 생성할 때 기존 `docs/`, `image/` 가 있다는 경고가 나오면 "Ignore files and continue" 를 선택한다.

- [ ] **Step 2: vitest 설정 추가**

`vite.config.ts` 를 아래로 교체:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

`vite.config.ts` 최상단에 `/// <reference types="vitest" />` 를 추가한다.

- [ ] **Step 3: package.json 스크립트 추가**

`scripts` 에 `"test": "vitest run"`, `"test:watch": "vitest"` 를 추가한다.

- [ ] **Step 4: tsconfig strict 확인**

`tsconfig.app.json` 의 `compilerOptions` 에 `"strict": true` 가 있는지 확인한다. 없으면 추가한다.

- [ ] **Step 5: .gitignore 에 빌드 산출물 추가**

```
node_modules
dist
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 6: 동작 확인**

Run: `npm run build`
Expected: 성공, `dist/` 생성

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "Vite + React + TS 스캐폴딩 및 vitest 설정"
```

---

### Task 2: 게임 상수 테이블

**Files:**
- Create: `src/game/types.ts`, `src/game/constants.ts`
- Test: `tests/game/constants.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'ultimate' | 'mythic'`
  - `EGG_BASE_SEC: Record<Rarity, number>`
  - `TECH_TABLE: readonly { tier: number; level: number; potions: number; sec: number }[]` (25행, 인덱스 0 = 티어 I 1/5)
  - `FORGE_TABLE: Record<number, { sec: number; gold: number }>` (키 2~35)
  - `RARITY_LABEL: Record<Rarity, string>`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TECH_TABLE, FORGE_TABLE, EGG_BASE_SEC } from '../../src/game/constants'

describe('TECH_TABLE', () => {
  it('25행이다', () => {
    expect(TECH_TABLE).toHaveLength(25)
  })

  it('티어 I 1/5 은 30물약 300초', () => {
    expect(TECH_TABLE[0]).toEqual({ tier: 1, level: 1, potions: 30, sec: 300 })
  })

  it('티어 V 5/5 은 6931물약 352860초', () => {
    expect(TECH_TABLE[24]).toEqual({ tier: 5, level: 5, potions: 6931, sec: 352860 })
  })

  it('물약 합계는 46922', () => {
    const sum = TECH_TABLE.reduce((a, r) => a + r.potions, 0)
    expect(sum).toBe(46922)
  })

  it('시간 합계는 3189780초', () => {
    const sum = TECH_TABLE.reduce((a, r) => a + r.sec, 0)
    expect(sum).toBe(3189780)
  })
})

describe('FORGE_TABLE', () => {
  it('레벨 2~35 를 가진다', () => {
    expect(Object.keys(FORGE_TABLE).map(Number).sort((a, b) => a - b))
      .toEqual(Array.from({ length: 34 }, (_, i) => i + 2))
  })

  it('레벨 35 는 757200초 300만골드', () => {
    expect(FORGE_TABLE[35]).toEqual({ sec: 757200, gold: 3_000_000 })
  })

  it('레벨 9 는 67200초 10만골드', () => {
    expect(FORGE_TABLE[9]).toEqual({ sec: 67200, gold: 100_000 })
  })

  it('골드 합계는 41891100', () => {
    const sum = Object.values(FORGE_TABLE).reduce((a, r) => a + r.gold, 0)
    expect(sum).toBe(41_891_100)
  })
})

describe('EGG_BASE_SEC', () => {
  it('등급별 기본 부화시간이 2배씩 증가한다', () => {
    expect(EGG_BASE_SEC).toEqual({
      common: 1800, rare: 7200, epic: 14400,
      legendary: 28800, ultimate: 57600, mythic: 115200,
    })
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/game/constants'`

- [ ] **Step 3: 타입 정의**

`src/game/types.ts`:

```ts
export type Rarity =
  | 'common' | 'rare' | 'epic'
  | 'legendary' | 'ultimate' | 'mythic'

export type Branch = 'forge' | 'power' | 'skill'

export interface TechRow {
  tier: number
  level: number
  potions: number
  sec: number
}

export interface ForgeRow {
  sec: number
  gold: number
}

/** 계정별 단축·할인 노드 레벨 (각 0~25) 와 수급률 */
export interface AccountConfig {
  forgeSpeedLv: number
  forgeCostLv: number
  techSpeedLv: number
  techCostLv: number
  eggSpeedLv: Record<Rarity, number>
  goldPerMin: number | null
  hammerPerMin: number | null
  potionPerDay: number | null
}
```

- [ ] **Step 4: 상수 구현**

`src/game/constants.ts`:

```ts
import type { Rarity, TechRow, ForgeRow } from './types'

export const RARITIES: readonly Rarity[] = [
  'common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic',
] as const

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '일반',
  rare: '희귀',
  epic: '에픽',
  legendary: '전설',
  ultimate: '궁극',
  mythic: '신화',
}

/** 알 등급별 기본 부화시간(초). 등급마다 정확히 2배. */
export const EGG_BASE_SEC: Record<Rarity, number> = {
  common: 1800,
  rare: 7200,
  epic: 14400,
  legendary: 28800,
  ultimate: 57600,
  mythic: 115200,
}

/**
 * 기술 노드 1개의 티어 I-1/5 → V-5/5 전체 25단계.
 * 출처: image/tech cost and time_realreal.png (게임 내 3회 교차검증 완료)
 * 각 행은 "그 단계에 도달하기 위한" 비용/시간이다.
 */
export const TECH_TABLE: readonly TechRow[] = [
  { tier: 1, level: 1, potions: 30, sec: 300 },
  { tier: 1, level: 2, potions: 42, sec: 600 },
  { tier: 1, level: 3, potions: 59, sec: 1200 },
  { tier: 1, level: 4, potions: 82, sec: 2400 },
  { tier: 1, level: 5, potions: 115, sec: 4800 },
  { tier: 2, level: 1, potions: 161, sec: 9600 },
  { tier: 2, level: 2, potions: 226, sec: 19200 },
  { tier: 2, level: 3, potions: 316, sec: 38400 },
  { tier: 2, level: 4, potions: 443, sec: 76800 },
  { tier: 2, level: 5, potions: 620, sec: 84480 },
  { tier: 3, level: 1, potions: 868, sec: 92880 },
  { tier: 3, level: 2, potions: 1007, sec: 102180 },
  { tier: 3, level: 3, potions: 1168, sec: 112440 },
  { tier: 3, level: 4, potions: 1354, sec: 123660 },
  { tier: 3, level: 5, potions: 1571, sec: 136020 },
  { tier: 4, level: 1, potions: 1823, sec: 149640 },
  { tier: 4, level: 2, potions: 2114, sec: 164580 },
  { tier: 4, level: 3, potions: 2452, sec: 181080 },
  { tier: 4, level: 4, potions: 2845, sec: 199140 },
  { tier: 4, level: 5, potions: 3300, sec: 219060 },
  { tier: 5, level: 1, potions: 3828, sec: 241020 },
  { tier: 5, level: 2, potions: 4441, sec: 265080 },
  { tier: 5, level: 3, potions: 5151, sec: 291600 },
  { tier: 5, level: 4, potions: 5975, sec: 320760 },
  { tier: 5, level: 5, potions: 6931, sec: 352860 },
] as const

/**
 * 대장간 레벨 N 도달에 필요한 시간(초)과 총 골드.
 * 승천(Ascend) 후에도 같은 표를 재사용한다.
 * 레벨 2·3·4 는 게임이 무료 즉시완료를 제공하므로 타이머를 걸지 않는다.
 */
export const FORGE_FREE_SKIP_LEVELS: readonly number[] = [2, 3, 4] as const
export const FORGE_MAX_LEVEL = 35

export const FORGE_TABLE: Record<number, ForgeRow> = {
  2: { sec: 300, gold: 400 },
  3: { sec: 900, gold: 700 },
  4: { sec: 1800, gold: 1_500 },
  5: { sec: 3600, gold: 3_500 },
  6: { sec: 7200, gold: 10_000 },
  7: { sec: 27200, gold: 25_000 },
  8: { sec: 47200, gold: 50_000 },
  9: { sec: 67200, gold: 100_000 },
  10: { sec: 87200, gold: 150_000 },
  11: { sec: 107200, gold: 250_000 },
  12: { sec: 127200, gold: 350_000 },
  13: { sec: 147200, gold: 450_000 },
  14: { sec: 167200, gold: 600_000 },
  15: { sec: 187200, gold: 800_000 },
  16: { sec: 207200, gold: 910_000 },
  17: { sec: 227200, gold: 1_020_000 },
  18: { sec: 247200, gold: 1_130_000 },
  19: { sec: 277200, gold: 1_240_000 },
  20: { sec: 307200, gold: 1_350_000 },
  21: { sec: 337200, gold: 1_460_000 },
  22: { sec: 367200, gold: 1_570_000 },
  23: { sec: 397200, gold: 1_680_000 },
  24: { sec: 427200, gold: 1_790_000 },
  25: { sec: 457200, gold: 1_900_000 },
  26: { sec: 487200, gold: 2_010_000 },
  27: { sec: 517200, gold: 2_120_000 },
  28: { sec: 547200, gold: 2_230_000 },
  29: { sec: 577200, gold: 2_340_000 },
  30: { sec: 607200, gold: 2_450_000 },
  31: { sec: 637200, gold: 2_560_000 },
  32: { sec: 667200, gold: 2_670_000 },
  33: { sec: 697200, gold: 2_780_000 },
  34: { sec: 727200, gold: 2_890_000 },
  35: { sec: 757200, gold: 3_000_000 },
}

/** 노드 레벨(0~25) 당 효과 증가폭(%p) */
export const RATE_PER_LEVEL = {
  eggSpeed: 10,
  techSpeed: 4,
  techCost: 2,
  forgeSpeed: 2,
  forgeCost: 1,
} as const

export const MAX_NODE_LEVEL = 25
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (9 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/game/types.ts src/game/constants.ts tests/game/constants.test.ts
git commit -m "게임 상수 테이블 추가 — 테크 25행·대장간 34행·알 6종"
```

---

### Task 3: 공통 공식

**Files:**
- Create: `src/game/formulas.ts`
- Test: `tests/game/formulas.test.ts`

**Interfaces:**
- Consumes: `MAX_NODE_LEVEL` from `constants.ts`
- Produces:
  - `applySpeed(baseSec: number, speedPct: number): number`
  - `applyDiscount(baseCost: number, discountPct: number): number`
  - `gemsToSkip(remainingSec: number): number`
  - `clampNodeLevel(lv: number): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/formulas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applySpeed, applyDiscount, gemsToSkip, clampNodeLevel } from '../../src/game/formulas'

describe('applySpeed — 시간은 나눗셈', () => {
  it('+100% 면 절반', () => {
    expect(applySpeed(76800, 100)).toBe(38400)
  })
  it('+50% 면 2/3', () => {
    expect(applySpeed(757200, 50)).toBe(504800)
  })
  it('+2% 는 반올림한다', () => {
    expect(applySpeed(300, 2)).toBe(294) // 294.1176
  })
  it('+250% 면 1/3.5', () => {
    expect(applySpeed(115200, 250)).toBe(32914) // 32914.28
  })
  it('0% 면 그대로', () => {
    expect(applySpeed(9600, 0)).toBe(9600)
  })
})

describe('applyDiscount — 비용은 곱셈', () => {
  it('-50% 면 절반', () => {
    expect(applyDiscount(30, 50)).toBe(15)
  })
  it('-25% 면 3/4', () => {
    expect(applyDiscount(100_000, 25)).toBe(75_000)
  })
  it('-10% 를 반올림한다', () => {
    expect(applyDiscount(42, 10)).toBe(38) // 37.8
    expect(applyDiscount(161, 10)).toBe(145) // 144.9
  })
  it('0.5 는 올림한다', () => {
    expect(applyDiscount(59, 50)).toBe(30) // 29.5
    expect(applyDiscount(1571, 50)).toBe(786) // 785.5
  })
})

describe('gemsToSkip', () => {
  it('테크 V-5/5 전체는 812젬', () => {
    expect(gemsToSkip(352860)).toBe(812)
  })
  it('테크 II-1/5 는 22젬', () => {
    expect(gemsToSkip(9600)).toBe(22)
  })
  it('대장간 L7 은 63젬', () => {
    expect(gemsToSkip(27200)).toBe(63)
  })
  it('대장간 L35 는 1742젬', () => {
    expect(gemsToSkip(757200)).toBe(1742)
  })
  it('0초는 0젬', () => {
    expect(gemsToSkip(0)).toBe(0)
  })
})

describe('clampNodeLevel', () => {
  it('0~25 로 자른다', () => {
    expect(clampNodeLevel(-3)).toBe(0)
    expect(clampNodeLevel(30)).toBe(25)
    expect(clampNodeLevel(12)).toBe(12)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/game/formulas.ts`:

```ts
import { MAX_NODE_LEVEL } from './constants'

/**
 * 타이머 속도 보정. 게임은 "속도 +N%" 를 나눗셈으로 적용한다.
 * 출처: forgedatarealreal.png 각주 "Time (Second) / (1 + Timer Speed)"
 */
export function applySpeed(baseSec: number, speedPct: number): number {
  return Math.round(baseSec / (1 + speedPct / 100))
}

/**
 * 비용 할인. 시간과 달리 곱셈이다.
 * 출처: 게임 내 30→15(-50%), 400→300(-25%)
 */
export function applyDiscount(baseCost: number, discountPct: number): number {
  return Math.round(baseCost * (1 - discountPct / 100))
}

/**
 * 남은 시간을 젬으로 즉시완료할 때의 비용.
 * 대장간·테크 전 구간 공통 환율 20000초 = 46젬 → 23/10000.
 */
export function gemsToSkip(remainingSec: number): number {
  if (remainingSec <= 0) return 0
  return Math.round((remainingSec * 23) / 10000)
}

export function clampNodeLevel(lv: number): number {
  if (!Number.isFinite(lv)) return 0
  return Math.min(MAX_NODE_LEVEL, Math.max(0, Math.trunc(lv)))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/game/formulas.ts tests/game/formulas.test.ts
git commit -m "공통 계산 공식 추가 — 시간 나눗셈·비용 곱셈·젬 환산"
```

---

### Task 4: 소요시간·비용 계산

**Files:**
- Create: `src/game/durations.ts`
- Test: `tests/game/durations.test.ts`

**Interfaces:**
- Consumes: `applySpeed`, `applyDiscount` (Task 3), `TECH_TABLE`, `FORGE_TABLE`, `EGG_BASE_SEC`, `RATE_PER_LEVEL` (Task 2), `AccountConfig`, `Rarity` (Task 2)
- Produces:
  - `eggHatchSec(rarity: Rarity, cfg: AccountConfig): number`
  - `techIndex(tier: number, level: number): number`
  - `techDuration(tier: number, level: number, cfg: AccountConfig): { sec: number; potions: number }`
  - `forgeDuration(targetLevel: number, cfg: AccountConfig): { sec: number; gold: number }`
  - `isForgeFreeSkip(targetLevel: number): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/durations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { eggHatchSec, techDuration, forgeDuration, techIndex, isForgeFreeSkip } from '../../src/game/durations'
import type { AccountConfig } from '../../src/game/types'

const VANILLA: AccountConfig = {
  forgeSpeedLv: 0, forgeCostLv: 0, techSpeedLv: 0, techCostLv: 0,
  eggSpeedLv: { common: 0, rare: 0, epic: 0, legendary: 0, ultimate: 0, mythic: 0 },
  goldPerMin: null, hammerPerMin: null, potionPerDay: null,
}

const cfg = (over: Partial<AccountConfig>): AccountConfig => ({ ...VANILLA, ...over })

describe('techIndex', () => {
  it('티어/레벨을 0-based 인덱스로 바꾼다', () => {
    expect(techIndex(1, 1)).toBe(0)
    expect(techIndex(2, 1)).toBe(5)
    expect(techIndex(5, 5)).toBe(24)
  })
})

describe('eggHatchSec', () => {
  it('순정 신화알은 115200초', () => {
    expect(eggHatchSec('mythic', VANILLA)).toBe(115200)
  })
  // pethatching.png L7 = 70% → 17m39s = 1059초
  it('일반알 노드 7레벨(+70%)은 1059초', () => {
    expect(eggHatchSec('common', cfg({ eggSpeedLv: { ...VANILLA.eggSpeedLv, common: 7 } }))).toBe(1059)
  })
  // pethatching.png L25 = 250% → 9h8m34s = 32914초
  it('신화알 만렙(+250%)은 32914초', () => {
    expect(eggHatchSec('mythic', cfg({ eggSpeedLv: { ...VANILLA.eggSpeedLv, mythic: 25 } }))).toBe(32914)
  })
  it('등급별 노드가 서로 간섭하지 않는다', () => {
    const c = cfg({ eggSpeedLv: { ...VANILLA.eggSpeedLv, common: 25 } })
    expect(eggHatchSec('rare', c)).toBe(7200)
  })
})

describe('techDuration', () => {
  it('순정 티어 II 4/5 는 76800초 443물약', () => {
    expect(techDuration(2, 4, VANILLA)).toEqual({ sec: 76800, potions: 443 })
  })
  it('속도 만렙(+100%)이면 시간이 절반', () => {
    expect(techDuration(2, 4, cfg({ techSpeedLv: 25 })).sec).toBe(38400)
  })
  it('비용 만렙(-50%)이면 물약이 절반', () => {
    expect(techDuration(1, 1, cfg({ techCostLv: 25 })).potions).toBe(15)
  })
  // 게임 실측: 기술연구타이머 I 5/5(+20%) + 기술노드비용 I 5/5(-10%)
  it('실측 재현 — 티어 I 2/5 는 500초 38물약', () => {
    expect(techDuration(1, 2, cfg({ techSpeedLv: 5, techCostLv: 5 })))
      .toEqual({ sec: 500, potions: 38 })
  })
  it('실측 재현 — 티어 II 1/5 는 8000초 145물약', () => {
    expect(techDuration(2, 1, cfg({ techSpeedLv: 5, techCostLv: 5 })))
      .toEqual({ sec: 8000, potions: 145 })
  })
  it('실측 재현 — 티어 I 1/5 는 250초 27물약', () => {
    expect(techDuration(1, 1, cfg({ techSpeedLv: 5, techCostLv: 5 })))
      .toEqual({ sec: 250, potions: 27 })
  })
})

describe('forgeDuration', () => {
  it('순정 L35 는 757200초 300만골드', () => {
    expect(forgeDuration(35, VANILLA)).toEqual({ sec: 757200, gold: 3_000_000 })
  })
  // forgedetail-4: L35 @ +50% = 5d20h13m20s = 504800초
  it('속도 만렙(+50%)이면 L35 가 504800초', () => {
    expect(forgeDuration(35, cfg({ forgeSpeedLv: 25 })).sec).toBe(504800)
  })
  // forgedetail-1: L2 @ +2% = 4m54s = 294초
  it('속도 1레벨(+2%)이면 L2 가 294초', () => {
    expect(forgeDuration(2, cfg({ forgeSpeedLv: 1 })).sec).toBe(294)
  })
  // forgedetail-5: L9 @ -25% = 75000
  it('비용 만렙(-25%)이면 L9 골드가 75000', () => {
    expect(forgeDuration(9, cfg({ forgeCostLv: 25 })).gold).toBe(75_000)
  })
  it('범위 밖 레벨은 던진다', () => {
    expect(() => forgeDuration(36, VANILLA)).toThrow()
    expect(() => forgeDuration(1, VANILLA)).toThrow()
  })
})

describe('isForgeFreeSkip', () => {
  it('레벨 2~4 는 무료 즉시완료', () => {
    expect(isForgeFreeSkip(2)).toBe(true)
    expect(isForgeFreeSkip(4)).toBe(true)
    expect(isForgeFreeSkip(5)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/game/durations.ts`:

```ts
import {
  EGG_BASE_SEC, TECH_TABLE, FORGE_TABLE, FORGE_FREE_SKIP_LEVELS,
  FORGE_MAX_LEVEL, RATE_PER_LEVEL,
} from './constants'
import { applySpeed, applyDiscount, clampNodeLevel } from './formulas'
import type { AccountConfig, Rarity } from './types'

/** (티어, 서브레벨) → TECH_TABLE 인덱스 */
export function techIndex(tier: number, level: number): number {
  if (tier < 1 || tier > 5) throw new Error(`티어 범위 밖: ${tier}`)
  if (level < 1 || level > 5) throw new Error(`서브레벨 범위 밖: ${level}`)
  return (tier - 1) * 5 + (level - 1)
}

export function eggHatchSec(rarity: Rarity, cfg: AccountConfig): number {
  const lv = clampNodeLevel(cfg.eggSpeedLv[rarity])
  return applySpeed(EGG_BASE_SEC[rarity], lv * RATE_PER_LEVEL.eggSpeed)
}

export function techDuration(
  tier: number, level: number, cfg: AccountConfig,
): { sec: number; potions: number } {
  const row = TECH_TABLE[techIndex(tier, level)]
  const speedLv = clampNodeLevel(cfg.techSpeedLv)
  const costLv = clampNodeLevel(cfg.techCostLv)
  return {
    sec: applySpeed(row.sec, speedLv * RATE_PER_LEVEL.techSpeed),
    potions: applyDiscount(row.potions, costLv * RATE_PER_LEVEL.techCost),
  }
}

export function isForgeFreeSkip(targetLevel: number): boolean {
  return FORGE_FREE_SKIP_LEVELS.includes(targetLevel)
}

export function forgeDuration(
  targetLevel: number, cfg: AccountConfig,
): { sec: number; gold: number } {
  if (targetLevel < 2 || targetLevel > FORGE_MAX_LEVEL) {
    throw new Error(`대장간 목표 레벨 범위 밖: ${targetLevel}`)
  }
  const row = FORGE_TABLE[targetLevel]
  const speedLv = clampNodeLevel(cfg.forgeSpeedLv)
  const costLv = clampNodeLevel(cfg.forgeCostLv)
  return {
    sec: applySpeed(row.sec, speedLv * RATE_PER_LEVEL.forgeSpeed),
    gold: applyDiscount(row.gold, costLv * RATE_PER_LEVEL.forgeCost),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS. 특히 "실측 재현" 3건이 통과해야 한다 — 이게 통과하면 상수 테이블과 두 공식이 모두 옳다는 뜻이다.

- [ ] **Step 5: 커밋**

```bash
git add src/game/durations.ts tests/game/durations.test.ts
git commit -m "소요시간·비용 계산 추가 — 게임 실측값 3건 재현 검증"
```

---

### Task 5: 자원 ETA 계산

**Files:**
- Create: `src/game/eta.ts`
- Test: `tests/game/eta.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `resourceEta(need: number, have: number, perMin: number | null): number | null` — 남은 분. 이미 충족이면 0, 계산 불가면 null

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/eta.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resourceEta } from '../../src/game/eta'

describe('resourceEta', () => {
  it('이미 충족했으면 0', () => {
    expect(resourceEta(100, 150, 10)).toBe(0)
    expect(resourceEta(100, 100, 10)).toBe(0)
  })
  it('부족분을 분당 수급으로 나눈다', () => {
    expect(resourceEta(100, 40, 10)).toBe(6)
  })
  it('올림한다 — 모자란 채로 도달했다고 하면 안 된다', () => {
    expect(resourceEta(100, 0, 3)).toBe(34) // 33.33 → 34
  })
  it('수급률이 없으면 null', () => {
    expect(resourceEta(100, 0, null)).toBeNull()
  })
  it('수급률이 0 이하면 null — 영원히 못 모은다', () => {
    expect(resourceEta(100, 0, 0)).toBeNull()
    expect(resourceEta(100, 0, -5)).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/game/eta.ts`:

```ts
/**
 * 필요량에 도달하기까지 남은 분.
 * @returns 0 = 이미 충족, null = 수급률 미입력이거나 0 이하
 */
export function resourceEta(
  need: number, have: number, perMin: number | null,
): number | null {
  if (have >= need) return 0
  if (perMin === null || perMin <= 0) return null
  return Math.ceil((need - have) / perMin)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/game/eta.ts tests/game/eta.test.ts
git commit -m "자원 수급 ETA 계산 추가"
```

---

### Task 6: 시간 포맷 + 일일퀘스트 날짜

**Files:**
- Create: `src/game/format.ts`
- Test: `tests/game/format.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `formatDuration(sec: number): string` — `"2일 7시간 13분"`, 1분 미만은 `"곧"`
  - `formatCountdown(sec: number): string` — `"07:13:05"` 형식(일 단위는 `"2일 07:13:05"`)
  - `questDateKst(at: Date): string` — KST 09:00 리셋 기준 `YYYY-MM-DD`
  - `nextQuestResetAt(at: Date): Date` — 다음 리셋 시각(UTC Date)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatDuration, formatCountdown, questDateKst, nextQuestResetAt } from '../../src/game/format'

describe('formatDuration', () => {
  it('일/시/분을 조합한다', () => {
    expect(formatDuration(199_140)).toBe('2일 7시간 19분')
  })
  it('0인 단위는 생략한다', () => {
    expect(formatDuration(7200)).toBe('2시간')
    expect(formatDuration(86_400)).toBe('1일')
    expect(formatDuration(90_000)).toBe('1일 1시간')
  })
  it('1분 미만은 곧', () => {
    expect(formatDuration(30)).toBe('곧')
    expect(formatDuration(0)).toBe('곧')
  })
  it('음수도 곧으로 처리한다', () => {
    expect(formatDuration(-100)).toBe('곧')
  })
})

describe('formatCountdown', () => {
  it('하루 미만은 HH:MM:SS', () => {
    expect(formatCountdown(26_285)).toBe('07:18:05')
  })
  it('하루 이상은 일 접두', () => {
    expect(formatCountdown(112_685)).toBe('1일 07:18:05')
  })
  it('음수는 00:00:00', () => {
    expect(formatCountdown(-5)).toBe('00:00:00')
  })
})

describe('questDateKst — KST 09:00 리셋', () => {
  it('KST 09:00 이후는 그날 날짜', () => {
    // 2026-08-14 09:00 KST = 2026-08-14 00:00 UTC
    expect(questDateKst(new Date('2026-08-14T00:00:00Z'))).toBe('2026-08-14')
  })
  it('KST 09:00 직전은 전날 날짜', () => {
    // 2026-08-14 08:59 KST = 2026-08-13 23:59 UTC
    expect(questDateKst(new Date('2026-08-13T23:59:00Z'))).toBe('2026-08-13')
  })
  it('KST 자정은 아직 전날 퀘스트', () => {
    // 2026-08-14 00:00 KST = 2026-08-13 15:00 UTC
    expect(questDateKst(new Date('2026-08-13T15:00:00Z'))).toBe('2026-08-13')
  })
})

describe('nextQuestResetAt', () => {
  it('리셋 직후면 다음날 09:00 KST', () => {
    const r = nextQuestResetAt(new Date('2026-08-14T00:00:00Z'))
    expect(r.toISOString()).toBe('2026-08-15T00:00:00.000Z')
  })
  it('리셋 전이면 오늘 09:00 KST', () => {
    const r = nextQuestResetAt(new Date('2026-08-13T23:00:00Z'))
    expect(r.toISOString()).toBe('2026-08-14T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/game/format.ts`:

```ts
const DAY = 86_400
const HOUR = 3_600
const MIN = 60

export function formatDuration(sec: number): string {
  if (sec < MIN) return '곧'
  const d = Math.floor(sec / DAY)
  const h = Math.floor((sec % DAY) / HOUR)
  const m = Math.floor((sec % HOUR) / MIN)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}일`)
  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  return parts.join(' ')
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatCountdown(sec: number): string {
  if (sec < 0) sec = 0
  const d = Math.floor(sec / DAY)
  const h = Math.floor((sec % DAY) / HOUR)
  const m = Math.floor((sec % HOUR) / MIN)
  const s = Math.floor(sec % MIN)
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`
  return d > 0 ? `${d}일 ${hms}` : hms
}

/**
 * 일일퀘스트는 KST 09:00 에 리셋된다.
 * KST(UTC+9) 09:00 == UTC 00:00 이므로, UTC 날짜가 곧 퀘스트 날짜다.
 */
export function questDateKst(at: Date): string {
  return at.toISOString().slice(0, 10)
}

export function nextQuestResetAt(at: Date): Date {
  const next = new Date(at)
  next.setUTCHours(0, 0, 0, 0)
  if (next <= at) next.setUTCDate(next.getUTCDate() + 1)
  return next
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/game/format.ts tests/game/format.test.ts
git commit -m "시간 포맷·일일퀘스트 리셋 날짜 계산 추가"
```

---

### Task 7: 기술 노드 목록

**Files:**
- Create: `src/game/nodes.ts`
- Test: `tests/game/nodes.test.ts`

**Interfaces:**
- Consumes: `Branch` (Task 2)
- Produces: `TECH_NODES: readonly TechNode[]` where `TechNode = { id: string; branch: Branch; name: string; effect: string }`, `BRANCH_LABEL: Record<Branch, string>`

노드 명칭은 `docs/reference/tech-nodes.md` 의 게임 내 한국어 표기를 그대로 옮긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/nodes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TECH_NODES, BRANCH_LABEL } from '../../src/game/nodes'

describe('TECH_NODES', () => {
  it('47개다', () => {
    expect(TECH_NODES).toHaveLength(47)
  })
  it('브랜치별 개수가 맞다', () => {
    const count = (b: string) => TECH_NODES.filter(n => n.branch === b).length
    expect(count('forge')).toBe(10)
    expect(count('power')).toBe(20)
    expect(count('skill')).toBe(17)
  })
  it('id 가 중복되지 않는다', () => {
    expect(new Set(TECH_NODES.map(n => n.id)).size).toBe(47)
  })
  it('계산에 쓰이는 노드가 존재한다', () => {
    const ids = TECH_NODES.map(n => n.id)
    expect(ids).toContain('forge_timer')
    expect(ids).toContain('forge_cost')
    expect(ids).toContain('tech_timer')
    expect(ids).toContain('tech_cost')
    expect(ids).toContain('egg_timer_common')
    expect(ids).toContain('egg_timer_mythic')
  })
  it('브랜치 라벨은 게임 표기를 쓴다', () => {
    expect(BRANCH_LABEL.forge).toBe('대장간')
    expect(BRANCH_LABEL.power).toBe('힘')
    expect(BRANCH_LABEL.skill).toBe('스킬, 펫 & 기술')
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/game/nodes.ts`:

```ts
import type { Branch } from './types'

export interface TechNode {
  id: string
  branch: Branch
  name: string
  effect: string
}

export const BRANCH_LABEL: Record<Branch, string> = {
  forge: '대장간',
  power: '힘',
  skill: '스킬, 펫 & 기술',
}

/**
 * 게임 내 한국어 표기 그대로. 출처: docs/reference/tech-nodes.md
 * S-Oil(클랜 기술) 브랜치는 v1 제외.
 */
export const TECH_NODES: readonly TechNode[] = [
  // 대장간 10
  { id: 'forge_timer', branch: 'forge', name: '제련 타이머', effect: '대장간 업그레이드 타이머 속도 +2%/레벨' },
  { id: 'forge_cost', branch: 'forge', name: '제련 업그레이드 비용', effect: '대장간 업그레이드 비용 -1%/레벨' },
  { id: 'forge_sell', branch: 'forge', name: '장비 판매 가격', effect: '장비 판매 가격 +1%/레벨' },
  { id: 'forge_thief_hammer', branch: 'forge', name: '망치 도둑 망치 보너스', effect: '망치 보너스 +1%/레벨' },
  { id: 'forge_thief_coin', branch: 'forge', name: '망치 도둑 코인 보너스', effect: '코인 보너스 +1%/레벨' },
  { id: 'forge_auto', branch: 'forge', name: '자동 제련', effect: '한 번에 사용하는 망치 수 +1' },
  { id: 'forge_free', branch: 'forge', name: '무료 제련 기회', effect: '장비를 무료로 제작할 기회 +1%/레벨' },
  { id: 'forge_offline_time', branch: 'forge', name: '최대 오프라인 시간', effect: '최대 오프라인 보상 시간 +16%/레벨' },
  { id: 'forge_offline_coin', branch: 'forge', name: '코인 오프라인 보상', effect: '코인 오프라인 보상 보너스 +1%/레벨' },
  { id: 'forge_offline_hammer', branch: 'forge', name: '망치 오프라인 보상', effect: '망치 오프라인 보상 보너스 +1%/레벨' },

  // 힘 20 — 장비 숙련 8
  { id: 'power_m_weapon', branch: 'power', name: '무기 숙련', effect: '무기 보너스 피해 +2%/레벨' },
  { id: 'power_m_helmet', branch: 'power', name: '헬멧 숙련', effect: '헬멧 보너스 체력 +2%/레벨' },
  { id: 'power_m_glove', branch: 'power', name: '장갑 숙련', effect: '장갑 보너스 피해 +2%/레벨' },
  { id: 'power_m_body', branch: 'power', name: '갑옷 숙련', effect: '갑옷 보너스 체력 +2%/레벨' },
  { id: 'power_m_necklace', branch: 'power', name: '목걸이 숙련', effect: '목걸이 보너스 피해 +2%/레벨' },
  { id: 'power_m_shoe', branch: 'power', name: '신발 숙련', effect: '신발 보너스 체력 +2%/레벨' },
  { id: 'power_m_ring', branch: 'power', name: '반지 숙련', effect: '반지 보너스 피해 +2%/레벨' },
  { id: 'power_m_belt', branch: 'power', name: '벨트 숙련', effect: '벨트 보너스 체력 +2%/레벨' },
  // 탈것 숙련 2
  { id: 'power_mount_dmg', branch: 'power', name: '탈것 피해 숙련', effect: '탈것 보너스 피해 +2%/레벨' },
  { id: 'power_mount_hp', branch: 'power', name: '탈것 체력 숙련', effect: '탈것 보너스 체력 +2%/레벨' },
  // 레벨 업 8
  { id: 'power_l_weapon', branch: 'power', name: '무기 레벨 업', effect: '무기 최대 레벨 +2/레벨' },
  { id: 'power_l_helmet', branch: 'power', name: '헬멧 레벨 업', effect: '헬멧 최대 레벨 +2/레벨' },
  { id: 'power_l_glove', branch: 'power', name: '장갑 레벨 업', effect: '장갑 최대 레벨 +2/레벨' },
  { id: 'power_l_body', branch: 'power', name: '갑옷 레벨 업', effect: '갑옷 최대 레벨 +2/레벨' },
  { id: 'power_l_necklace', branch: 'power', name: '목걸이 레벨 업', effect: '목걸이 최대 레벨 +2/레벨' },
  { id: 'power_l_shoe', branch: 'power', name: '신발 레벨 업', effect: '신발 최대 레벨 +2/레벨' },
  { id: 'power_l_ring', branch: 'power', name: '반지 레벨 업', effect: '반지 최대 레벨 +2/레벨' },
  { id: 'power_l_belt', branch: 'power', name: '벨트 레벨 업', effect: '벨트 최대 레벨 +2/레벨' },
  // 탈것 소환 2
  { id: 'power_mount_cost', branch: 'power', name: '탈것 소환 비용', effect: '탈것 소환 비용 -1%/레벨' },
  { id: 'power_mount_extra', branch: 'power', name: '추가 탈것 소환 기회', effect: '추가 탈것 소환 기회 +2%/레벨' },

  // 스킬, 펫 & 기술 17
  { id: 'tech_timer', branch: 'skill', name: '기술 연구 타이머', effect: '기술 연구 타이머 속도 +4%/레벨' },
  { id: 'tech_cost', branch: 'skill', name: '기술 노드 업그레이드 비용', effect: '기술 노드 업그레이드 비용 -2%/레벨' },
  { id: 'skill_dmg', branch: 'skill', name: '스킬 피해 숙련', effect: '스킬 피해 +2%/레벨' },
  { id: 'skill_passive_dmg', branch: 'skill', name: '스킬 패시브 피해', effect: '패시브 스킬 기지 피해 +2%/레벨' },
  { id: 'skill_passive_hp', branch: 'skill', name: '스킬 패시브 체력', effect: '패시브 스킬 기지 체력 +2%/레벨' },
  { id: 'skill_summon_cost', branch: 'skill', name: '스킬 소환 비용', effect: '스킬 소환 비용 -1%/레벨' },
  { id: 'pet_dmg', branch: 'skill', name: '펫 피해 숙련', effect: '펫 보너스 피해 +2%/레벨' },
  { id: 'pet_hp', branch: 'skill', name: '펫 체력 숙련', effect: '펫 보너스 체력 +2%/레벨' },
  { id: 'egg_timer_common', branch: 'skill', name: '일반 알 타이머', effect: '일반 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_rare', branch: 'skill', name: '희귀 알 타이머', effect: '희귀 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_epic', branch: 'skill', name: '에픽 알 타이머', effect: '에픽 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_legendary', branch: 'skill', name: '전설의 알 타이머', effect: '전설 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_ultimate', branch: 'skill', name: '궁극의 알 타이머', effect: '궁극 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_mythic', branch: 'skill', name: '신화의 알 타이머', effect: '신화 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_extra', branch: 'skill', name: '추가 알 획득 기회', effect: '추가 알 소환 기회 +2%/레벨' },
  { id: 'ghost_ticket', branch: 'skill', name: '유령 마을 스킬 티켓 보너스', effect: '스킬 티켓 보너스 +1%/레벨' },
  { id: 'zombie_potion', branch: 'skill', name: '좀비 러시 기술 물약 보너스', effect: '기술 물약 보너스 +2%/레벨' },
] as const
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/game/nodes.ts tests/game/nodes.test.ts
git commit -m "기술 노드 47개 목록 추가 — 게임 내 한국어 표기 기준"
```

---

## Phase B — 백엔드

### Task 8: Supabase 스키마 + RLS

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rls.sql`, `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: `servers`, `accounts`, `timers`, `daily_quests`, `push_subscriptions`, `notification_prefs` 테이블

- [ ] **Step 1: Supabase CLI 설치 및 프로젝트 초기화**

```bash
npm install -D supabase
npx supabase init
npx supabase start
```

`supabase start` 가 출력하는 `API URL`, `anon key`, `service_role key` 를 메모한다.

- [ ] **Step 2: 스키마 마이그레이션 작성**

`supabase/migrations/0001_schema.sql`:

```sql
create table servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  server_id uuid not null references servers on delete cascade,
  nickname text not null,
  color text not null default '#7c8cff',
  forge_level int not null default 1 check (forge_level between 1 and 35),
  forge_speed_lv int not null default 0 check (forge_speed_lv between 0 and 25),
  forge_cost_lv  int not null default 0 check (forge_cost_lv  between 0 and 25),
  tech_speed_lv  int not null default 0 check (tech_speed_lv  between 0 and 25),
  tech_cost_lv   int not null default 0 check (tech_cost_lv   between 0 and 25),
  egg_speed_lv jsonb not null default
    '{"common":0,"rare":0,"epic":0,"legendary":0,"ultimate":0,"mythic":0}'::jsonb,
  gold_per_min   numeric,
  hammer_per_min numeric,
  potion_per_day numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  kind text not null check (kind in ('egg','tech','forge')),
  slot int not null default 1,
  meta jsonb not null default '{}'::jsonb,
  auto_sec int,
  is_manual boolean not null default false,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  notified_at timestamptz,
  completed_at timestamptz
);

-- 같은 계정의 같은 슬롯에 활성 타이머는 하나뿐
create unique index timers_active_slot_uniq
  on timers (account_id, kind, slot)
  where completed_at is null;

-- 크론이 매분 스캔하는 경로
create index timers_due_idx
  on timers (ends_at)
  where completed_at is null and notified_at is null;

create table daily_quests (
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  quest_date date not null,
  quest_key text not null,
  done_count int not null default 0,
  primary key (account_id, quest_date, quest_key)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table notification_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  daily_quest_enabled boolean not null default true,
  daily_quest_remind_hours_before int not null default 2
);
```

- [ ] **Step 3: RLS 마이그레이션 작성**

`supabase/migrations/0002_rls.sql`:

```sql
alter table servers            enable row level security;
alter table accounts           enable row level security;
alter table timers             enable row level security;
alter table daily_quests       enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_prefs enable row level security;

create policy own_servers on servers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_accounts on accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_timers on timers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_quests on daily_quests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_subs on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_prefs on notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Step 4: 마이그레이션 적용**

Run: `npx supabase db reset`
Expected: 두 마이그레이션이 오류 없이 적용됨

- [ ] **Step 5: RLS 가 실제로 막는지 확인**

Run:
```bash
npx supabase db reset
psql "$(npx supabase status -o json | jq -r .DB_URL)" -c \
  "set role authenticated; select count(*) from accounts;"
```
Expected: 0행. `auth.uid()` 가 null 이므로 아무것도 안 보여야 한다.

- [ ] **Step 6: .env.example 작성 및 .gitignore 갱신**

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.gitignore` 에 `.env`, `.env.local` 이 있는지 확인한다(Task 1에서 추가함).

- [ ] **Step 7: 커밋**

```bash
git add supabase/ .env.example .gitignore
git commit -m "Supabase 스키마·RLS 마이그레이션 추가"
```

---

### Task 9: Supabase 클라이언트 + 인증

**Files:**
- Create: `src/lib/supabase.ts`, `src/hooks/useSession.ts`, `src/routes/Login.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `supabase` (SupabaseClient 싱글턴)
  - `useSession(): { session: Session | null; loading: boolean }`
  - `<Login />` — 매직링크 로그인 화면

- [ ] **Step 1: 의존성 설치**

```bash
npm install @supabase/supabase-js react-router-dom
```

- [ ] **Step 2: 클라이언트 작성**

`src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다')
}

export const supabase = createClient(url, key)
```

- [ ] **Step 3: 세션 훅 작성**

`src/hooks/useSession.ts`:

```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Step 4: 로그인 화면 작성**

`src/routes/Login.tsx`:

```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return <p>{email} 로 로그인 링크를 보냈습니다. 메일함을 확인하세요.</p>
  }

  return (
    <form onSubmit={send}>
      <h1>Forge 알람</h1>
      <input
        type="email" required value={email} placeholder="이메일"
        onChange={e => setEmail(e.target.value)}
      />
      <button type="submit">로그인 링크 받기</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 5: App 에 라우팅 연결**

`src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useSession } from './hooks/useSession'
import { Login } from './routes/Login'
import { Home } from './routes/Home'
import { AccountDetail } from './routes/AccountDetail'
import { AccountSettings } from './routes/AccountSettings'
import { InstallGuide } from './routes/InstallGuide'

export default function App() {
  const { session, loading } = useSession()
  if (loading) return <p>불러오는 중…</p>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/account/:id" element={<AccountDetail />} />
        <Route path="/account/:id/settings" element={<AccountSettings />} />
        <Route path="/install" element={<InstallGuide />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Home / AccountDetail / AccountSettings / InstallGuide 는 아직 없다. 각각 `export function X() { return null }` 만 있는 빈 파일을 만들어 빌드를 통과시킨다. 내용은 Task 12~17에서 채운다.

- [ ] **Step 6: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "Supabase 클라이언트·매직링크 로그인·라우팅 추가"
```

---

### Task 10: 푸시 구독 등록

**Files:**
- Create: `src/lib/push.ts`, `public/sw.js`
- Test: `tests/lib/push.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 9)
- Produces:
  - `urlBase64ToUint8Array(base64: string): Uint8Array`
  - `subscribePush(): Promise<'ok' | 'denied' | 'unsupported'>`
  - `unsubscribePush(): Promise<void>`

- [ ] **Step 1: VAPID 키 생성**

```bash
npx web-push generate-vapid-keys
```

출력된 public/private 키를 보관한다. public 키는 `.env` 에 `VITE_VAPID_PUBLIC_KEY` 로,
private 키는 Task 11에서 Supabase 시크릿으로 넣는다. `.env.example` 에 `VITE_VAPID_PUBLIC_KEY=` 를 추가한다.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/lib/push.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { urlBase64ToUint8Array } from '../../src/lib/push'

describe('urlBase64ToUint8Array', () => {
  it('URL-safe base64 를 바이트 배열로 바꾼다', () => {
    // "hello" → base64url "aGVsbG8"
    const out = urlBase64ToUint8Array('aGVsbG8')
    expect(Array.from(out)).toEqual([104, 101, 108, 108, 111])
  })
  it('- 와 _ 를 + 와 / 로 되돌린다', () => {
    // 0xFB 0xFF → base64 "+/8=" → base64url "-_8"
    const out = urlBase64ToUint8Array('-_8')
    expect(Array.from(out)).toEqual([251, 255])
  })
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 4: push.ts 구현**

`src/lib/push.ts`:

```ts
import { supabase } from './supabase'

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function subscribePush(): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('로그인이 필요합니다')

  await supabase.from('push_subscriptions').upsert({
    user_id: userData.user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

  return 'ok'
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
```

- [ ] **Step 5: 서비스 워커 작성**

`public/sw.js`:

```js
self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = event.data.json()
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,          // 같은 타이머의 중복 알림을 병합
      renotify: false,
      data: { url: payload.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus().then(() => c.navigate(url))
      }
      return clients.openWindow(url)
    })
  )
})
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add src/lib/push.ts public/sw.js tests/lib/push.test.ts .env.example
git commit -m "Web Push 구독 등록 및 서비스 워커 추가"
```

---

### Task 11: 만기 타이머 푸시 발송 (Edge Function + cron)

**Files:**
- Create: `supabase/functions/dispatch-push/index.ts`, `supabase/migrations/0003_cron.sql`

**Interfaces:**
- Consumes: `timers`, `push_subscriptions`, `accounts`, `servers` 테이블 (Task 8)
- Produces: HTTP POST 로 호출 가능한 `dispatch-push` 함수. 만기 타이머를 찾아 발송하고 `notified_at` 을 채운다.

- [ ] **Step 1: Edge Function 작성**

`supabase/functions/dispatch-push/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,      // 예: mailto:you@example.com
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const KIND_LABEL: Record<string, string> = {
  egg: '알 부화', tech: '기술 연구', forge: '대장간 업그레이드',
}

Deno.serve(async () => {
  const { data: due, error } = await admin
    .from('timers')
    .select('id, user_id, account_id, kind, meta, accounts(nickname, servers(name))')
    .lte('ends_at', new Date().toISOString())
    .is('notified_at', null)
    .is('completed_at', null)
    .limit(500)

  if (error) return new Response(error.message, { status: 500 })
  if (!due?.length) return Response.json({ sent: 0 })

  let sent = 0
  for (const t of due) {
    const acc = t.accounts as unknown as { nickname: string; servers: { name: string } }
    const title = `${acc.servers.name} / ${acc.nickname}`
    const body = `${KIND_LABEL[t.kind] ?? t.kind} 완료`

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', t.user_id)

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, tag: t.id, url: `/account/${t.account_id}` }),
        )
        sent++
      } catch (e) {
        // 410 Gone / 404 = 만료된 구독. 정리한다.
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }

    await admin.from('timers')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', t.id)
  }

  return Response.json({ sent, timers: due.length })
})
```

- [ ] **Step 2: 시크릿 설정**

```bash
npx supabase secrets set \
  VAPID_SUBJECT="mailto:본인이메일" \
  VAPID_PUBLIC_KEY="Task10에서 만든 public 키" \
  VAPID_PRIVATE_KEY="Task10에서 만든 private 키"
```

- [ ] **Step 3: 함수 배포**

```bash
npx supabase functions deploy dispatch-push --no-verify-jwt
```

`--no-verify-jwt` 는 cron 이 JWT 없이 호출하기 때문이다. 대신 Step 4에서 서비스 롤 키를 헤더로 넘긴다.

- [ ] **Step 4: cron 마이그레이션 작성**

`supabase/migrations/0003_cron.sql`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 프로젝트 URL 과 서비스 롤 키를 DB 설정에 저장해 두고 참조한다.
-- 배포 시 아래 두 값을 실제 값으로 바꾼 뒤 실행할 것.
select cron.schedule(
  'dispatch-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 5: 통합 검증 — 만기 타이머가 표시되는지**

로컬에서 계정 1개와 이미 만기된 타이머 1개를 넣고 함수를 직접 호출한다.

```bash
npx supabase functions serve dispatch-push --no-verify-jwt &
curl -s -X POST http://localhost:54321/functions/v1/dispatch-push
```

Expected: `{"sent":0,"timers":1}` (구독이 없으므로 sent 는 0). 이후 DB에서 확인:

```sql
select id, notified_at from timers;
```
Expected: `notified_at` 이 채워져 있다.

- [ ] **Step 6: 재실행해도 중복 발송하지 않는지 확인**

Run: `curl -s -X POST http://localhost:54321/functions/v1/dispatch-push`
Expected: `{"sent":0}` — `notified_at` 이 이미 차 있어 대상에서 빠진다.

- [ ] **Step 7: 커밋**

```bash
git add supabase/functions supabase/migrations/0003_cron.sql
git commit -m "만기 타이머 푸시 발송 Edge Function 및 1분 크론 추가"
```

---

## Phase C — 프론트

### Task 12: 디자인 토큰 + 앱 셸

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/main.tsx`, `src/index.css`

**Interfaces:**
- Consumes: 없음
- Produces: 전역 CSS 변수. 이후 모든 컴포넌트는 색 리터럴 대신 이 변수만 쓴다.

- [ ] **Step 1: 토큰 작성**

`src/styles/tokens.css`:

```css
:root {
  /* 표면 */
  --bg: #14161c;
  --surface: #1c1f28;
  --surface-2: #252936;
  --border: #333949;

  /* 텍스트 */
  --text: #e8eaf0;
  --text-dim: #99a0b3;

  /* 강조 */
  --accent: #7c8cff;
  --danger: #ff6b6b;
  --success: #4ade80;

  /* 등급 — 게임 내 드롭 확률표 기준 */
  --rarity-common: #b8b8b8;
  --rarity-rare: #4cc4f5;
  --rarity-epic: #5fd97f;
  --rarity-legendary: #f5d94c;
  --rarity-ultimate: #f56b6b;
  --rarity-mythic: #b06bf5;

  /* 간격 */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;

  /* 모서리 */
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 16px;

  /* 타이포 */
  --font: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  --fs-sm: 13px;
  --fs-md: 15px;
  --fs-lg: 18px;
  --fs-xl: 24px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: var(--fs-md);
  /* 모바일 전용 — 데스크톱에서도 폭을 제한해 폰 레이아웃을 유지한다 */
  max-width: 560px;
  margin-inline: auto;
  padding: var(--sp-4);
  padding-bottom: var(--sp-6);
}
```

- [ ] **Step 2: main.tsx 에서 import**

`src/main.tsx` 상단에 `import './styles/tokens.css'` 를 추가한다.
기존 `import './index.css'` 는 제거하고 `src/index.css` 파일도 삭제한다(토큰이 대체).

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "디자인 토큰 추가 — 등급 6색 포함, 다크 테마 기본"
```

---

### Task 13: 서버·계정 데이터 훅

**Files:**
- Create: `src/hooks/useAccounts.ts`

**Interfaces:**
- Consumes: `supabase` (Task 9), `AccountConfig` (Task 2)
- Produces:
  - `type AccountRow` — DB 행 + `server_name`
  - `useAccounts(): { accounts: AccountRow[]; servers: ServerRow[]; loading: boolean; reload: () => Promise<void> }`
  - `toConfig(a: AccountRow): AccountConfig` — DB 행을 계산 모듈이 쓰는 형태로 변환
  - `createServer(name: string)`, `createAccount(serverId: string, nickname: string)`
  - `updateAccount(id: string, patch: Partial<AccountRow>)`

- [ ] **Step 1: 훅 작성**

`src/hooks/useAccounts.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AccountConfig, Rarity } from '../game/types'

export interface ServerRow {
  id: string
  name: string
  sort_order: number
}

export interface AccountRow {
  id: string
  server_id: string
  nickname: string
  color: string
  forge_level: number
  forge_speed_lv: number
  forge_cost_lv: number
  tech_speed_lv: number
  tech_cost_lv: number
  egg_speed_lv: Record<Rarity, number>
  gold_per_min: number | null
  hammer_per_min: number | null
  potion_per_day: number | null
  sort_order: number
}

export function toConfig(a: AccountRow): AccountConfig {
  return {
    forgeSpeedLv: a.forge_speed_lv,
    forgeCostLv: a.forge_cost_lv,
    techSpeedLv: a.tech_speed_lv,
    techCostLv: a.tech_cost_lv,
    eggSpeedLv: a.egg_speed_lv,
    goldPerMin: a.gold_per_min,
    hammerPerMin: a.hammer_per_min,
    potionPerDay: a.potion_per_day,
  }
}

export function useAccounts() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [s, a] = await Promise.all([
      supabase.from('servers').select('*').order('sort_order'),
      supabase.from('accounts').select('*').order('sort_order'),
    ])
    setServers((s.data ?? []) as ServerRow[])
    setAccounts((a.data ?? []) as AccountRow[])
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  return { servers, accounts, loading, reload }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('로그인이 필요합니다')
  return data.user.id
}

export async function createServer(name: string) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('servers').insert({ user_id, name })
  if (error) throw error
}

export async function createAccount(server_id: string, nickname: string) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('accounts').insert({ user_id, server_id, nickname })
  if (error) throw error
}

export async function updateAccount(id: string, patch: Partial<AccountRow>) {
  const { error } = await supabase.from('accounts').update(patch).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useAccounts.ts
git commit -m "서버·계정 데이터 훅 추가"
```

---

### Task 14: 타이머 데이터 훅

**Files:**
- Create: `src/hooks/useTimers.ts`

**Interfaces:**
- Consumes: `supabase` (Task 9)
- Produces:
  - `type TimerRow`
  - `useTimers(accountId?: string)` → `{ timers: TimerRow[]; loading: boolean; reload: () => Promise<void> }`
  - `startTimer(input: StartTimerInput): Promise<void>`
  - `cancelTimer(id: string): Promise<void>`
  - `completeTimer(id: string): Promise<void>`

`StartTimerInput = { accountId: string; kind: 'egg'|'tech'|'forge'; slot: number; meta: Record<string, unknown>; sec: number; autoSec: number }`

- [ ] **Step 1: 훅 작성**

`src/hooks/useTimers.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type TimerKind = 'egg' | 'tech' | 'forge'

export interface TimerRow {
  id: string
  account_id: string
  kind: TimerKind
  slot: number
  meta: Record<string, unknown>
  auto_sec: number | null
  is_manual: boolean
  started_at: string
  ends_at: string
  notified_at: string | null
  completed_at: string | null
}

export interface StartTimerInput {
  accountId: string
  kind: TimerKind
  slot: number
  meta: Record<string, unknown>
  sec: number
  autoSec: number
}

export function useTimers(accountId?: string) {
  const [timers, setTimers] = useState<TimerRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    let q = supabase.from('timers').select('*').is('completed_at', null)
    if (accountId) q = q.eq('account_id', accountId)
    const { data } = await q.order('ends_at')
    setTimers((data ?? []) as TimerRow[])
    setLoading(false)
  }, [accountId])

  useEffect(() => { void reload() }, [reload])

  return { timers, loading, reload }
}

export async function startTimer(input: StartTimerInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('로그인이 필요합니다')

  const endsAt = new Date(Date.now() + input.sec * 1000).toISOString()
  const { error } = await supabase.from('timers').insert({
    user_id: u.user.id,
    account_id: input.accountId,
    kind: input.kind,
    slot: input.slot,
    meta: input.meta,
    auto_sec: input.autoSec,
    is_manual: input.sec !== input.autoSec,
    ends_at: endsAt,
  })
  // 유니크 인덱스 위반 = 그 슬롯에 이미 타이머가 있음
  if (error) {
    if (error.code === '23505') throw new Error('이 슬롯에 이미 진행 중인 타이머가 있습니다')
    throw error
  }
}

/** 취소 = 기록을 남기지 않고 지운다 */
export async function cancelTimer(id: string): Promise<void> {
  const { error } = await supabase.from('timers').delete().eq('id', id)
  if (error) throw error
}

/** 완료 확인 = 슬롯을 비운다 */
export async function completeTimer(id: string): Promise<void> {
  const { error } = await supabase.from('timers')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useTimers.ts
git commit -m "타이머 데이터 훅 추가 — 슬롯 중복 시작 차단 포함"
```

---

### Task 15: 소요시간 입력 컴포넌트

**Files:**
- Create: `src/components/DurationInput.tsx`
- Test: `tests/components/durationInput.test.ts`

**Interfaces:**
- Consumes: `formatDuration` (Task 6)
- Produces:
  - `splitDuration(sec: number): { d: number; h: number; m: number }`
  - `joinDuration(p: { d: number; h: number; m: number }): number`
  - `<DurationInput value autoSec onChange />`

스펙 7.2.1의 "자동 계산값을 채워주되 수동 수정 가능" 을 담당하는 컴포넌트다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/components/durationInput.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { splitDuration, joinDuration } from '../../src/components/DurationInput'

describe('splitDuration', () => {
  it('초를 일/시/분으로 나눈다 — 초는 버린다', () => {
    expect(splitDuration(199_140)).toEqual({ d: 2, h: 7, m: 19 })
    expect(splitDuration(500)).toEqual({ d: 0, h: 0, m: 8 })
  })
  it('음수는 0', () => {
    expect(splitDuration(-10)).toEqual({ d: 0, h: 0, m: 0 })
  })
})

describe('joinDuration', () => {
  it('일/시/분을 초로 합친다', () => {
    expect(joinDuration({ d: 2, h: 7, m: 19 })).toBe(199_140)
  })
  it('음수 입력은 0으로 취급한다', () => {
    expect(joinDuration({ d: -1, h: 2, m: -5 })).toBe(7200)
  })
})

describe('왕복', () => {
  it('분 단위로 끊으면 왕복이 보존된다', () => {
    const sec = 199_140
    expect(joinDuration(splitDuration(sec))).toBe(sec)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/components/DurationInput.tsx`:

```tsx
import { formatDuration } from '../game/format'

export function splitDuration(sec: number): { d: number; h: number; m: number } {
  if (sec <= 0) return { d: 0, h: 0, m: 0 }
  return {
    d: Math.floor(sec / 86_400),
    h: Math.floor((sec % 86_400) / 3_600),
    m: Math.floor((sec % 3_600) / 60),
  }
}

export function joinDuration(p: { d: number; h: number; m: number }): number {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0)
  return n(p.d) * 86_400 + n(p.h) * 3_600 + n(p.m) * 60
}

interface Props {
  /** 현재 값(초) */
  value: number
  /** 자동 계산된 값(초). value 와 다르면 대조 표시한다. */
  autoSec: number
  onChange: (sec: number) => void
}

export function DurationInput({ value, autoSec, onChange }: Props) {
  const parts = splitDuration(value)
  const set = (k: 'd' | 'h' | 'm', v: string) =>
    onChange(joinDuration({ ...parts, [k]: Number(v) }))

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        {(['d', 'h', 'm'] as const).map(k => (
          <label key={k} style={{ flex: 1 }}>
            <input
              type="number" min={0} inputMode="numeric"
              value={parts[k]}
              onChange={e => set(k, e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
              {k === 'd' ? '일' : k === 'h' ? '시간' : '분'}
            </span>
          </label>
        ))}
      </div>

      {value !== autoSec && (
        <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
          자동 계산: {formatDuration(autoSec)}
          <button type="button" onClick={() => onChange(autoSec)}>되돌리기</button>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/DurationInput.tsx tests/components/durationInput.test.ts
git commit -m "소요시간 입력 컴포넌트 추가 — 자동값 대조 및 되돌리기"
```

---

### Task 16: 타이머 시작 시트

**Files:**
- Create: `src/components/TimerStartSheet.tsx`

**Interfaces:**
- Consumes: `DurationInput` (Task 15), `eggHatchSec`/`techDuration`/`forgeDuration`/`isForgeFreeSkip` (Task 4), `TECH_NODES` (Task 7), `RARITIES`/`RARITY_LABEL` (Task 2), `startTimer` (Task 14), `toConfig`/`AccountRow` (Task 13)
- Produces: `<TimerStartSheet account kind slot onDone onCancel />`

스펙 7.2.1의 3단계 플로우를 구현한다. 대상 입력이 바뀌면 자동 계산값이 다시 채워지되,
사용자가 시간을 직접 건드린 뒤에는 덮어쓰지 않는다.

- [ ] **Step 1: 구현**

`src/components/TimerStartSheet.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { DurationInput } from './DurationInput'
import { RARITIES, RARITY_LABEL } from '../game/constants'
import { TECH_NODES, BRANCH_LABEL } from '../game/nodes'
import { eggHatchSec, techDuration, forgeDuration, isForgeFreeSkip } from '../game/durations'
import { gemsToSkip } from '../game/formulas'
import { startTimer, type TimerKind } from '../hooks/useTimers'
import { toConfig, type AccountRow } from '../hooks/useAccounts'
import type { Rarity } from '../game/types'

interface Props {
  account: AccountRow
  kind: TimerKind
  slot: number
  onDone: () => void
  onCancel: () => void
}

export function TimerStartSheet({ account, kind, slot, onDone, onCancel }: Props) {
  const cfg = useMemo(() => toConfig(account), [account])

  // 2단계 입력 상태
  const [rarity, setRarity] = useState<Rarity>('common')
  const [nodeId, setNodeId] = useState(TECH_NODES[0].id)
  const [tier, setTier] = useState(1)
  const [level, setLevel] = useState(1)

  const targetForgeLevel = account.forge_level + 1

  // 자동 계산값
  const auto = useMemo(() => {
    if (kind === 'egg') return { sec: eggHatchSec(rarity, cfg), cost: null as string | null }
    if (kind === 'tech') {
      const r = techDuration(tier, level, cfg)
      return { sec: r.sec, cost: `물약 ${r.potions.toLocaleString()}` }
    }
    if (targetForgeLevel > 35) return { sec: 0, cost: null }
    const r = forgeDuration(targetForgeLevel, cfg)
    return { sec: r.sec, cost: `골드 ${r.gold.toLocaleString()}` }
  }, [kind, rarity, tier, level, cfg, targetForgeLevel])

  // 3단계: 자동값으로 채우되, 손댄 뒤에는 덮어쓰지 않는다
  const [sec, setSec] = useState(auto.sec)
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (!touched) setSec(auto.sec) }, [auto.sec, touched])

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const forgeMaxed = kind === 'forge' && targetForgeLevel > 35
  const forgeFree = kind === 'forge' && isForgeFreeSkip(targetForgeLevel)

  async function submit() {
    setBusy(true); setError(null)
    try {
      const meta =
        kind === 'egg' ? { rarity }
        : kind === 'tech' ? { nodeId, tier, level }
        : { targetLevel: targetForgeLevel }
      await startTimer({ accountId: account.id, kind, slot, meta, sec, autoSec: auto.sec })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* 2단계 — 대상 입력 */}
      {kind === 'egg' && (
        <fieldset>
          <legend>알 등급</legend>
          {RARITIES.map(r => (
            <button
              key={r} type="button"
              onClick={() => { setRarity(r); setTouched(false) }}
              style={{
                borderColor: `var(--rarity-${r})`,
                fontWeight: rarity === r ? 700 : 400,
              }}
            >
              {RARITY_LABEL[r]}
            </button>
          ))}
        </fieldset>
      )}

      {kind === 'tech' && (
        <fieldset>
          <legend>기술</legend>
          <select value={nodeId} onChange={e => setNodeId(e.target.value)}>
            {TECH_NODES.map(n => (
              <option key={n.id} value={n.id}>
                [{BRANCH_LABEL[n.branch]}] {n.name}
              </option>
            ))}
          </select>

          <label>
            티어
            <select value={tier} onChange={e => { setTier(Number(e.target.value)); setTouched(false) }}>
              {[1, 2, 3, 4, 5].map(t => (
                <option key={t} value={t}>{'I'.repeat(t).replace('IIII', 'IV').replace('IIIII', 'V')}</option>
              ))}
            </select>
          </label>

          <label>
            몇 번째 업그레이드
            <select value={level} onChange={e => { setLevel(Number(e.target.value)); setTouched(false) }}>
              {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}/5</option>)}
            </select>
          </label>
        </fieldset>
      )}

      {kind === 'forge' && (
        <p>
          대장간 {account.forge_level} → <strong>{targetForgeLevel}</strong>
          {forgeMaxed && ' — 이미 최대 레벨입니다. 승천 후 레벨을 1로 되돌리세요.'}
          {forgeFree && ' — 게임에서 무료 즉시완료가 가능한 구간입니다.'}
        </p>
      )}

      {/* 3단계 — 시간 확인·수정 */}
      {!forgeMaxed && (
        <>
          {auto.cost && <p>필요 자원: {auto.cost}</p>}
          <DurationInput
            value={sec}
            autoSec={auto.sec}
            onChange={v => { setTouched(true); setSec(v) }}
          />
          <p style={{ color: 'var(--text-dim)' }}>즉시완료 시 젬 {gemsToSkip(sec).toLocaleString()}</p>
          <button type="button" onClick={submit} disabled={busy || sec <= 0}>시작</button>
        </>
      )}
      <button type="button" onClick={onCancel}>취소</button>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: 티어 로마숫자 변환이 맞는지 확인**

위 코드의 `'I'.repeat(t).replace(...)` 는 읽기 어렵고 5에서 깨진다. 상수 배열로 교체한다:

```tsx
const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const
// ...
<option key={t} value={t}>{TIER_LABEL[t - 1]}</option>
```

파일 상단에 `TIER_LABEL` 을 선언하고 `<option>` 을 위 형태로 바꾼다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/TimerStartSheet.tsx
git commit -m "타이머 시작 시트 추가 — 대상 선택 후 자동 시간 제시, 수동 수정 허용"
```

---

### Task 17: 카운트다운 + 계정 상세

**Files:**
- Create: `src/components/Countdown.tsx`, `src/components/SlotCard.tsx`
- Modify: `src/routes/AccountDetail.tsx`

**Interfaces:**
- Consumes: `formatCountdown` (Task 6), `useTimers`/`completeTimer`/`cancelTimer` (Task 14), `TimerStartSheet` (Task 16), `useAccounts`/`updateAccount` (Task 13), `gemsToSkip` (Task 3)
- Produces: `<Countdown endsAt />`, `<SlotCard />`, 완성된 `<AccountDetail />`

- [ ] **Step 1: Countdown 작성**

`src/components/Countdown.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { formatCountdown } from '../game/format'

export function Countdown({ endsAt, onElapsed }: { endsAt: string; onElapsed?: () => void }) {
  const remain = () => Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)
  const [sec, setSec] = useState(remain)

  useEffect(() => {
    setSec(remain())
    const id = setInterval(() => {
      const r = remain()
      setSec(r)
      if (r <= 0) { clearInterval(id); onElapsed?.() }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: sec <= 0 ? 'var(--success)' : 'var(--text)' }}>
      {sec <= 0 ? '완료' : formatCountdown(sec)}
    </span>
  )
}
```

- [ ] **Step 2: SlotCard 작성**

`src/components/SlotCard.tsx`:

```tsx
import { Countdown } from './Countdown'
import { gemsToSkip } from '../game/formulas'
import { RARITY_LABEL } from '../game/constants'
import { TECH_NODES } from '../game/nodes'
import type { TimerRow } from '../hooks/useTimers'
import type { Rarity } from '../game/types'

const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const

function describe(t: TimerRow): string {
  if (t.kind === 'egg') return `${RARITY_LABEL[t.meta.rarity as Rarity]} 알`
  if (t.kind === 'tech') {
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    return `${node?.name ?? '기술'} ${TIER_LABEL[(t.meta.tier as number) - 1]} ${t.meta.level}/5`
  }
  return `대장간 → ${t.meta.targetLevel}`
}

interface Props {
  label: string
  timer?: TimerRow
  onStart: () => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onElapsed: () => void
}

export function SlotCard({ label, timer, onStart, onComplete, onCancel, onElapsed }: Props) {
  if (!timer) {
    return (
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)' }}>
        <div style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div style={{ color: 'var(--text-dim)' }}>비어 있음</div>
        <button type="button" onClick={onStart}>시작</button>
      </div>
    )
  }

  const remain = Math.floor((new Date(timer.ends_at).getTime() - Date.now()) / 1000)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)' }}>
      <div style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div>{describe(timer)}</div>
      <Countdown endsAt={timer.ends_at} onElapsed={onElapsed} />
      {remain > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
          즉시완료 젬 {gemsToSkip(remain).toLocaleString()}
        </div>
      )}
      <button type="button" onClick={() => onComplete(timer.id)}>완료</button>
      <button type="button" onClick={() => onCancel(timer.id)}>취소</button>
    </div>
  )
}
```

- [ ] **Step 3: AccountDetail 작성**

`src/routes/AccountDetail.tsx`:

```tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount } from '../hooks/useAccounts'
import { useTimers, completeTimer, cancelTimer, type TimerKind } from '../hooks/useTimers'
import { SlotCard } from '../components/SlotCard'
import { TimerStartSheet } from '../components/TimerStartSheet'
import { DailyQuests } from '../components/DailyQuests'

const EGG_SLOTS = [1, 2, 3, 4]

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const { accounts, reload: reloadAccounts } = useAccounts()
  const { timers, reload } = useTimers(id)
  const [sheet, setSheet] = useState<{ kind: TimerKind; slot: number } | null>(null)

  const account = accounts.find(a => a.id === id)
  if (!account) return <p>계정을 찾을 수 없습니다.</p>

  const find = (kind: TimerKind, slot: number) =>
    timers.find(t => t.kind === kind && t.slot === slot)

  async function onComplete(timerId: string) {
    const t = timers.find(x => x.id === timerId)
    await completeTimer(timerId)
    // 대장간 완료 시 레벨을 올린다
    if (t?.kind === 'forge' && account) {
      await updateAccount(account.id, { forge_level: t.meta.targetLevel as number })
      await reloadAccounts()
    }
    await reload()
  }

  async function onCancel(timerId: string) {
    await cancelTimer(timerId)
    await reload()
  }

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1 style={{ color: account.color }}>{account.nickname}</h1>
      <Link to={`/account/${account.id}/settings`}>설정</Link>

      <h2>펫 부화</h2>
      {EGG_SLOTS.map(slot => (
        <SlotCard
          key={slot} label={`슬롯 ${slot}`} timer={find('egg', slot)}
          onStart={() => setSheet({ kind: 'egg', slot })}
          onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
        />
      ))}

      <h2>기술 연구</h2>
      <SlotCard
        label="연구" timer={find('tech', 1)}
        onStart={() => setSheet({ kind: 'tech', slot: 1 })}
        onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
      />

      <h2>대장간 (레벨 {account.forge_level})</h2>
      <SlotCard
        label="업그레이드" timer={find('forge', 1)}
        onStart={() => setSheet({ kind: 'forge', slot: 1 })}
        onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
      />

      <DailyQuests accountId={account.id} />

      {sheet && (
        <TimerStartSheet
          account={account} kind={sheet.kind} slot={sheet.slot}
          onDone={() => { setSheet(null); void reload() }}
          onCancel={() => setSheet(null)}
        />
      )}
    </div>
  )
}
```

`DailyQuests` 는 Task 18에서 만든다. 그 전까지 빌드를 통과시키려면
`src/components/DailyQuests.tsx` 에 `export function DailyQuests(_: { accountId: string }) { return null }` 를 먼저 만들어 둔다.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "계정 상세 화면 추가 — 펫 4슬롯·기술·대장간 타이머"
```

---

### Task 18: 일일퀘스트

**Files:**
- Modify: `src/components/DailyQuests.tsx`
- Create: `src/hooks/useDailyQuests.ts`, `src/game/quests.ts`
- Test: `tests/game/quests.test.ts`

**Interfaces:**
- Consumes: `questDateKst`/`nextQuestResetAt`/`formatDuration` (Task 6), `supabase` (Task 9)
- Produces:
  - `DAILY_QUESTS: readonly { key: string; label: string; max: number }[]`
  - `useDailyQuests(accountId)` → `{ counts, loading, bump, reload }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game/quests.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DAILY_QUESTS, totalQuestSlots } from '../../src/game/quests'

describe('DAILY_QUESTS', () => {
  it('5종이다', () => {
    expect(DAILY_QUESTS).toHaveLength(5)
  })
  it('게임 표기와 횟수가 맞다', () => {
    expect(DAILY_QUESTS).toEqual([
      { key: 'hammer_thief', label: '망치도둑', max: 2 },
      { key: 'ghost_town', label: '유령마을', max: 2 },
      { key: 'invasion', label: '침략', max: 2 },
      { key: 'zombie_rush', label: '좀비러시', max: 2 },
      { key: 'clan_mission', label: '클랜임무', max: 3 },
    ])
  })
  it('하루 총 11회다', () => {
    expect(totalQuestSlots()).toBe(11)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 상수 구현**

`src/game/quests.ts`:

```ts
export interface DailyQuest {
  key: string
  label: string
  max: number
}

/** KST 09:00 리셋. 전 서버 공통. */
export const DAILY_QUESTS: readonly DailyQuest[] = [
  { key: 'hammer_thief', label: '망치도둑', max: 2 },
  { key: 'ghost_town', label: '유령마을', max: 2 },
  { key: 'invasion', label: '침략', max: 2 },
  { key: 'zombie_rush', label: '좀비러시', max: 2 },
  { key: 'clan_mission', label: '클랜임무', max: 3 },
] as const

export function totalQuestSlots(): number {
  return DAILY_QUESTS.reduce((a, q) => a + q.max, 0)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 훅 구현**

`src/hooks/useDailyQuests.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { questDateKst } from '../game/format'
import { DAILY_QUESTS } from '../game/quests'

export function useDailyQuests(accountId: string) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const date = questDateKst(new Date())

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('daily_quests').select('quest_key, done_count')
      .eq('account_id', accountId).eq('quest_date', date)
    const next: Record<string, number> = {}
    for (const q of DAILY_QUESTS) next[q.key] = 0
    for (const r of data ?? []) next[r.quest_key as string] = r.done_count as number
    setCounts(next)
    setLoading(false)
  }, [accountId, date])

  useEffect(() => { void reload() }, [reload])

  /** 탭하면 1 증가, 최대치에서 다시 탭하면 0으로 되돌린다 */
  const bump = useCallback(async (key: string, max: number) => {
    const current = counts[key] ?? 0
    const next = current >= max ? 0 : current + 1
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) throw new Error('로그인이 필요합니다')
    await supabase.from('daily_quests').upsert({
      user_id: u.user.id, account_id: accountId,
      quest_date: date, quest_key: key, done_count: next,
    }, { onConflict: 'account_id,quest_date,quest_key' })
    setCounts(c => ({ ...c, [key]: next }))
  }, [accountId, counts, date])

  return { counts, loading, bump, reload }
}
```

- [ ] **Step 6: 컴포넌트 구현**

`src/components/DailyQuests.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { DAILY_QUESTS } from '../game/quests'
import { useDailyQuests } from '../hooks/useDailyQuests'
import { nextQuestResetAt, formatDuration } from '../game/format'

export function DailyQuests({ accountId }: { accountId: string }) {
  const { counts, bump } = useDailyQuests(accountId)
  const [until, setUntil] = useState(0)

  useEffect(() => {
    const tick = () =>
      setUntil(Math.floor((nextQuestResetAt(new Date()).getTime() - Date.now()) / 1000))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section>
      <h2>일일퀘스트</h2>
      <p style={{ color: 'var(--text-dim)' }}>리셋까지 {formatDuration(until)}</p>
      {DAILY_QUESTS.map(q => {
        const done = counts[q.key] ?? 0
        const complete = done >= q.max
        return (
          <button
            key={q.key} type="button"
            onClick={() => void bump(q.key, q.max)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'var(--surface)', color: complete ? 'var(--success)' : 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
            }}
          >
            {q.label} {done}/{q.max} {complete && '✓'}
          </button>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "일일퀘스트 체크리스트 추가 — KST 09시 리셋 카운트다운 포함"
```

---

### Task 19: 계정 설정 화면

**Files:**
- Modify: `src/routes/AccountSettings.tsx`

**Interfaces:**
- Consumes: `useAccounts`/`updateAccount`/`toConfig` (Task 13), `RATE_PER_LEVEL`/`RARITIES`/`RARITY_LABEL`/`MAX_NODE_LEVEL` (Task 2), `eggHatchSec` (Task 4), `formatDuration` (Task 6)
- Produces: 단축 레벨 10개 + 수급률 3개를 편집하는 화면. 각 항목에 현재 효과를 함께 보여준다.

- [ ] **Step 1: 구현**

`src/routes/AccountSettings.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount, toConfig, type AccountRow } from '../hooks/useAccounts'
import { RARITIES, RARITY_LABEL, RATE_PER_LEVEL, MAX_NODE_LEVEL } from '../game/constants'
import { eggHatchSec } from '../game/durations'
import { formatDuration } from '../game/format'
import type { Rarity } from '../game/types'

function LevelRow({ label, value, ratePct, onChange, note }: {
  label: string; value: number; ratePct: number
  onChange: (v: number) => void; note?: string
}) {
  const total = value * ratePct
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
      <span style={{ flex: 1 }}>{label}</span>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span style={{ minWidth: '2.5em', textAlign: 'center' }}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(MAX_NODE_LEVEL, value + 1))}>+</button>
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
    await updateAccount(draft.id, {
      forge_speed_lv: draft.forge_speed_lv, forge_cost_lv: draft.forge_cost_lv,
      tech_speed_lv: draft.tech_speed_lv, tech_cost_lv: draft.tech_cost_lv,
      egg_speed_lv: draft.egg_speed_lv, forge_level: draft.forge_level,
      gold_per_min: draft.gold_per_min, hammer_per_min: draft.hammer_per_min,
      potion_per_day: draft.potion_per_day, nickname: draft.nickname,
    })
    await reload()
    setSaved(true)
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
          onChange={e => set({ forge_level: Number(e.target.value) })} />
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

      <button type="button" onClick={() => void save()}>저장</button>
      {saved && <span style={{ color: 'var(--success)' }}>저장됨</span>}
    </div>
  )
}
```

- [ ] **Step 2: 수동 확인 — 알 타이머 효과가 실시간 반영되는지**

Run: `npm run dev`
브라우저에서 계정 설정 진입 → 신화 알 레벨을 25로 올린다.
Expected: 옆 표시가 `→ 9시간 8분` 으로 바뀐다 (32914초).

- [ ] **Step 3: 커밋**

```bash
git add src/routes/AccountSettings.tsx
git commit -m "계정 설정 화면 추가 — 단축 레벨·수급률 편집 및 효과 미리보기"
```

---

### Task 20: 홈 화면 + 서버/계정 추가

**Files:**
- Modify: `src/routes/Home.tsx`

**Interfaces:**
- Consumes: `useAccounts`/`createServer`/`createAccount`/`toConfig` (Task 13), `useTimers` (Task 14), `formatCountdown` (Task 6), `resourceEta` (Task 5), `forgeDuration` (Task 4)
- Produces: 서버별로 묶인 계정 카드 목록 + 추가 폼

- [ ] **Step 1: 구현**

`src/routes/Home.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, createServer, createAccount, toConfig } from '../hooks/useAccounts'
import { useTimers } from '../hooks/useTimers'
import { formatCountdown, formatDuration } from '../game/format'
import { forgeDuration } from '../game/durations'
import { resourceEta } from '../game/eta'

const KIND_ICON = { egg: '🥚', tech: '⚗️', forge: '⚒️' } as const

export function Home() {
  const { servers, accounts, loading, reload } = useAccounts()
  const { timers } = useTimers()
  const [serverName, setServerName] = useState('')
  const [nick, setNick] = useState<Record<string, string>>({})

  if (loading) return <p>불러오는 중…</p>

  return (
    <div>
      <h1>Forge 알람</h1>
      <Link to="/install">알림이 안 오나요?</Link>

      {servers.map(s => {
        const list = accounts.filter(a => a.server_id === s.id)
        return (
          <section key={s.id}>
            <h2>{s.name}</h2>
            {list.map(a => {
              const mine = timers.filter(t => t.account_id === a.id)
              const soonest = mine
                .map(t => Math.floor((new Date(t.ends_at).getTime() - Date.now()) / 1000))
                .sort((x, y) => x - y)[0]

              // 다음 대장간 레벨까지 골드 ETA
              let goldNote: string | null = null
              if (a.forge_level < 35 && a.gold_per_min) {
                const need = forgeDuration(a.forge_level + 1, toConfig(a)).gold
                const min = resourceEta(need, 0, a.gold_per_min)
                if (min !== null) goldNote = `다음 대장간 골드까지 ${formatDuration(min * 60)}`
              }

              const counts = { egg: 0, tech: 0, forge: 0 }
              for (const t of mine) counts[t.kind]++

              return (
                <Link key={a.id} to={`/account/${a.id}`}
                  style={{
                    display: 'block', background: 'var(--surface)',
                    borderLeft: `4px solid ${a.color}`, borderRadius: 'var(--r-md)',
                    padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
                    color: 'var(--text)', textDecoration: 'none',
                  }}>
                  <strong>{a.nickname}</strong>
                  <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
                    {(['egg', 'tech', 'forge'] as const)
                      .filter(k => counts[k] > 0)
                      .map(k => `${KIND_ICON[k]}${counts[k]}`)
                      .join(' ') || '진행 중인 타이머 없음'}
                  </div>
                  {soonest !== undefined && (
                    <div>가장 빠른 완료: {formatCountdown(soonest)}</div>
                  )}
                  {goldNote && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>{goldNote}</div>
                  )}
                </Link>
              )
            })}

            <form onSubmit={async e => {
              e.preventDefault()
              const v = (nick[s.id] ?? '').trim()
              if (!v) return
              await createAccount(s.id, v)
              setNick({ ...nick, [s.id]: '' })
              await reload()
            }}>
              <input placeholder="계정 추가" value={nick[s.id] ?? ''}
                onChange={e => setNick({ ...nick, [s.id]: e.target.value })} />
              <button type="submit">추가</button>
            </form>
          </section>
        )
      })}

      <form onSubmit={async e => {
        e.preventDefault()
        const v = serverName.trim()
        if (!v) return
        await createServer(v)
        setServerName('')
        await reload()
      }}>
        <input placeholder="서버 추가" value={serverName}
          onChange={e => setServerName(e.target.value)} />
        <button type="submit">추가</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 수동 확인 — 전체 흐름**

Run: `npm run dev`
서버 추가 → 계정 추가 → 계정 진입 → 설정에서 기술 연구 타이머를 5로 → 상세에서 기술 연구 시작(티어 I, 1/5)
Expected: 자동 계산 시간이 `4분 10초`(250초)로 채워진다. 게임 실측값과 동일하다.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/Home.tsx
git commit -m "홈 화면 추가 — 서버별 계정 카드·타이머 요약·골드 ETA"
```

---

## Phase D — PWA 마감

### Task 21: PWA 설치 + 설치 안내

**Files:**
- Modify: `vite.config.ts`, `src/routes/InstallGuide.tsx`, `src/main.tsx`
- Create: `public/icon-192.png`, `public/icon-512.png`

**Interfaces:**
- Consumes: `subscribePush` (Task 10)
- Produces: 설치 가능한 PWA, iOS/안드로이드 분기 안내 화면

- [ ] **Step 1: 플러그인 설치**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: vite.config.ts 수정**

`plugins` 배열에 아래를 추가한다. `injectManifest` 전략으로 Task 10에서 만든 `public/sw.js` 의 push 핸들러를 유지한다.

```ts
import { VitePWA } from 'vite-plugin-pwa'

// plugins: [react(), VitePWA({ ... })]
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'public',
  filename: 'sw.js',
  registerType: 'autoUpdate',
  injectManifest: { injectionPoint: undefined },
  manifest: {
    name: 'Forge 알람',
    short_name: 'Forge',
    description: 'Forge Master 타이머 알림',
    theme_color: '#14161c',
    background_color: '#14161c',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

- [ ] **Step 3: 아이콘 생성**

192×192, 512×512 PNG 를 `public/` 에 넣는다. 임시로 단색 배경에 망치 이모지를 그린 것이면 충분하다.

```bash
# ImageMagick 이 있으면
magick -size 512x512 xc:'#14161c' -gravity center -pointsize 300 -fill '#7c8cff' -annotate 0 '⚒' public/icon-512.png
magick public/icon-512.png -resize 192x192 public/icon-192.png
```

없으면 아무 이미지 편집기로 만들어 같은 경로에 저장한다.

- [ ] **Step 4: 설치 안내 화면 작성**

`src/routes/InstallGuide.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribePush } from '../lib/push'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari 전용 플래그
  (navigator as unknown as { standalone?: boolean }).standalone === true

export function InstallGuide() {
  const [status, setStatus] = useState<string | null>(null)

  async function enable() {
    const r = await subscribePush()
    setStatus(
      r === 'ok' ? '알림이 켜졌습니다.'
      : r === 'denied' ? '브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 허용해 주세요.'
      : '이 브라우저는 푸시를 지원하지 않습니다.'
    )
  }

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1>알림 설정</h1>

      {isIos() && !isStandalone() && (
        <section style={{ background: 'var(--surface-2)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)' }}>
          <h2>iPhone / iPad</h2>
          <p>
            iOS는 <strong>홈 화면에 추가</strong>한 뒤에만 알림을 받을 수 있습니다.
            (브라우저 탭 상태로는 불가능합니다)
          </p>
          <ol>
            <li>Safari 하단의 <strong>공유</strong> 버튼을 누릅니다</li>
            <li><strong>홈 화면에 추가</strong>를 선택합니다</li>
            <li>홈 화면에 생긴 아이콘으로 앱을 다시 엽니다</li>
            <li>이 화면에서 <strong>알림 켜기</strong>를 누릅니다</li>
          </ol>
        </section>
      )}

      {!isIos() && (
        <section>
          <h2>Android</h2>
          <p>아래 버튼을 누르고 알림을 허용하면 됩니다. 홈 화면에 추가하면 더 안정적입니다.</p>
        </section>
      )}

      <button type="button" onClick={() => void enable()}>알림 켜기</button>
      {status && <p>{status}</p>}
    </div>
  )
}
```

- [ ] **Step 5: 빌드 및 매니페스트 확인**

Run: `npm run build && ls dist`
Expected: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` 가 있다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "PWA 매니페스트·아이콘 및 iOS/안드로이드 설치 안내 추가"
```

---

### Task 22: 포그라운드 알림

**Files:**
- Create: `src/hooks/useForegroundAlarm.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useTimers` (Task 14)
- Produces: `useForegroundAlarm()` — 앱이 열려 있는 동안 만기 시점에 즉시 알림을 띄운다. 서버 푸시와는 `tag` 로 병합된다.

크론이 1분 주기라 최대 60초 지연이 생긴다. 일반 알 만렙은 8분 34초로 짧아 상대오차가 크므로,
앱이 열려 있을 때만이라도 정확한 시점에 알린다.

- [ ] **Step 1: 구현**

`src/hooks/useForegroundAlarm.ts`:

```ts
import { useEffect, useRef } from 'react'
import { useTimers } from './useTimers'

export function useForegroundAlarm() {
  const { timers } = useTimers()
  const fired = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const handles: number[] = []
    for (const t of timers) {
      if (fired.current.has(t.id)) continue
      const ms = new Date(t.ends_at).getTime() - Date.now()
      // 이미 지난 것은 서버 푸시가 처리한다. 25일 넘는 예약은 setTimeout 한계로 건너뛴다.
      if (ms <= 0 || ms > 2_147_483_647) continue

      handles.push(window.setTimeout(() => {
        fired.current.add(t.id)
        new Notification('타이머 완료', {
          body: t.kind === 'egg' ? '알 부화 완료' : t.kind === 'tech' ? '기술 연구 완료' : '대장간 업그레이드 완료',
          tag: t.id,   // 서버 푸시와 같은 tag → 중복 표시되지 않는다
        })
      }, ms))
    }

    return () => handles.forEach(clearTimeout)
  }, [timers])
}
```

- [ ] **Step 2: App 에 연결**

`src/App.tsx` 의 로그인 이후 트리에서 훅을 호출한다. `BrowserRouter` 내부에 얇은 래퍼를 두는 대신, `App` 컴포넌트 본문에서 바로 호출하면 된다:

```tsx
export default function App() {
  const { session, loading } = useSession()
  useForegroundAlarm()   // ← 추가 (훅은 조건부 호출 금지이므로 return 보다 위에)
  if (loading) return <p>불러오는 중…</p>
  ...
}
```

`useForegroundAlarm` 내부가 `useTimers` 를 쓰는데 비로그인 상태에서는 RLS 때문에 빈 배열이 오므로 안전하다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "포그라운드 알림 추가 — 짧은 타이머의 크론 지연 보정"
```

---

### Task 23: 배포 및 실기기 검증

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 전체
- Produces: 배포된 URL, 실기기 푸시 확인

- [ ] **Step 1: Supabase 원격 프로젝트에 배포**

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase functions deploy dispatch-push --no-verify-jwt
```

`supabase/migrations/0003_cron.sql` 의 `<PROJECT_REF>` 와 `<SERVICE_ROLE_KEY>` 를 실제 값으로 바꾼 뒤 push 한다.
서비스 롤 키는 커밋하지 않는다 — SQL Editor 에서 직접 실행하고, 파일에는 플레이스홀더를 남긴다.

- [ ] **Step 2: Cloudflare Pages 배포**

```bash
npm run build
npx wrangler pages deploy dist --project-name forge-alarm
```

Pages 대시보드에서 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` 를 설정하고 재배포한다.

- [ ] **Step 3: Supabase Auth 리디렉션 URL 등록**

Supabase 대시보드 → Authentication → URL Configuration 에 배포된 도메인을 추가한다.
등록하지 않으면 매직링크가 동작하지 않는다.

- [ ] **Step 4: 실기기 검증 체크리스트**

자동화가 어려우므로 수동으로 확인한다. 각 항목을 직접 실행하고 결과를 기록한다.

- [ ] Android Chrome: 로그인 → 알림 켜기 → 3분짜리 타이머 시작 → **앱 완전 종료** → 알림 수신
- [ ] Android: 알림 탭 → 해당 계정 상세로 이동
- [ ] iOS Safari: 홈 화면에 추가 → 앱 실행 → 알림 켜기 → 3분 타이머 → **앱 종료** → 알림 수신
- [ ] iOS: 홈 화면 추가 없이 알림 켜기 시도 → 안내 문구가 보이는지
- [ ] 두 기기 동시 로그인 → 한 타이머가 양쪽에 모두 알림
- [ ] 기내 모드로 전환 → 카운트다운이 계속 동작 (ends_at 이 절대시각이므로)
- [ ] 같은 슬롯에 타이머 두 번 시작 시도 → "이미 진행 중인 타이머가 있습니다" 표시
- [ ] 대장간 타이머 완료 → 계정의 대장간 레벨이 +1

- [ ] **Step 5: README 작성**

`README.md`:

```markdown
# Forge 알람

Forge Master 의 펫 부화·기술 연구·대장간 업그레이드 타이머를
서버/계정별로 관리하고 모바일 푸시로 알려주는 PWA.

## 개발

    npm install
    cp .env.example .env    # Supabase URL/키, VAPID public 키 입력
    npx supabase start
    npm run dev

## 테스트

    npm test

`src/game/` 의 계산 로직은 게임 내 실측값을 픽스처로 고정해 두었다.
게임 패치로 상수가 바뀌면 이 테스트가 먼저 깨진다.

## 문서

- 설계: `docs/superpowers/specs/2026-08-14-forge-master-alarm-design.md`
- 게임 데이터: `docs/reference/tech-nodes.md`
```

- [ ] **Step 6: 커밋**

```bash
git add README.md
git commit -m "README 추가 및 배포 절차 문서화"
```

---

## 자체 검토 결과

**스펙 커버리지**

| 스펙 항목 | 담당 태스크 |
|---|---|
| 2. 스코프 — 서버/계정 다중 | 8, 13, 20 |
| 3.1 공통 공식 | 3 |
| 3.2 단축/할인 노드 | 2, 4, 19 |
| 3.2.1 브랜치·노드 목록 | 7 |
| 3.3 펫 부화 | 2, 4 |
| 3.4 테크 표 | 2, 4 |
| 3.5 대장간 표 | 2, 4 |
| 3.6 일일퀘스트 | 18 |
| 3.7 오프라인 시간 | v1 제외 (스펙 명시) |
| 4. 아키텍처 | 1, 8, 9, 11, 21 |
| 5. 데이터 모델 | 8 |
| 6. 계산 모듈 | 2~7 |
| 7.1 홈 | 20 |
| 7.2 계정 상세 | 17 |
| 7.2.1 타이머 시작 3단계 | 15, 16 |
| 7.3 계정 설정 | 19 |
| 7.4 설치 안내 | 21 |
| 7.5 테마 토큰 | 12 |
| 8.1 만기 푸시 | 11 |
| 8.2 일퀘 알림 | **미구현 — 아래 참조** |
| 8.3 포그라운드 보정 | 22 |
| 9. 에러 처리 | 14(중복), 16(에러표시), 21(권한), 11(410 정리) |
| 10. 테스트 | 2~7, 15, 18, 23 |

**의도적으로 뺀 것:** 스펙 8.2의 일일퀘스트 리셋 전 푸시 알림은 v1 태스크에 넣지 않았다.
타이머 알림과 별개의 크론·집계 로직이 필요한데, 일퀘는 앱에서 체크리스트로 확인 가능하고
알림 없이도 기능이 성립한다. 타이머 푸시가 실기기에서 확실히 동작하는 것을 먼저 확인한 뒤
후속 작업으로 추가하는 편이 낫다. `notification_prefs` 테이블은 Task 8에서 미리 만들어 두었다.

**타입 일관성 확인:** `AccountConfig`(Task 2) → `toConfig`(Task 13) → `durations`(Task 4) 경로에서
필드명이 일치한다. `TimerRow.meta` 는 Task 16이 쓰고 Task 17이 읽는데
`{rarity}` / `{nodeId, tier, level}` / `{targetLevel}` 로 양쪽이 같다.
`gemsToSkip` 은 Task 3에서 정의하고 16·17에서 쓴다.
