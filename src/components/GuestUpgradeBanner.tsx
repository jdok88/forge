import { useIsAnonymous } from '../hooks/useIsAnonymous'
import { Card } from './ui/Card'
import { GuestUpgradeForm } from './GuestUpgradeForm'

export function GuestUpgradeBanner() {
  const { anonymous, loading } = useIsAnonymous()

  if (loading || !anonymous) return null

  return (
    <Card style={{ marginBottom: 'var(--sp-3)' }}>
      <GuestUpgradeForm />
    </Card>
  )
}
