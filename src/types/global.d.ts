// Interface for Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  [key: string]: any; // Add index signature to satisfy TypeScript
}

// Declare global window with ethereum property
declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
} 