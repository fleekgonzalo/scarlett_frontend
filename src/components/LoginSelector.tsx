'use client'

import { Button } from './ui/button'
import { useAuth } from '@/hooks/useAuth'

export function LoginSelector() {
  const { isAuthenticated, isReady, user, login, logout } = useAuth()

  if (!isReady) {
    return (
      <Button disabled className="w-full">
        Loading...
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <Button
          onClick={login}
          className="w-full"
        >
          Sign in with Email
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">
            Connected: {user?.email?.address}
          </div>
          <Button
            onClick={logout}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      )}
    </div>
  )
} 