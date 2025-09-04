import { hasActivePro } from '@/lib/subscriptions'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  const isPro = await hasActivePro()
  return <PricingClient isPro={isPro} />
}

