import { copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(import.meta.dirname, '..', 'dist')

// GitHub Pages는 존재하지 않는 경로에 404.html을 서빙한다.
// index.html을 복사해두면 SPA가 부팅되어 React Router가 URL을 읽는다.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))

// Jekyll이 _로 시작하는 파일/폴더를 무시하는 것을 막는다.
writeFileSync(join(dist, '.nojekyll'), '')
