'use client'

import { useState, useEffect } from 'react'
import { Client, type Signer, Conversation, DecodedMessage } from '@xmtp/browser-sdk'
import { useAccount, useSignMessage } from 'wagmi'
import { useSubscription } from '@/context/SubscriptionContext'
import { SubscriptionTier } from '@/services/unlock'

const TUTOR_BOT_ADDRESS = '0x3e506025BaEB9BAA8001218D37B329dC030576C9'
const ENCODING = 'binary'

// Helper functions for key storage
const buildLocalStorageKey = (walletAddress: string): string => 
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

// Add new interface for the response that includes audio information
interface AnswerResponse {
  isCorrect: boolean
  explanation: string
  audioSrc?: string
}

// Helper to check if an object is a system message
const isSystemMessage = (content: any): boolean => {
  return typeof content === 'object' && 
    'initiatedByInboxId' in content &&
    'addedInboxes' in content
}

export function useXmtp() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { tier } = useSubscription()
  
  const [client, setClient] = useState<Client | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [initAttempts, setInitAttempts] = useState(0)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [pendingAnswers, setPendingAnswers] = useState<Map<string, (result: any) => void>>(new Map())
  const [latestResponse, setLatestResponse] = useState<{
    timestamp: number, 
    response: AnswerResponse,
    uuid?: string
  } | null>(null)
  const MAX_INIT_ATTEMPTS = 5

  // Add a new state variable to track subscription status
  const [isPremium, setIsPremium] = useState(false)
  
  // Update premium status when tier changes
  useEffect(() => {
    setIsPremium(tier === SubscriptionTier.PREMIUM)
  }, [tier])

  // Load message history when client is initialized
  const loadMessageHistory = async (xmtp: Client) => {
    try {
      console.log('Loading message history...')
      const conversation = await xmtp.conversations.newDm(TUTOR_BOT_ADDRESS)
      setConversation(conversation)
      
      const history = await conversation.messages()
      console.log('Raw message history:', history.map(msg => ({
        id: msg.id,
        senderInboxId: msg.senderInboxId,
        clientInboxId: xmtp.inboxId,
        contentPreview: typeof msg.content === 'string' 
          ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
          : 'non-string content'
      })))
      
      // Convert XMTP messages to our format with proper typing
      const formattedMessages = history
        .filter(msg => {
          // Filter out system messages
          if (isSystemMessage(msg.content)) {
            console.log('Filtering out system message:', msg.content)
            return false
          }
          return true
        })
        .map(msg => {
          // Check if this is from the tutor bot
          const isFromTutorBot = msg.senderInboxId && 
                                TUTOR_BOT_ADDRESS && 
                                msg.senderInboxId.toLowerCase().includes(TUTOR_BOT_ADDRESS.toLowerCase());
          
          // Determine the role based on sender
          const role = isFromTutorBot || msg.senderInboxId !== xmtp.inboxId 
            ? 'assistant' as const 
            : 'user' as const;
            
          console.log('Message role determined as:', role, 
                      'isFromTutorBot:', isFromTutorBot, 
                      'senderInboxId:', msg.senderInboxId, 
                      'clientInboxId:', xmtp.inboxId)
            
          return {
            role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          }
        })

      console.log('Loaded messages:', formattedMessages)
      setMessages(formattedMessages)
    } catch (err) {
      console.error('Failed to load message history:', err)
      setError('Failed to load message history')
    }
  }

  // Handle incoming messages
  const handleIncomingMessage = async (message: DecodedMessage) => {
    if (!message) {
      console.log('Received undefined message, skipping')
      return
    }

    console.log('Received message:', {
      content: typeof message.content === 'string' 
        ? message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
        : 'non-string content',
      senderInboxId: message.senderInboxId,
      clientInboxId: client?.inboxId,
      id: message.id,
      sentAt: new Date(Number(message.sentAtNs / BigInt(1000000))).toISOString()
    })

    // Check if this is from the tutor bot
    const isFromTutorBot = message.senderInboxId && 
                          TUTOR_BOT_ADDRESS && 
                          message.senderInboxId.toLowerCase().includes(TUTOR_BOT_ADDRESS.toLowerCase());
    
    console.log('Message source check:', {
      isFromTutorBot,
      senderInboxId: message.senderInboxId,
      TUTOR_BOT_ADDRESS,
      clientInboxId: client?.inboxId,
      isSenderClient: message.senderInboxId === client?.inboxId
    });

    // Skip messages sent by the client (but not from the tutor bot)
    if (message.senderInboxId === client?.inboxId && !isFromTutorBot) {
      console.log('Skipping message sent by client')
      return
    }

    // Skip system messages
    if (message.contentType.typeId === 'system') {
      console.log('Skipping system message')
      return
    }

    // Format the message content - always treat messages from tutor as assistant
    const formattedMessage = {
      role: isFromTutorBot || message.senderInboxId !== client?.inboxId ? 'assistant' as const : 'user' as const,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    }

    console.log('Message role determined as:', formattedMessage.role, 
                'isFromTutorBot:', isFromTutorBot, 
                'senderInboxId:', message.senderInboxId, 
                'clientInboxId:', client?.inboxId)

    // Check if the message is a duplicate by comparing content and role
    const isDuplicate = messages.some(
      (msg) => msg.content === formattedMessage.content && msg.role === formattedMessage.role
    )

    if (isDuplicate) {
      console.log('Skipping duplicate message')
      return
    }

    console.log('Adding message to state:', formattedMessage)
    // Add the message to the state
    setMessages((prev) => [...prev, formattedMessage])

    // Check if this is an answer validation response
    try {
      const parsedContent = JSON.parse(message.content)
      
      // If this is a response to an answer validation request
      if ('correct' in parsedContent) {
        console.log('Received answer validation response:', parsedContent)
        
        // Create a response object with audio information
        const response: AnswerResponse = {
          isCorrect: parsedContent.correct,
          explanation: parsedContent.explanation || ''
        }
        
        // Add audio source based on whether the answer is correct or not
        if (parsedContent.correct) {
          // For correct answers, use a random local audio file with absolute path
          response.audioSrc = getRandomCorrectAudio()
          // Set explanation based on the audio file if not provided
          if (!response.explanation) {
            response.explanation = getExplanationFromAudio(response.audioSrc)
          }
        } else if (parsedContent.audio_cid) {
          // For incorrect answers, use the audio_cid from the response
          response.audioSrc = `https://premium.aiozpin.network/ipfs/${parsedContent.audio_cid}`
        }
        
        // Check if we have any pending answers
        if (pendingAnswers.size > 0) {
          console.log('Current pendingAnswers size:', pendingAnswers.size)
          
          // Find the matching request in recent messages
          const recentMessages = messages.slice(-20);
          const requestMessage = recentMessages.find(msg => 
            msg.role === 'user' && 
            msg.content.includes('"uuid"') && 
            msg.content.includes('"selectedAnswer"')
          );
          
          if (requestMessage) {
            try {
              // Parse the request to get the UUID
              const requestContent = JSON.parse(requestMessage.content);
              const requestUuid = requestContent.uuid;
              console.log('Found matching request with UUID:', requestUuid);
              
              // Find pending answers that match this UUID
              const pendingAnswersArray = Array.from(pendingAnswers.entries());
              const matchingPendingAnswer = pendingAnswersArray.find(([key]) => 
                key.includes(requestUuid)
              );
              
              if (matchingPendingAnswer) {
                const [answerId, resolver] = matchingPendingAnswer;
                console.log('Resolving pending answer with ID:', answerId);
                
                // Resolve the promise with the response
                resolver(response);
                
                // Remove the pending answer from the map
                const newPendingAnswers = new Map(pendingAnswers);
                newPendingAnswers.delete(answerId);
                setPendingAnswers(newPendingAnswers);
                
                return;
              } else {
                console.log('No matching pending answer found for UUID:', requestUuid);
              }
            } catch (e) {
              console.error('Error parsing request message:', e);
            }
          }
          
          // If we couldn't find a matching request or couldn't parse it,
          // resolve all pending answers as a fallback
          console.log('Resolving all pending answers as fallback');
          pendingAnswers.forEach((resolver, answerId) => {
            console.log('Resolving pending answer with ID:', answerId);
            resolver(response);
          });
          
          // Clear all pending answers
          setPendingAnswers(new Map());
        } else {
          console.log('No pending answers, storing response for later use')
          // Store the response for later use
          setLatestResponse({
            timestamp: Date.now(),
            response
          })
        }
      }
    } catch (e) {
      // Not JSON or not a response, ignore
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
              if (message) {
                console.log('Stream received message:', {
                  id: message.id,
                  senderInboxId: message.senderInboxId,
                  clientInboxId: client.inboxId,
                  contentPreview: typeof message.content === 'string' 
                    ? message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
                    : 'non-string content'
                });
                
                // Process the message
                handleIncomingMessage(message)
              
                // Check if there are any pending answers that need to be resolved
                if (pendingAnswers.size > 0) {
                  console.log('Checking if this message resolves any pending answers...')
                  
                  // Try to parse the message content
                  try {
                    const content = typeof message.content === 'object' 
                      ? message.content 
                      : JSON.parse(typeof message.content === 'string' ? message.content : JSON.stringify(message.content || '{}'))
                    
                    // If this is an answer validation response, resolve matching pending answers
                    if (content && 'correct' in content) {
                      console.log('Found answer validation response in stream:', content)
                      
                      // Create a response object with audio information
                      const response: AnswerResponse = {
                        isCorrect: content.correct,
                        explanation: content.explanation || ''
                      }
                      
                      // Add audio source based on whether the answer is correct or not
                      if (content.correct) {
                        // For correct answers, use a random local audio file with absolute path
                        response.audioSrc = getRandomCorrectAudio()
                        // Set explanation based on the audio file if not provided
                        if (!response.explanation) {
                          response.explanation = getExplanationFromAudio(response.audioSrc)
                        }
                      } else if (content.audio_cid) {
                        // For incorrect answers, use the audio_cid from the response
                        response.audioSrc = `https://premium.aiozpin.network/ipfs/${content.audio_cid}`
                      }
                      
                      // Check if we have a UUID in the message
                      const messageUuid = content.uuid;
                      console.log('Message UUID:', messageUuid);
                      
                      if (messageUuid) {
                        // Find pending answers that match this UUID
                        const pendingAnswersArray = Array.from(pendingAnswers.entries());
                        const matchingPendingAnswers = pendingAnswersArray.filter(([key]) => 
                          key.includes(messageUuid)
                        );
                        
                        if (matchingPendingAnswers.length > 0) {
                          console.log(`Found ${matchingPendingAnswers.length} matching pending answers for UUID:`, messageUuid);
                          
                          // Resolve matching pending answers
                          matchingPendingAnswers.forEach(([answerId, resolver]) => {
                            console.log('Resolving pending answer with ID:', answerId);
                            resolver(response);
                            
                            // Remove the pending answer from the map
                            pendingAnswers.delete(answerId);
                          });
                          
                          // Update the pending answers state
                          setPendingAnswers(new Map(pendingAnswers));
                        } else {
                          console.log('No matching pending answers found for UUID:', messageUuid);
                          
                          // Store the response for later use
                          setLatestResponse({
                            timestamp: Date.now(),
                            response,
                            uuid: messageUuid
                          });
                        }
                      } else {
                        // No UUID in the message, resolve all pending answers as fallback
                        console.log('No UUID in message, resolving all pending answers as fallback');
                        
                        // Make a copy of the resolvers before clearing the map
                        const resolvers = Array.from(pendingAnswers.values());
                        
                        // Clear pending answers first to avoid race conditions
                        setPendingAnswers(new Map());
                        
                        // Then resolve all the promises
                        resolvers.forEach(resolve => {
                          console.log('Resolving pending answer from stream (fallback)');
                          resolve(response);
                        });
                      }
                    }
                  } catch (e) {
                    // Not JSON or not a response, continue
                    console.log('Message is not a JSON response:', e)
                  }
                }
              } else {
                console.log('Stream received undefined message');
              }
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
  }, [client, conversation, pendingAnswers]);

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

  // Function to get a random audio file for correct answers
  const getRandomCorrectAudio = (): string => {
    const correctAudioFiles = [
      '/en/audio/fantastic-tai-bang-le.mp3',
      '/en/audio/gan-de-piaoliang-well-done.mp3',
      '/en/audio/hen-chuse-excellent.mp3',
      '/en/audio/very-good-hen-hao.mp3'
    ]
    const randomIndex = Math.floor(Math.random() * correctAudioFiles.length)
    return correctAudioFiles[randomIndex]
  }

  // Function to get a hardcoded explanation based on the audio filename
  const getExplanationFromAudio = (audioSrc: string): string => {
    if (audioSrc.includes('fantastic-tai-bang-le')) {
      return "Fantastic! 太棒了 (tài bàng le)!"
    } else if (audioSrc.includes('gan-de-piaoliang-well-done')) {
      return "Well done! 干得漂亮 (gàn de piàoliang)!"
    } else if (audioSrc.includes('hen-chuse-excellent')) {
      return "很出色 (hěn chūsè)! Excellent!"
    } else if (audioSrc.includes('very-good-hen-hao')) {
      return "Very good! 很好 (hěn hǎo)!"
    }
    return "Great job!"
  }

  // Function to send answer to tutor bot
  const sendAnswer = async (questionAnswer: QuestionAnswer): Promise<AnswerResponse> => {
    if (!conversation || !client) {
      throw new Error('XMTP client not initialized')
    }

    try {
      console.log('Sending answer validation request:', questionAnswer)
      
      // Create a unique ID for this answer request
      const answerId = `${questionAnswer.uuid}-${Date.now()}`
      
      // Add subscription tier to the message
      const messageWithTier = {
        ...questionAnswer,
        tier: tier,
        isPremium: isPremium
      }
      
      // Create a promise that will be resolved when we get a response
      const responsePromise = new Promise<AnswerResponse>((resolve) => {
        pendingAnswers.set(answerId, resolve)
      })
      
      // Send the message
      await conversation.send(JSON.stringify(messageWithTier))
      
      // Set a timeout to clean up the pending answer if we don't get a response
      setTimeout(() => {
        if (pendingAnswers.has(answerId)) {
          console.log('Answer validation timed out for:', answerId)
          pendingAnswers.delete(answerId)
        }
      }, 30000) // 30 second timeout
      
      // Wait for the response
      const response = await responsePromise
      return response
    } catch (err) {
      console.error('Failed to send answer validation request:', err)
      throw err
    }
  }

  // Function to send a general message
  const sendMessage = async (message: string): Promise<string> => {
    if (!conversation || !client) {
      throw new Error('XMTP client not initialized')
    }

    try {
      console.log('Sending message:', message)
      
      // Add subscription tier to the message by modifying the content
      // This is a simpler approach that doesn't require modifying the content type
      const messageWithMetadata = JSON.stringify({
        content: message,
        metadata: {
          tier: tier,
          isPremium: isPremium,
          timestamp: Date.now()
        }
      })
      
      // Send the message
      const sent = await conversation.send(messageWithMetadata)
      
      console.log('Message sent:', sent)
      return sent
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