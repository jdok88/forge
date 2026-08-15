import type { CapacitorConfig } from '@capacitor/cli'

// 웹 자산을 앱에 번들한다(server.url 미설정) — 오프라인에서도 카운트다운이 동작해야 하므로
// 라이브 사이트를 그대로 로드하지 않는다. 대신 앱 업데이트는 새 APK 배포가 필요하다.
const config: CapacitorConfig = {
  appId: 'dev.pages.forgealarm',
  appName: 'Forge 알람',
  webDir: 'dist',
}

export default config
