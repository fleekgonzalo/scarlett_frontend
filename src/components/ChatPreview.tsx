'use client'

import { useXmtp } from '@/hooks/useXmtp'
import { Expand, SendHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from './ui/button'
import { Loading } from './ui/loading'

export function ChatPreview() {
  const { messages, sendMessage, isLoading, isInitialized } = useXmtp()
  const { locale = 'en' } = useParams()
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const recentMessages = messages.slice(-3)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    try {
      setIsSending(true)
      await sendMessage(inputValue.trim())
      setInputValue('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="relative flex flex-col gap-4 p-6 rounded-lg bg-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Recent Chat</h2>
        <Link 
          href={`/${locale}/chat`}
          className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
        >
          <Expand className="w-5 h-5 text-white" />
        </Link>
      </div>

      {/* Messages */}
      <div className="space-y-4 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center space-y-4">
              <Loading size={32} color="#3B82F6" />
              <p className="text-neutral-400">Loading messages...</p>
            </div>
          </div>
        ) : recentMessages.length > 0 ? (
          recentMessages.map((message, i) => (
            <div 
              key={i}
              className={`flex flex-col gap-1 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-sm text-neutral-400 capitalize">
                {message.role}
              </span>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white ml-auto' 
                  : 'bg-neutral-700 text-white'
              }`}>
                {message.content}
              </div>
            </div>
          ))
        ) : isInitialized ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-neutral-400">
              No messages yet. Start chatting to learn!
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center space-y-4">
              <Loading size={32} color="#3B82F6" />
              <p className="text-neutral-400">Initializing chat...</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={locale === 'en' ? 'Ask me anything...' : '问我任何问题...'}
          className="flex-1 bg-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button 
          type="submit"
          size="icon"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSending}
        >
          {isSending ? (
            <Loading size={20} color="#ffffff" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  )
} 