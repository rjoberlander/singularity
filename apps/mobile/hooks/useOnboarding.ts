import { useState, useEffect } from 'react'
import { UserManagementApi } from '../services/userManagementApi'
import { useAuth } from '../contexts/AuthContext'

interface OnboardingStatus {
  onboarding_completed: boolean
  onboarding_step: string
  has_profile_picture: boolean
  has_name: boolean
}

export function useOnboarding() {
  const { user, session } = useAuth()
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && session) {
      checkOnboardingStatus()
    }
  }, [user, session])

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true)
      const response = await UserManagementApi.getOnboardingStatus()
      const status: OnboardingStatus = response.data

      setOnboardingStatus(status)
      setNeedsOnboarding(!status.onboarding_completed)
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
      // If we can't check, assume onboarding is complete to avoid blocking users
      setNeedsOnboarding(false)
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = () => {
    setNeedsOnboarding(false)
    setOnboardingStatus(prev => prev ? { ...prev, onboarding_completed: true } : null)
  }

  return {
    needsOnboarding,
    onboardingStatus,
    loading,
    completeOnboarding,
    checkOnboardingStatus
  }
}