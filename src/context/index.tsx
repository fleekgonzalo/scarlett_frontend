'use client'

import { wagmiAdapter, projectId } from '@/config/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { mainnet } from '@reown/appkit/networks'
import React, { type ReactNode, useEffect, createContext, useContext } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

console.log('Initializing Reown AppKit with project ID:', projectId)

// Set up metadata
const metadata = {
  name: 'Scarlett',
  description: 'Learn Language Through Music',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['https://scarlett.learn/icon.png']
}

// Create the modal
const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet],
  defaultNetwork: mainnet,
  metadata: metadata,
  features: {
    analytics: false,
    // Enable all auth methods
    email: true,
    socials: ['google', 'discord', 'github'],
    emailShowWallets: true
  }
})

console.log('Reown AppKit initialized')

// Create context for AppKit
const AppKitContext = createContext<typeof appKit | null>(null)

// Hook to use AppKit
export const useAppKit = () => {
  const context = useContext(AppKitContext)
  if (!context) {
    throw new Error('useAppKit must be used within an AppKitProvider')
  }
  return context
}

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('ContextProvider mounted, checking for Reown AppKit elements...')
      const customElements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.tagName.includes('-'))
      console.log('Custom elements found:', customElements.map(el => el.tagName))
    }
  }, [])

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <AppKitContext.Provider value={appKit}>
          {/* Hidden Reown AppKit button for initialization */}
          {/* @ts-expect-error - Web component */}
          <appkit-button style={{ display: 'none' }} id="hidden-appkit-button" />
          {children}
        </AppKitContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 