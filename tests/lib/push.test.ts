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
