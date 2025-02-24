'use client'

import { useCallback, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useAppKit } from '@/context'

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const appKit = useAppKit()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const login = useCallback(async () => {
    try {
      console.log('Starting login process...')
      setIsAuthenticating(true)
      
      console.log('Opening Reown AppKit modal...')
      await appKit.open()
      console.log('Modal opened')

    } catch (err) {
      console.error('Login process failed:', err)
      throw err
    } finally {
      setIsAuthenticating(false)
    }
  }, [appKit])

  const logout = useCallback(async () => {
    try {
      console.log('Logging out...')
      await disconnectAsync()
      console.log('Logout successful')
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
      window.location.reload()
    } catch (err) {
      console.error('Logout failed:', err)
      throw err
    }
  }, [disconnectAsync])

  return {
    ready: true,
    isAuthenticated: isConnected,
    hasWallet: isConnected,
    user: address ? { id: address } : null,
    login,
    logout,
    isLoading: isAuthenticating
  }
} 