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

export function useXmtp() {
  const { ready: privyReady, authenticated, user } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { signMessageAsync } = useSignMessage()
  
  const [client, setClient] = useState<Client | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initXmtp = async () => {
      // Log all available wallets and their details
      console.log('Available wallets:', wallets.map(w => ({
        type: w.walletClientType,
        address: w.address,
        chainId: w.chainId
      })))

      console.log('XMTP Init State:', {
        privyReady,
        walletsReady,
        authenticated,
        isInitializing,
        hasClient: !!client,
        walletsCount: wallets.length,
        userId: user?.id,
        userWallets: user?.linkedAccounts
      })

      if (!privyReady || !walletsReady || !authenticated || isInitializing || client) {
        console.log('XMTP Init Skipped:', {
          notPrivyReady: !privyReady,
          notWalletsReady: !walletsReady,
          notAuthenticated: !authenticated,
          isInitializing,
          hasExistingClient: !!client
        })
        return
      }

      try {
        setIsInitializing(true)
        setError(null)

        // Find any available wallet with an address
        const availableWallet = wallets.find(w => w.address)
        
        if (!availableWallet?.address) {
          console.log('No wallet found with address. Wallet details:', {
            wallets: wallets.map(w => ({
              type: w.walletClientType,
              address: w.address
            })),
            userLinkedAccounts: user?.linkedAccounts
          })
          throw new Error('No wallet available with an address')
        }

        console.log('Creating XMTP signer with wallet:', {
          type: availableWallet.walletClientType,
          address: availableWallet.address,
          chainId: availableWallet.chainId
        })

        // Get the provider from the wallet
        const provider = await availableWallet.getEthereumProvider()
        console.log('Got Ethereum provider')
        
        // Create a signer interface that uses the provider
        const signer: Signer = {
          getAddress: () => availableWallet.address,
          signMessage: async (message: string | Uint8Array) => {
            const messageStr = message instanceof Uint8Array 
              ? new TextDecoder().decode(message)
              : message

            console.log('Signing XMTP message:', {
              message: messageStr,
              address: availableWallet.address
            })
            
            try {
              // Use the provider to sign the message
              const signature = await provider.request({
                method: 'personal_sign',
                params: [messageStr, availableWallet.address]
              })
              console.log('Got signature:', signature)
              
              // Convert signature to bytes
              const hexString = signature.replace('0x', '')
              const bytes = new Uint8Array(hexString.length / 2)
              for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16)
              }
              return bytes
            } catch (signError) {
              console.error('Error signing message:', signError)
              throw signError
            }
          }
        }
        
        // Create XMTP client
        console.log('Creating XMTP client...')
        const xmtp = await Client.create(
          signer,
          window.crypto.getRandomValues(new Uint8Array(32)),
          { env: 'dev' }
        )

        console.log('XMTP client created successfully')
        setClient(xmtp)

        // Initialize a test conversation without checking canMessage
        try {
          console.log('Creating test conversation...')
          const conversation = await xmtp.conversations.newDm(TUTOR_BOT_ADDRESS)
          console.log('Conversation created successfully')
        } catch (convErr) {
          console.error('Failed to create conversation:', convErr)
          // Don't throw here - just log the error
          // The conversation may still work even if initial creation fails
        }
      } catch (err) {
        console.error('Failed to initialize XMTP:', err)
        if (err instanceof Error) {
          console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            cause: err.cause
          })
        }
        setError('Failed to initialize messaging')
        setClient(null)
      } finally {
        setIsInitializing(false)
      }
    }

    initXmtp()
  }, [privyReady, walletsReady, authenticated, wallets, user?.id])

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

      // Wait for bot response (with timeout)
      let botResponse = null
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
          // Skip our own messages
          if (msg.senderInboxId === client.inboxId) {
            console.log('Skipping own message:', msg.content)
            continue
          }

          try {
            console.log('Checking message:', {
              content: msg.content,
              sender: msg.senderInboxId
            })

            const response = JSON.parse(msg.content)
            if (response.uuid === questionAnswer.uuid) {
              console.log('Found matching response:', response)
              botResponse = response
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

      // Wait for bot response (with timeout)
      let botResponse = null
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
          // Skip our own messages
          if (msg.senderInboxId === client.inboxId) {
            console.log('Skipping own message:', msg.content)
            continue
          }

          // Return the first message from the bot that isn't our own
          botResponse = msg.content
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
    isLoading: isInitializing,
    error,
    sendAnswer,
    sendMessage
  }
} 