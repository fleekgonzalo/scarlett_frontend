'use client'

import { usePrivy, useWallets, type User } from '@privy-io/react-auth'
import { useCallback } from 'react'

export function useAuth() {
  const { ready, authenticated, user, login: privyLogin, createWallet } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()

  const login = useCallback(async () => {
    try {
      // First, handle the login
      await privyLogin()
      
      // Wait for wallets to be ready
      if (!walletsReady) {
        console.log('Waiting for wallets to be ready...')
        return
      }

      // If user has no wallet after login, create one
      if (authenticated && wallets.length === 0) {
        console.log('Creating embedded wallet for user...')
        try {
          const wallet = await createWallet()
          console.log('Wallet created:', wallet)
        } catch (err) {
          console.error('Failed to create wallet:', err)
        }
      }
    } catch (err) {
      console.error('Failed to login:', err)
    }
  }, [privyLogin, authenticated, walletsReady, wallets.length, createWallet])

  return {
    ready: ready && walletsReady,
    isAuthenticated: authenticated,
    hasWallet: wallets.length > 0,
    user,
    login,
    isLoading: !ready || !walletsReady
  }
} 