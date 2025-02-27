

import { NextResponse } from 'next/server';
import { Web3Service } from '@unlock-protocol/unlock-js';
import { networks } from '@unlock-protocol/networks';

// Configuration for the subscription lock
// Using your actual lock on Base Sepolia
const PREMIUM_LOCK_ADDRESS = '0x0cbd18acec72dc47ebdb4821cf801281e0b1f0f9';
const NETWORK = 'base-sepolia'; // Base Sepolia network
const NETWORK_ID = 84532; // Base Sepolia network ID

// Custom network configuration with a public RPC URL
const customNetworks = {
  ...networks,
  [NETWORK]: {
    ...networks[NETWORK],
    provider: 'https://sepolia.base.org',
  }
};

export async function GET(request: Request) {
  // Get user address from query parameters
  const url = new URL(request.url);
  const userAddress = url.searchParams.get('address');

  console.log(`[Subscription API] Verifying subscription for address: ${userAddress}`);

  if (!userAddress) {
    console.error('[Subscription API] Missing address parameter');
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  try {
    // Initialize Web3Service with custom networks
    const web3Service = new Web3Service(customNetworks);
    console.log(`[Subscription API] Using custom RPC URL: ${customNetworks[NETWORK].provider}`);
    
    // Check if the user has a valid key for the premium lock
    const hasValidKey = await web3Service.getHasValidKey(
      PREMIUM_LOCK_ADDRESS,
      userAddress,
      NETWORK_ID
    );
    
    console.log(`[Subscription API] User ${userAddress} has valid key: ${hasValidKey}`);
    
    return NextResponse.json({ 
      address: userAddress,
      hasValidKey,
      tier: hasValidKey ? 'premium' : 'free',
      expiresAt: null // You could fetch the expiration date if needed
    });
  } catch (error) {
    console.error("[Subscription API] Error verifying subscription:", error);
    return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 500 });
  }
} 