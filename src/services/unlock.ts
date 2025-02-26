import { Web3Service } from '@unlock-protocol/unlock-js';
import { networks } from '@unlock-protocol/networks';

// Define subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium'
}

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

class UnlockService {
  private web3Service: Web3Service;
  
  constructor() {
    // Use our custom networks configuration
    this.web3Service = new Web3Service(customNetworks);
    console.log('Unlock service initialized with custom RPC URL for Base Sepolia');
  }
  
  /**
   * Check if a user has an active subscription
   * @param userAddress The user's wallet address
   * @returns Promise<boolean> Whether the user has an active subscription
   */
  async hasActiveSubscription(userAddress: string): Promise<boolean> {
    try {
      console.log(`Checking subscription for address: ${userAddress}`);
      
      // Get the network configuration
      const networkConfig = customNetworks[NETWORK];
      if (!networkConfig) {
        console.warn(`Network ${NETWORK} not found in custom networks`);
      } else {
        console.log(`Using RPC URL: ${networkConfig.provider}`);
      }
      
      // Check if the user has a valid key for the premium lock
      const hasValidKey = await this.web3Service.getHasValidKey(
        PREMIUM_LOCK_ADDRESS,
        userAddress,
        NETWORK_ID // Use the numeric network ID
      );
      
      console.log(`Subscription check result: ${hasValidKey}`);
      return hasValidKey;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
  
  /**
   * Get the user's subscription tier
   * @param userAddress The user's wallet address
   * @returns Promise<SubscriptionTier> The user's subscription tier
   */
  async getUserTier(userAddress: string): Promise<SubscriptionTier> {
    if (!userAddress) return SubscriptionTier.FREE;
    
    const hasSubscription = await this.hasActiveSubscription(userAddress);
    return hasSubscription ? SubscriptionTier.PREMIUM : SubscriptionTier.FREE;
  }
  
  /**
   * Get the checkout URL for the premium subscription
   * @param userAddress The user's wallet address
   * @returns string The checkout URL
   */
  getCheckoutUrl(userAddress: string): string {
    // Construct the Unlock checkout URL
    return `https://app.unlock-protocol.com/checkout?redirectUri=${encodeURIComponent(window.location.origin)}&paywallConfig=${encodeURIComponent(
      JSON.stringify({
        locks: {
          [PREMIUM_LOCK_ADDRESS]: {
            network: NETWORK_ID, // Use the numeric network ID here
            recurringPayments: {
              startAt: 'latest', // Start at the latest block
              frequency: {
                // 30 days in seconds
                timeUnit: 86400 * 30,
              },
            },
          },
        },
        pessimistic: true,
        skipRecipient: true,
        title: 'Scarlett AI Premium Subscription',
        icon: `${window.location.origin}/favicon.ico`,
      })
    )}`;
  }
}

// Export a singleton instance
export const unlockService = new UnlockService();

export default unlockService; 