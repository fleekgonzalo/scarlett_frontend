'use client'

import { useState, useEffect } from 'react'
import { Client } from '@xmtp/xmtp-js'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { type Hex } from 'viem'
import { useAccount, useSignMessage } from 'wagmi'

const TUTOR_BOT_ADDRESS = '0xB0dD2a6FAB0180C8b2fc4f144273Cc693d7896Ed'

interface QuestionAnswer {
  uuid: string
  selectedAnswer: string
}

export function useXmtp() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  
  const [client, setClient] = useState<Client | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initXmtp = async () => {
      if (!ready || !authenticated || isInitializing || client || !address) return

      try {
        setIsInitializing(true)
        setError(null)

        // Create a signer interface that uses Wagmi's signMessage
        const signer = {
          getAddress: async () => address as Hex,
          signMessage: async (message: Uint8Array | string) => {
            // Convert message to string if it's a Uint8Array
            const messageStr = message instanceof Uint8Array 
              ? new TextDecoder().decode(message)
              : message

            // Use Wagmi's signMessage
            const signature = await signMessageAsync({ message: messageStr })
            return signature as Hex
          }
        }

        // Request XMTP signature
        const xmtp = await Client.create(signer, { env: 'production' })
        setClient(xmtp)

        // Check if we can message the tutor bot
        const canMessage = await xmtp.canMessage(TUTOR_BOT_ADDRESS)
        if (!canMessage) {
          throw new Error('Cannot message tutor bot')
        }
      } catch (err) {
        console.error('Failed to initialize XMTP:', err)
        setError('Failed to initialize messaging')
        setClient(null)
      } finally {
        setIsInitializing(false)
      }
    }

    initXmtp()
  }, [ready, authenticated, address, signMessageAsync])

  // Function to send answer to tutor bot
  const sendAnswer = async (questionAnswer: QuestionAnswer) => {
    if (!client) {
      throw new Error('XMTP client not initialized')
    }

    try {
      // Create or load conversation
      const conversation = await client.conversations.newConversation(TUTOR_BOT_ADDRESS)

      // Send the answer as JSON
      await conversation.send(JSON.stringify(questionAnswer))

      // Wait for bot response (with timeout)
      let botResponse = null
      const startTime = Date.now()
      const timeout = 10000 // 10 seconds timeout

      while (!botResponse && Date.now() - startTime < timeout) {
        // Get latest messages
        const messages = await conversation.messages()
        const latestMessage = messages[messages.length - 1]

        // Check if we have a response after our message
        if (latestMessage && latestMessage.content) {
          try {
            const response = JSON.parse(latestMessage.content)
            if (response.uuid === questionAnswer.uuid) {
              botResponse = response
              break
            }
          } catch (e) {
            // Not JSON or not the response we're looking for
            continue
          }
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (!botResponse) {
        throw new Error('No response received from tutor')
      }

      return {
        isCorrect: botResponse.isCorrect,
        explanation: botResponse.explanation
      }
    } catch (err) {
      console.error('Failed to send answer:', err)
      setError('Failed to send answer to tutor')
      throw err
    }
  }

  return {
    isInitialized: !!client,
    isLoading: isInitializing,
    error,
    sendAnswer
  }
} 