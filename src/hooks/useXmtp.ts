'use client'

import { useState, useEffect } from 'react'
import { Client, type Signer, Conversation } from '@xmtp/browser-sdk'
import { useAccount, useSignMessage } from 'wagmi'

const TUTOR_BOT_ADDRESS = '0xB59386d6407Fe48E169D15fb5Df90b97bc5F41Ee'
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
  songId: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useXmtp() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  
  const [client, setClient] = useState<Client | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [initAttempts, setInitAttempts] = useState(0)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const MAX_INIT_ATTEMPTS = 5

  // Load message history when client is initialized
  const loadMessageHistory = async (xmtp: Client) => {
    try {
      console.log('Loading message history...')
      const conversation = await xmtp.conversations.newDm(TUTOR_BOT_ADDRESS)
      setConversation(conversation)
      
      const history = await conversation.messages()
      
      // Convert XMTP messages to our format with proper typing
      const formattedMessages = history
        .filter(msg => {
          // Filter out system messages that have these properties
          const isSystemMessage = typeof msg.content === 'object' && 
            'initiatedByInboxId' in msg.content &&
            'addedInboxes' in msg.content
          
          if (isSystemMessage) {
            console.log('Filtering out system message:', msg.content)
          }
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

  // Set up message streaming
  useEffect(() => {
    if (!client || !conversation) return

    console.log('Setting up message stream...')
    
    // Start streaming messages
    let streamCloser: any;
    
    const setupStream = async () => {
      try {
        const stream = await conversation.stream();
        
        // Handle incoming messages using for-await loop
        (async () => {
          try {
            for await (const message of stream) {
              if (!message) continue;
              
              console.log('Received message:', {
                content: message.content,
                sender: message.senderInboxId,
                id: message.id,
                sentAt: new Date(Number(message.sentAtNs / BigInt(1000000))).toISOString()
              });
              
              // Skip our own messages and system messages
              if (message.senderInboxId === client.inboxId || 
                  (typeof message.content === 'object' && 
                  'initiatedByInboxId' in message.content &&
                  'addedInboxes' in message.content)) {
                console.log('Skipping message:', message.content);
                continue;
              }
              
              // Add message to state
              const messageContent = typeof message.content === 'string' 
                ? message.content 
                : JSON.stringify(message.content);
              
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.some(m => 
                  m.role === 'assistant' && 
                  m.content === messageContent
                );
                
                if (exists) {
                  console.log('Message already exists, skipping');
                  return prev;
                }
                
                console.log('Adding new message to state:', messageContent);
                return [...prev, { 
                  role: 'assistant', 
                  content: messageContent 
                }];
              });
            }
          } catch (err) {
            console.error('Stream iteration error:', err);
          }
        })();
        
        // Store the stream closer function
        streamCloser = stream.return;
      } catch (err) {
        console.error('Failed to set up message stream:', err);
      }
    };
    
    setupStream();
    
    // Clean up the stream when component unmounts
    return () => {
      console.log('Cleaning up message stream');
      if (streamCloser) {
        streamCloser();
      }
    };
  }, [client, conversation]);

  // Initialize XMTP client when wallet is connected
  useEffect(() => {
    const initXmtp = async () => {
      // Skip if already initialized or initializing
      if (hasInitialized || isInitializing || client) {
        console.log('Skipping XMTP init - already initialized or in progress:', {
          hasInitialized,
          isInitializing,
          hasClient: !!client
        })
        return
      }

      // Skip if not ready
      if (!isConnected || !address) {
        console.log('Skipping XMTP init - not connected:', {
          isConnected,
          address
        })
        return
      }

      // Check if we've exceeded max attempts
      if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error('Exceeded max XMTP init attempts')
        setError('Failed to initialize messaging after multiple attempts')
        return
      }

      try {
        console.log('Starting XMTP initialization...')
        setIsInitializing(true)
        setError(null)
        setInitAttempts(prev => prev + 1)

        // Create a signer interface that uses wagmi's signMessage
        const signer: Signer = {
          getAddress: () => address,
          signMessage: async (message: string | Uint8Array) => {
            console.log('Signing message for XMTP...')
            const messageStr = message instanceof Uint8Array 
              ? new TextDecoder().decode(message)
              : message
            
            try {
              const signature = await signMessageAsync({ message: messageStr })
              
              // Convert signature to bytes
              const hexString = signature.replace('0x', '')
              const bytes = new Uint8Array(hexString.length / 2)
              for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16)
              }
              console.log('Message signed successfully')
              return bytes
            } catch (err) {
              console.error('Failed to sign message:', err)
              // If user rejected, don't retry
              if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.includes('User denied')) {
                setInitAttempts(MAX_INIT_ATTEMPTS)
              }
              throw err
            }
          }
        }
        
        console.log('Creating XMTP client...')
        // Create XMTP client
        const xmtp = await Client.create(
          signer,
          window.crypto.getRandomValues(new Uint8Array(32)),
          { env: 'dev' }
        )
        console.log('XMTP client created successfully')

        setClient(xmtp)
        setHasInitialized(true)
        setInitAttempts(0) // Reset attempts on success

        // Load message history
        await loadMessageHistory(xmtp)

      } catch (err) {
        console.error('Failed to initialize XMTP:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize messaging')
        setClient(null)
        
        // Don't retry if user rejected or if we've exceeded max attempts
        if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.includes('User denied')) {
          setInitAttempts(MAX_INIT_ATTEMPTS)
        } else if (initAttempts < MAX_INIT_ATTEMPTS) {
          console.log(`Will retry XMTP init in 2s (attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS})`)
          setTimeout(() => {
            setIsInitializing(false)
            initXmtp()
          }, 2000)
        }
      } finally {
        setIsInitializing(false)
      }
    }

    // Only initialize if we have everything we need
    if (isConnected && address) {
      initXmtp()
    }
  }, [isConnected, address, hasInitialized, isInitializing, client, initAttempts, signMessageAsync])

  // Function to send answer to tutor bot
  const sendAnswer = async (questionAnswer: QuestionAnswer) => {
    if (!client || !conversation) {
      console.error('Cannot send answer: XMTP client not initialized')
      throw new Error('XMTP client not initialized')
    }

    try {
      // Send the answer as JSON
      const message = JSON.stringify(questionAnswer)
      console.log('Sending answer to tutor:', message)
      
      // Add message to local state immediately (optimistic update)
      setMessages(prev => [...prev, { role: 'user', content: message }])
      
      // Send the message
      await conversation.send(message)
      console.log('Answer sent successfully')
      
      // Return a promise that resolves when we receive a valid response
      return new Promise<{ isCorrect: boolean; explanation: string }>((resolve, reject) => {
        // Set a timeout just in case (30 seconds)
        const timeoutId = setTimeout(() => {
          reject(new Error('No response received from tutor within timeout period'))
        }, 30000)
        
        // Create a function to check for a valid response
        const checkForResponse = () => {
          // Look through messages for a valid response
          const responseMessage = messages.find(msg => {
            if (msg.role !== 'assistant') return false
            
            try {
              const content = JSON.parse(msg.content)
              return 'correct' in content && 'explanation' in content
            } catch {
              return false
            }
          })
          
          if (responseMessage) {
            clearTimeout(timeoutId)
            try {
              const content = JSON.parse(responseMessage.content)
              resolve({
                isCorrect: content.correct,
                explanation: content.explanation || 'No explanation provided'
              })
            } catch (err) {
              reject(new Error('Failed to parse response'))
            }
          } else {
            // Check again in a moment
            setTimeout(checkForResponse, 500)
          }
        }
        
        // Start checking for responses
        checkForResponse()
      })
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
    if (!client || !conversation) {
      console.error('Cannot send message: XMTP client not initialized')
      throw new Error('XMTP client not initialized')
    }

    try {
      console.log('Sending message:', message)
      
      // Add message to local state immediately (optimistic update)
      setMessages(prev => [...prev, { role: 'user', content: message }])
      
      // Send the message
      await conversation.send(message)
      console.log('Message sent successfully')
      
      // The response will be handled by the message stream
      return message
    } catch (err) {
      console.error('Failed to send message:', err)
      throw err
    }
  }

  return {
    isInitialized: !!client,
    isLoading: isInitializing || (!hasInitialized && isConnected && !!address),
    error,
    messages,
    sendAnswer,
    sendMessage
  }
} 