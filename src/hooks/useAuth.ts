'use client'

import { usePrivy } from '@privy-io/react-auth'

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    createWallet,
    sendTransaction,
  } = usePrivy()

  return {
    isReady: ready,
    isAuthenticated: authenticated,
    user,
    login,
    logout,
    createWallet,
    sendTransaction,
  }
} 