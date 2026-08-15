import './ui.css'
import type { Rarity, Branch } from '../../game/types'

export type GameIconSpec =
  | { kind: 'egg'; rarity: Rarity }
  | { kind: 'forge' }
  | { kind: 'tree'; branch: Branch }

interface Props {
  icon: GameIconSpec
  alt: string
  size?: 'sm' | 'md'
}

const BASE = `${import.meta.env.BASE_URL}icons/`.replace(/\/+/g, '/')

function resolve(icon: GameIconSpec): { src: string; src2x: string; color: string } {
  if (icon.kind === 'egg') {
    return {
      src: `${BASE}egg-${icon.rarity}.jpg`,
      src2x: `${BASE}egg-${icon.rarity}@2x.jpg`,
      color: `var(--rarity-${icon.rarity})`,
    }
  }
  if (icon.kind === 'forge') {
    return { src: `${BASE}forge.jpg`, src2x: `${BASE}forge@2x.jpg`, color: 'var(--branch-forge)' }
  }
  return {
    src: `${BASE}tree-${icon.branch}.jpg`,
    src2x: `${BASE}tree-${icon.branch}@2x.jpg`,
    color: `var(--branch-${icon.branch})`,
  }
}

/** 게임 아트(밝은 배경의 JPG)를 다크 테마에서도 자연스럽게 보이도록 밝은 타일 안에 담는다. */
export function GameIcon({ icon, alt, size = 'md' }: Props) {
  const { src, src2x, color } = resolve(icon)
  return (
    <span className={`ui-game-icon ui-game-icon--${size}`} style={{ borderColor: color }}>
      <img src={src} srcSet={`${src2x} 2x`} alt={alt} />
    </span>
  )
}
