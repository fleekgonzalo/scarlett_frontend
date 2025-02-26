import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface UnlockCheckoutLinkProps {
  className?: string;
}

export const UnlockCheckoutLink: React.FC<UnlockCheckoutLinkProps> = ({ 
  className = ''
}) => {
  // Lock address and network ID for Base Sepolia
  const lockAddress = '0x0cbd18acec72dc47ebdb4821cf801281e0b1f0f9';
  const networkId = 84532;
  
  // Create a direct checkout URL
  const checkoutUrl = `https://app.unlock-protocol.com/checkout?redirectUri=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  )}&paywallConfig=${encodeURIComponent(
    JSON.stringify({
      locks: {
        [lockAddress]: {
          network: networkId,
          recurringPayments: {
            startAt: 'latest',
            frequency: {
              timeUnit: 86400 * 30, // 30 days in seconds
            },
          },
        },
      },
      pessimistic: true,
      skipRecipient: true,
      title: 'Scarlett AI Premium Subscription',
      icon: typeof window !== 'undefined' 
        ? `${window.location.origin}/favicon.ico` 
        : 'http://localhost:3000/favicon.ico',
    })
  )}`;
  
  const handleClick = () => {
    console.log('Opening direct checkout URL:', checkoutUrl);
    window.open(checkoutUrl, '_blank');
  };
  
  return (
    <Button 
      className={`w-full bg-blue-600 hover:bg-blue-700 ${className}`}
      onClick={handleClick}
    >
      <Sparkles className="h-4 w-4 mr-2" />
      Upgrade to Premium ($20/month)
    </Button>
  );
};

export default UnlockCheckoutLink; 