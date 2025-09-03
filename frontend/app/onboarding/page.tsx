'use client'

import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <OnboardingWizard />
      </div>
    </div>
  )
}

