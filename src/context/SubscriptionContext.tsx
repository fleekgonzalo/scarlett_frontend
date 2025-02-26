import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import unlockService, { SubscriptionTier } from '@/services/unlock';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isLoading: boolean;
  checkoutUrl: string | null;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: SubscriptionTier.FREE,
  isLoading: false,
  checkoutUrl: null,
  checkSubscription: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!isAuthenticated || !user?.id) {
      console.log('[Subscription] User not authenticated or no user ID, setting tier to FREE');
      setTier(SubscriptionTier.FREE);
      return;
    }

    try {
      console.log(`[Subscription] Checking subscription for user: ${user.id}`);
      setIsLoading(true);
      const userTier = await unlockService.getUserTier(user.id);
      console.log(`[Subscription] User tier determined: ${userTier}`);
      setTier(userTier);
      
      // Only set checkout URL if user is not already premium
      if (userTier === SubscriptionTier.FREE) {
        const url = unlockService.getCheckoutUrl(user.id);
        console.log(`[Subscription] Setting checkout URL for FREE user: ${url}`);
        setCheckoutUrl(url);
      } else {
        console.log('[Subscription] User is PREMIUM, clearing checkout URL');
        setCheckoutUrl(null);
      }
    } catch (error) {
      console.error('[Subscription] Error checking subscription:', error);
      setTier(SubscriptionTier.FREE);
    } finally {
      setIsLoading(false);
    }
  };

  // Check subscription status when user changes
  useEffect(() => {
    console.log('[Subscription] User or auth state changed, checking subscription');
    checkSubscription();
  }, [user?.id, isAuthenticated]);

  // Log state changes
  useEffect(() => {
    console.log(`[Subscription] State updated - tier: ${tier}, isLoading: ${isLoading}, hasCheckoutUrl: ${!!checkoutUrl}`);
  }, [tier, isLoading, checkoutUrl]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isLoading,
        checkoutUrl,
        checkSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider; 