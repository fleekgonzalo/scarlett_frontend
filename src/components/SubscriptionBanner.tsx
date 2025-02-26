import React, { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { SubscriptionTier } from '@/services/unlock';
import { Button } from '@/components/ui/button';
import { Sparkles, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UnlockCheckoutLink from './UnlockCheckoutLink';

interface SubscriptionBannerProps {
  showFreeFeatures?: boolean;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ 
  showFreeFeatures = true 
}) => {
  const { tier, isLoading, checkoutUrl, checkSubscription } = useSubscription();
  const { user } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  
  if (isLoading) {
    return (
      <div className="w-full bg-neutral-800 p-4 rounded-lg animate-pulse">
        <div className="h-6 bg-neutral-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (tier === SubscriptionTier.PREMIUM) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-900 to-purple-900 p-4 rounded-lg border border-blue-500">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold text-white">Premium Subscription Active</h3>
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="ml-auto text-blue-300 hover:text-blue-200"
          >
            <Info size={16} />
          </button>
        </div>
        <p className="text-sm text-blue-200">
          You have access to all premium features including enhanced AI responses, 
          voice synthesis, and memory.
        </p>
        
        {showDebug && (
          <div className="mt-3 p-2 bg-blue-950 rounded text-xs text-blue-300 font-mono">
            <p>User Address: {user?.id || 'Not connected'}</p>
            <p>Subscription Tier: {tier}</p>
            <p>Lock Address: 0x0cbd18acec72dc47ebdb4821cf801281e0b1f0f9</p>
            <p>Network: Base Sepolia (84532)</p>
            <button 
              onClick={() => checkSubscription()} 
              className="mt-2 px-2 py-1 bg-blue-800 rounded text-white hover:bg-blue-700"
            >
              Refresh Subscription
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="w-full bg-neutral-800 p-4 rounded-lg border border-neutral-700">
      <div className="flex items-center">
        <h3 className="font-semibold text-white mb-2">Upgrade to Premium</h3>
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="ml-auto text-neutral-400 hover:text-neutral-300"
        >
          <Info size={16} />
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-neutral-300 mb-2">
          Get access to enhanced AI features for just $20/month:
        </p>
        
        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-white">Enhanced AI responses with better context</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-white">High-quality voice synthesis</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-white">Long-term memory for personalized learning</span>
          </li>
        </ul>
      </div>
      
      {showFreeFeatures && (
        <div className="mb-4">
          <p className="text-sm text-neutral-400 mb-1">Free tier includes:</p>
          <ul className="text-sm text-neutral-400">
            <li>• Basic chat functionality</li>
            <li>• Multiple choice questions</li>
            <li>• Progress tracking</li>
          </ul>
        </div>
      )}
      
      {showDebug && (
        <div className="mb-4 p-2 bg-neutral-900 rounded text-xs text-neutral-400 font-mono">
          <p>User Address: {user?.id || 'Not connected'}</p>
          <p>Subscription Tier: {tier}</p>
          <p>Lock Address: 0x0cbd18acec72dc47ebdb4821cf801281e0b1f0f9</p>
          <p>Network: Base Sepolia (84532)</p>
          <p>Checkout URL: {checkoutUrl ? 'Available' : 'Not available'}</p>
          <button 
            onClick={() => checkSubscription()} 
            className="mt-2 px-2 py-1 bg-neutral-700 rounded text-white hover:bg-neutral-600"
          >
            Refresh Subscription
          </button>
        </div>
      )}
      
      <UnlockCheckoutLink />
    </div>
  );
};

export default SubscriptionBanner; 