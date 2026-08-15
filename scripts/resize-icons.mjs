// public/icons/*.jpg 원본(게임 스크린샷에서 크롭한 아이콘, 수백 KB)을
// 96x96(기본) + 192x192(@2x) JPEG 로 다운스케일해 그 자리에 덮어쓴다.
// 사용법: node scripts/resize-icons.mjs
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const DIR = join(import.meta.dirname, '..', 'public', 'icons')
const SIZES = [
  { size: 96, suffix: '' },
  { size: 192, suffix: '@2x' },
]

async function run() {
  const files = (await readdir(DIR)).filter(f => f.endsWith('.jpg') && !f.includes('@2x'))
  let before = 0
  let after = 0

  for (const file of files) {
    const path = join(DIR, file)
    const base = file.replace(/\.jpg$/, '')
    before += (await stat(path)).size

    const original = await sharp(path).rotate().toBuffer()

    for (const { size, suffix } of SIZES) {
      const outPath = join(DIR, `${base}${suffix}.jpg`)
      await sharp(original)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(outPath + '.tmp')
      const { renameSync } = await import('node:fs')
      renameSync(outPath + '.tmp', outPath)
      after += (await stat(outPath)).size
    }
  }

  console.log(`원본 파일 ${files.length}개, 이전 총합 ${(before / 1024).toFixed(0)}KB`)
  console.log(`이후(96px + @2x 192px 포함) 총합 ${(after / 1024).toFixed(0)}KB`)
}

run().catch(e => { console.error(e); process.exit(1) })
