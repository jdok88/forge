import { describe, it, expect } from 'vitest'
import { eggHatchSec, techDuration, forgeDuration, techIndex, isForgeFreeSkip, offlineCapSec } from '../../src/game/durations'
import type { AccountConfig } from '../../src/game/types'

const VANILLA: AccountConfig = {
  forgeSpeedLv: 0, forgeCostLv: 0, techSpeedLv: 0, techCostLv: 0,
  eggSpeedLv: { common: 0, rare: 0, epic: 0, legendary: 0, ultimate: 0, mythic: 0 },
  goldPerSec: null, hammerPerMin: null, potionPerDay: null,
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

describe('offlineCapSec', () => {
  it('노드 0단계는 기준값 4시간', () => {
    expect(offlineCapSec(0)).toBe(14_400)
  })
  // +16%/단계가 기준값에 곱해진다 — 나누는 타이머 속도와 방향이 반대다
  it('1단계는 +16% = 4시간 38분 24초', () => {
    expect(offlineCapSec(1)).toBe(16_704)
  })
  it('만렙 25단계는 +400% = 20시간', () => {
    expect(offlineCapSec(25)).toBe(72_000)
  })
  it('범위 밖 입력은 0~25 로 잘린다', () => {
    expect(offlineCapSec(-3)).toBe(14_400)
    expect(offlineCapSec(99)).toBe(72_000)
  })
})
