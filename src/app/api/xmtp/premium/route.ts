

import { NextResponse } from 'next/server';
import { Web3Service } from '@unlock-protocol/unlock-js';
import { networks } from '@unlock-protocol/networks';

// Configuration for the subscription lock
const PREMIUM_LOCK_ADDRESS = '0x0cbd18acec72dc47ebdb4821cf801281e0b1f0f9';
const NETWORK_ID = 84532; // Base Sepolia network ID
const NETWORK = 'base-sepolia'; // Base Sepolia network

// Custom network configuration with a public RPC URL
const customNetworks = {
  ...networks,
  [NETWORK]: {
    ...networks[NETWORK],
    provider: 'https://sepolia.base.org',
  }
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { userAddress, message, messageType } = body;

    console.log(`[XMTP Premium API] Request received for ${messageType} from ${userAddress}`);

    if (!userAddress || !message) {
      console.error('[XMTP Premium API] Missing required parameters');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify subscription status with custom networks
    const web3Service = new Web3Service(customNetworks);
    console.log(`[XMTP Premium API] Using custom RPC URL: ${customNetworks[NETWORK].provider}`);
    
    const hasValidKey = await web3Service.getHasValidKey(
      PREMIUM_LOCK_ADDRESS,
      userAddress,
      NETWORK_ID
    );

    console.log(`[XMTP Premium API] User ${userAddress} has valid key: ${hasValidKey}`);

    // If user doesn't have a premium subscription, return a message encouraging upgrade
    if (!hasValidKey) {
      return NextResponse.json({
        content: "This feature requires a premium subscription. Upgrade to access enhanced AI capabilities!",
        isPremium: false,
        tier: 'free'
      });
    }

    // Process the message based on the message type
    let response;
    switch (messageType) {
      case 'chat':
        // Enhanced chat processing for premium users
        response = await processPremiumChat(message);
        break;
      case 'tts':
        // Text-to-speech processing for premium users
        response = await processPremiumTTS(message);
        break;
      default:
        response = {
          content: "Unknown message type. Please specify 'chat' or 'tts'.",
          isPremium: true,
          tier: 'premium'
        };
    }

    return NextResponse.json({
      ...response,
      isPremium: true,
      tier: 'premium'
    });
  } catch (error) {
    console.error("[XMTP Premium API] Error processing request:", error);
    return NextResponse.json({ error: 'Failed to process premium request' }, { status: 500 });
  }
}

// Process premium chat messages with enhanced capabilities
async function processPremiumChat(message: string) {
  // This is where you would integrate with a more advanced AI model
  // For example, you could use OpenAI's GPT-4 with system instructions for better context
  
  // For now, we'll simulate an enhanced response
  return {
    content: `[Premium] Enhanced response to: "${message}"\n\nAs a premium user, you're receiving a more detailed and contextually aware response. This would typically include more nuanced language explanations, cultural context, and personalized learning suggestions based on your history.`,
    audioUrl: null
  };
}

// Process text-to-speech requests for premium users
async function processPremiumTTS(text: string) {
  // This is where you would integrate with a high-quality TTS service
  // For example, you could use ElevenLabs or another premium voice service
  
  // For now, we'll simulate a TTS response
  const mockAudioUrl = `https://example.com/tts-premium-${Date.now()}.mp3`;
  
  return {
    content: "Your premium text-to-speech audio has been generated.",
    audioUrl: mockAudioUrl
  };
} 