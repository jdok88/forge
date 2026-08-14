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
