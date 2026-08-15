import type { ButtonHTMLAttributes } from 'react'
import './ui.css'

type Variant = 'primary' | 'default' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'default', size = 'md', className, type = 'button', ...rest }: Props) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    size === 'sm' ? 'ui-btn--sm' : '',
    className,
  ].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
