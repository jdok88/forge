import './ui.css'

interface Props {
  message: string
}

export function EmptyState({ message }: Props) {
  return <div className="ui-empty-state">{message}</div>
}
