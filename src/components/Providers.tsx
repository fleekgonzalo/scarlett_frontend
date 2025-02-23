'use client'

import { usePathname } from 'next/navigation'
import { RootTemplate } from './RootTemplate'
import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet } from 'viem/chains'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'wagmi'

const queryClient = new QueryClient()

// Configure wagmi with Privy
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

export function Providers({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Don't show header/footer on song pages
  const isBasicLayout = pathname.includes('/songs/')

  const content = isBasicLayout ? children : (
    <RootTemplate>
      {children}
    </RootTemplate>
  )

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'dark',
          accentColor: '#3B82F6', // blue-500
          showWalletLoginFirst: false
        },
        defaultChain: mainnet,
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        },
        supportedChains: [mainnet]
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {content}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
} 