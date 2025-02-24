'use client'

import { useState, useEffect } from 'react'
import { Client, type Signer } from '@xmtp/browser-sdk'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSignMessage } from 'wagmi'

const TUTOR_BOT_ADDRESS = '0x39ba6e2959cBBcbd5D18D02777ddD2E59aA7E8B7'
const ENCODING = 'binary'

// Helper functions for key storage
const buildLocalStorageKey = (walletAddress: string) => 
  walletAddress ? `xmtp:dev:keys:${walletAddress}` : ''

const loadKeys = (walletAddress: string): Uint8Array | null => {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(buildLocalStorageKey(walletAddress))
  return val ? Buffer.from(val, ENCODING) : null
}

const storeKeys = (walletAddress: string, keys: Uint8Array) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    buildLocalStorageKey(walletAddress),
    Buffer.from(keys).toString(ENCODING)
  )
}

interface QuestionAnswer {
  uuid: string
  selectedAnswer: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useXmtp() {
  const { ready: privyReady, authenticated, user } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { signMessageAsync } = useSignMessage()
  
  const [client, setClient] = useState<Client | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  // Load message history when client is initialized
  const loadMessageHistory = async (xmtp: Client) => {
    try {
      console.log('Loading message history...')
      const conversation = await xmtp.conversations.newDm(TUTOR_BOT_ADDRESS)
      const history = await conversation.messages()
      
      // Convert XMTP messages to our format with proper typing
      const formattedMessages = history
        .filter(msg => {
          // Filter out system messages that have these properties
          const isSystemMessage = typeof msg.content === 'object' && 
            'initiatedByInboxId' in msg.content &&
            'addedInboxes' in msg.content &&
            'removedInboxes' in msg.content &&
            'metadataFieldChanges' in msg.content
          return !isSystemMessage
        })
        .map(msg => ({
          role: msg.senderInboxId === xmtp.inboxId ? 'user' as const : 'assistant' as const,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }))

      console.log('Loaded messages:', formattedMessages)
      setMessages(formattedMessages)
    } catch (err) {
      console.error('Failed to load message history:', err)
      setError('Failed to load message history')
    }
  }

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initXmtp = async () => {
      // Skip if already initialized or initializing
      if (hasInitialized || isInitializing || client) {
        return
      }

      // Skip if not ready
      if (!privyReady || !authenticated) {
        return
      }

      // Skip if no wallets
      if (!walletsReady || wallets.length === 0) {
        return
      }

      try {
        setIsInitializing(true)
        setError(null)

        // Find any available wallet with an address
        const availableWallet = wallets.find(w => w.address)
        
        if (!availableWallet?.address) {
          throw new Error('No wallet available with an address')
        }

        // Get the provider from the wallet
        const provider = await availableWallet.getEthereumProvider()
        
        // Create a signer interface that uses the provider
        const signer: Signer = {
          getAddress: () => availableWallet.address,
          signMessage: async (message: string | Uint8Array) => {
            const messageStr = message instanceof Uint8Array 
              ? new TextDecoder().decode(message)
              : message
            
            const signature = await provider.request({
              method: 'personal_sign',
              params: [messageStr, availableWallet.address]
            })
            
            // Convert signature to bytes
            const hexString = signature.replace('0x', '')
            const bytes = new Uint8Array(hexString.length / 2)
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16)
            }
            return bytes
          }
        }
        
        // Create XMTP client
        const xmtp = await Client.create(
          signer,
          window.crypto.getRandomValues(new Uint8Array(32)),
          { env: 'dev' }
        )

        setClient(xmtp)
        setHasInitialized(true)

        // Load message history
        await loadMessageHistory(xmtp)

        // Initialize a test conversation
        try {
          await xmtp.conversations.newDm(TUTOR_BOT_ADDRESS)
        } catch (convErr) {
          console.error('Failed to create conversation:', convErr)
        }
      } catch (err) {
        console.error('Failed to initialize XMTP:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize messaging')
        setClient(null)
      } finally {
        setIsInitializing(false)
      }
    }

    initXmtp()
  }, [privyReady, walletsReady, authenticated, wallets, hasInitialized, isInitializing, client])

  // Function to send answer to tutor bot
  const sendAnswer = async (questionAnswer: QuestionAnswer) => {
    if (!client) {
      console.error('Cannot send answer: XMTP client not initialized')
      throw new Error('XMTP client not initialized')
    }

    try {
      console.log('Creating conversation with tutor bot...')
      // Create or load conversation
      const conversation = await client.conversations.newDm(TUTOR_BOT_ADDRESS)
      console.log('Conversation created/loaded')

      // Send the answer as JSON
      const message = JSON.stringify(questionAnswer)
      console.log('Sending message to tutor:', message)
      await conversation.send(message)
      console.log('Message sent successfully')

      // Add message to local state
      setMessages(prev => [...prev, { role: 'user', content: message }])

      // Wait for bot response (with timeout)
      let botResponse: { isCorrect: boolean; explanation: string } | null = null
      const startTime = Date.now()
      const timeout = 30000 // Increase timeout to 30 seconds

      console.log('Waiting for bot response...')
      while (!botResponse && Date.now() - startTime < timeout) {
        // Get latest messages
        const messages = await conversation.messages()
        console.log('All messages:', messages.map(m => ({
          content: m.content,
          sender: m.senderInboxId,
          id: m.id
        })))

        // Look for a response from the tutor bot
        for (const msg of messages) {
          // Skip our own messages and system messages
          if (msg.senderInboxId === client.inboxId || 
              (typeof msg.content === 'object' && 
               'initiatedByInboxId' in msg.content &&
               'addedInboxes' in msg.content)) {
            console.log('Skipping message:', msg.content)
            continue
          }

          try {
            console.log('Checking message:', {
              content: msg.content,
              sender: msg.senderInboxId
            })

            const response = JSON.parse(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
            if (response.uuid === questionAnswer.uuid) {
              console.log('Found matching response:', response)
              botResponse = response
              // Add bot response to local state
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              }])
              break
            } else {
              console.log('UUID mismatch:', {
                expected: questionAnswer.uuid,
                received: response.uuid
              })
            }
          } catch (e) {
            console.log('Not a valid JSON response:', msg.content)
            continue
          }
        }

        if (!botResponse) {
          // Wait a bit before checking again
          console.log('No matching response found, waiting...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      if (!botResponse) {
        console.error('No response received within timeout')
        throw new Error('No response received from tutor')
      }

      return {
        isCorrect: botResponse.isCorrect,
        explanation: botResponse.explanation || 'No explanation provided'
      }
    } catch (err) {
      console.error('Failed to send answer:', err)
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          cause: err.cause
        })
      }
      setError('Failed to send answer to tutor')
      throw err
    }
  }

  // Function to send a general message
  const sendMessage = async (message: string): Promise<string> => {
    if (!client) {
      console.error('Cannot send message: XMTP client not initialized')
      throw new Error('XMTP client not initialized')
    }

    try {
      console.log('Creating conversation with tutor bot...')
      const conversation = await client.conversations.newDm(TUTOR_BOT_ADDRESS)
      console.log('Conversation created/loaded')

      // Send the message
      console.log('Sending message:', message)
      await conversation.send(message)
      console.log('Message sent successfully')

      // Add message to local state
      setMessages(prev => [...prev, { role: 'user', content: message }])

      // Wait for bot response (with timeout)
      let botResponse: string | null = null
      const startTime = Date.now()
      const timeout = 30000 // 30 seconds timeout

      console.log('Waiting for bot response...')
      while (!botResponse && Date.now() - startTime < timeout) {
        // Get latest messages
        const messages = await conversation.messages()
        console.log('All messages:', messages.map(m => ({
          content: m.content,
          sender: m.senderInboxId,
          id: m.id
        })))

        // Look for a response from the tutor bot
        for (const msg of messages) {
          // Skip our own messages and system messages
          if (msg.senderInboxId === client.inboxId || 
              (typeof msg.content === 'object' && 
               'initiatedByInboxId' in msg.content &&
               'addedInboxes' in msg.content)) {
            console.log('Skipping message:', msg.content)
            continue
          }

          // Return the first message from the bot that isn't our own
          const messageContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          botResponse = messageContent
          // Add bot response to local state
          setMessages(prev => [...prev, { role: 'assistant', content: messageContent }])
          break
        }

        if (!botResponse) {
          // Wait a bit before checking again
          console.log('No response found, waiting...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      if (!botResponse) {
        console.error('No response received within timeout')
        throw new Error('No response received from tutor')
      }

      return botResponse
    } catch (err) {
      console.error('Failed to send message:', err)
      throw err
    }
  }

  return {
    isInitialized: !!client,
    isLoading: isInitializing || (!hasInitialized && (privyReady && authenticated && walletsReady && wallets.length > 0)),
    error,
    messages,
    sendAnswer,
    sendMessage
  }
} 