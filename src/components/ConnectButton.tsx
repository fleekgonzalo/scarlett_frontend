'use client'

import { useAccount } from 'wagmi'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useAppKit } from '@/context'

export default function ConnectButton() {
  const { isConnected } = useAccount()
  const { logout } = useAuth()
  const appKit = useAppKit()

  useEffect(() => {
    console.log('ConnectButton mounted, isConnected:', isConnected)
  }, [isConnected])

  if (isConnected) {
    console.log('Rendering disconnect button')
    return (
      <button
        onClick={logout}
        className="px-4 py-2 font-semibold text-sm bg-blue-500 text-white rounded-lg shadow-sm"
      >
        Disconnect
      </button>
    )
  }

  console.log('Rendering connect button')
  return (
    <button
      onClick={() => appKit.open()}
      className="px-4 py-2 font-semibold text-sm bg-blue-500 text-white rounded-lg shadow-sm"
    >
      Connect
    </button>
  )
} 