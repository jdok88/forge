/** 인앱 브라우저(웹뷰)는 Web Push 를 지원하지 않는다. UA 로만 판별 가능하다. */
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent
  return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|wadiz|kakaostory/i.test(ua)
}

/** 감지된 인앱 브라우저의 한글 이름. 식별 불가하면 null. */
export function inAppBrowserName(): string | null {
  const ua = navigator.userAgent
  if (/KAKAOTALK/i.test(ua)) return '카카오톡'
  if (/NAVER\(inapp/i.test(ua)) return '네이버'
  if (/Instagram/i.test(ua)) return '인스타그램'
  if (/FBAN|FBAV/i.test(ua)) return '페이스북'
  if (/Line\//i.test(ua)) return '라인'
  if (/DaumApps/i.test(ua)) return '다음'
  return null
}

export const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ 는 기본으로 데스크톱 UA(Macintosh)를 보고한다.
  // 터치 포인트 수로 실제 아이패드를 구분한다.
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export const isAndroid = () => /Android/i.test(navigator.userAgent)
