import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }
  const { data } = await (supabase as any)
    .from('onboarding_responses')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (data) {
    redirect('/')
  }
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="w-full max-w-3xl px-4 py-10">
        <OnboardingWizard />
      </div>
    </div>
  )
}
