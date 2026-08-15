# 복구 안내

다른 PC에서 이어서 작업하거나, 오랜만에 돌아왔을 때 읽는 문서.

## 지금 이 앱은 살아 있다

| 항목 | 값 |
|---|---|
| 서비스 | https://forgealarm.pages.dev |
| 소스 | https://github.com/jdok88/forge (`main`, Public) |
| 호스팅 | Cloudflare Pages — `main` 에 푸시하면 자동 빌드·배포 (1~2분) |
| DB·인증·푸시 | Supabase 프로젝트 `khzliuwullyvfhfdeuvu` (무료 티어, ap-southeast-1) |

푸시 알림은 안드로이드 크롬에서 **앱 종료 상태 수신까지 실증 완료**. iOS 는 기기가 없어 미검증.

## 저장소에 없는 것 — 반드시 따로 챙겨야 함

`.gitignore` 로 제외되어 있어 클론만으로는 앱이 뜨지 않는다. 이 파일들을 새 PC 로 직접 옮길 것.

```
.env                    VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_VAPID_PUBLIC_KEY
.env.vapid-private      VAPID_PRIVATE_KEY  (Supabase 시크릿으로만 사용)
.env.supabase-token     SUPABASE_ACCESS_TOKEN (CLI 인증용)
image/                  게임 스크린샷·데이터 시트 원본 (48MB, 사용자 별도 보유)
```

잃어버렸을 때:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Supabase 대시보드 Settings → API
- `SUPABASE_ACCESS_TOKEN` → https://supabase.com/dashboard/account/tokens 에서 새로 발급
- **VAPID 키쌍은 재발급하면 기존 구독이 전부 무효화된다.** 모든 사용자가 알림을 다시 켜야 하므로 최후의 수단.
  재발급: `npx web-push generate-vapid-keys` → 공개키는 `.env` 와 Cloudflare 환경변수, 개인키는 `npx supabase secrets set VAPID_PRIVATE_KEY=...`

## 로컬 개발 시작

```bash
npm install
# .env 를 위 목록대로 채운 뒤
npm run dev          # http://localhost:5173
npm test             # 게임 계산 로직 테스트
```

Docker 는 설치돼 있지 않고 필요도 없다. Supabase 는 원격 프로젝트를 직접 쓴다.

## 배포

```bash
git push origin main     # 이게 전부. Cloudflare 가 자동 빌드
```

Edge Function 이나 DB 스키마를 바꿨다면 추가로:

```bash
export SUPABASE_ACCESS_TOKEN=$(grep -oP 'SUPABASE_ACCESS_TOKEN=\K.*' .env.supabase-token)
npx supabase db push                                    # 마이그레이션 적용
npx supabase functions deploy dispatch-push --no-verify-jwt   # 푸시 발송 함수
```

**Edge Function 은 코드를 고쳐도 자동 배포되지 않는다.** 알림 내용이 옛날 그대로면 이걸 안 한 것이다 — 실제로 한 번 겪었다.

## 상태 점검 명령

```bash
TOKEN=$(grep -oP 'SUPABASE_ACCESS_TOKEN=\K.*' .env.supabase-token)
Q() { curl -s -X POST "https://api.supabase.com/v1/projects/khzliuwullyvfhfdeuvu/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"query\":\"$1\"}"; }

# 사용자·데이터 현황
Q "select (select count(*) from auth.users) users, (select count(*) from push_subscriptions) subs, (select count(*) from servers) servers, (select count(*) from timers) timers;"

# 크론이 도는지 (10초 주기)
Q "select status, count(*) from cron.job_run_details group by status;"

# 푸시 발송 함수 직접 호출
curl -s -X POST "https://khzliuwullyvfhfdeuvu.supabase.co/functions/v1/dispatch-push" -H "Content-Type: application/json" -d '{}'
```

**알림이 안 온다는 신고가 오면 `push_subscriptions` 부터 본다.** 0 이면 발송 문제가 아니라 구독 등록 문제다 — 이걸로 여러 번 헛다리를 짚었다.

## 구조 요약

```
사용자 브라우저 (PWA)
  └ Supabase Postgres (RLS 로 사용자별 격리)
       └ pg_cron 10초마다 → Edge Function dispatch-push
            └ Web Push (VAPID) → FCM/APNs → 기기 알림 창
```

- 게임 상수·계산식은 DB 가 아니라 `src/game/` 에 하드코딩. 오프라인에서도 계산되고 테스트로 고정돼 있다.
- 시간 = `기본초 ÷ (1 + 속도%)`, 비용 = `기본값 × (1 - 할인%)`. **혼동하면 전부 틀린다.**
- 알림 지연은 크론 주기가 상한 = 최대 10초.

## 안드로이드 서명 키 — 가장 잃으면 안 되는 것

`.keystore/forge.p12` 와 `.keystore/credentials.txt` (둘 다 git 제외).
GitHub Secrets 에도 `ANDROID_KEYSTORE_B64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` 로 올라가 있다.

**이 키를 잃으면 같은 서명으로 앱을 업데이트할 수 없다.** 새 키로 빌드한 APK 는 안드로이드가
다른 앱으로 취급해서, 기존 사용자가 앱을 지우고 다시 깔아야 하며 그 과정에서 로컬 알림 예약도
사라진다. Play 스토어에 올린 뒤라면 아예 업데이트가 불가능해진다.

`.keystore/` 폴더를 이 PC 밖에도 복사해 둘 것. GitHub Secrets 는 값을 다시 읽을 수 없으므로
백업이 아니다.

## APK 배포

- 다운로드(로그인 불필요, 영구): https://github.com/jdok88/forge/releases/latest/download/app-release.apk
- 안내 페이지: https://github.com/jdok88/forge/releases/tag/latest
- `main` 에 푸시하면 GitHub Actions 가 릴리스 서명 APK 를 빌드해 위 주소를 갱신한다.

사이드로드라 Play Protect 가 설치를 **차단**하는 기기가 많다. 한국은 Play Protect 가 스토어
밖 앱을 경고가 아니라 차단하는 대상 국가다. 릴리스 서명으로 바꿔도 차단은 남는다 —
서명 문제가 아니라 "알려지지 않은 개발자" 정책이기 때문이다.

**사용자에게 Play Protect 를 끄라고 안내하지 않는다.** 보안 기능을 끄게 만든 뒤 그 사용자가
무관한 악성 앱에 당하면 책임 소재가 우리에게 걸린다. 앱 안팎의 모든 문구는 "설치가 막히면
웹을 쓰라"로 통일돼 있다. 이 원칙을 바꾸지 말 것.

차단을 실제로 없애려면 Play 스토어 등록($25 1회) 뿐이다. 웹 버전이 기능상 완결되어 있으므로
사용자가 늘고 "알림이 늦다" 는 피드백이 실제로 나오기 전까지는 급하지 않다.

## 문서

- 설계: `docs/superpowers/specs/2026-08-14-forge-master-alarm-design.md`
- 구현 계획: `docs/superpowers/plans/2026-08-14-forge-master-alarm.md`
- 게임 데이터 정본: `docs/reference/tech-nodes.md`
- 작업 원장(판정 기록): `.superpowers/sdd/2026-08-14-forge-master-alarm/progress.md` — **git 제외이므로 이 PC 에만 있다**

## 알려진 미해결

- **iOS 전 경로 미검증.** Safari 로 열어 홈 화면에 추가해야만 푸시가 온다. 기기가 없어 배포 후 사용자 피드백 대기 중.
- 무료 Supabase 는 7일간 요청이 없으면 프로젝트가 일시정지된다. 매일 쓰는 앱이라 실질 위험은 낮지만, 정지되면 대시보드에서 클릭 한 번으로 복구.
- 채팅으로 주고받은 Supabase 액세스 토큰은 폐기 권장. 앱은 anon key 만 쓰므로 폐기해도 동작에 영향 없다.
