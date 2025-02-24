'use client'

import { Thread } from '@/components/assistant-ui/thread'
import { useXmtp } from '@/hooks/useXmtp'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function ChatPage() {
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, error: xmtpError, sendMessage } = useXmtp()
  const { isAuthenticated, login } = useAuth()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])

  const handleSendMessage = async (message: string) => {
    if (!isAuthenticated) {
      login()
      return
    }

    if (!isXmtpInitialized) {
      console.log('XMTP not initialized')
      return
    }

    try {
      setMessages(prev => [...prev, { role: 'user', content: message }])
      
      // Send message using XMTP
      const response = await sendMessage(message)
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to send message. Please try again.' }])
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Thread
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isXmtpLoading}
            error={xmtpError ? String(xmtpError) : undefined}
          />
        </div>
      </div>
    </div>
  )
} 