'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoginSelector } from './LoginSelector'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm w-full mx-4">
          <h2 className="text-2xl font-bold mb-4">Sign in to Continue</h2>
          <p className="text-gray-400 mb-6">
            Please sign in to access the questions and track your progress.
          </p>
          <LoginSelector />
        </div>
      </div>
    )
  }

  return children
} 