// Import types only for TypeScript
import type { State } from "ts-fsrs";
// Remove the import of UserProgress and IrysProgress from fsrs
// import { Card } from 'ts-fsrs';
// import type { UserProgress, IrysProgress } from '@/services/fsrs';

// Interface for user progress data
export interface UserProgress {
  userId: string;
  songId: string;
  questions: {
    uuid: string;
    correct: boolean;
    timestamp: number;
    fsrs?: {
      due: string;
      stability: number;
      difficulty: number;
      elapsed_days: number;
      scheduled_days: number;
      reps: number;
      lapses: number;
      state: State;
      last_review?: string;
    };
  }[];
  totalCorrect: number;
  totalQuestions: number;
  completedAt: number;
}

// Interface for Irys tag
interface Tag {
  name: string;
  value: string;
}

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

export class IrysService {
  private static instance: IrysService;
  private webIrys: any;

  private constructor() {
    console.log('Initializing IrysService...');
  }

  public static getInstance(): IrysService {
    if (!IrysService.instance) {
      IrysService.instance = new IrysService();
    }
    return IrysService.instance;
  }

  /**
   * Upload user progress data to Irys
   * This method handles all the complexity of connecting to Irys and uploading data
   */
  public async uploadProgress(progressData: UserProgress): Promise<string> {
    try {
      // This function will be implemented at runtime using dynamic imports
      // to avoid TypeScript errors with window.ethereum
      return await this._uploadToIrys(progressData);
    } catch (error) {
      console.error("Error uploading progress to Irys:", error);
      throw new Error("Failed to upload progress to Irys");
    }
  }

  /**
   * Fund the Irys account (for larger uploads)
   */
  public async fundAccount(amount: number): Promise<void> {
    try {
      // Dynamically import all required modules
      const { WebUploader } = await import("@irys/web-upload");
      const { WebEthereum } = await import("@irys/web-upload-ethereum");
      const { ViemV2Adapter } = await import("@irys/web-upload-ethereum-viem-v2");
      const viem = await import("viem");
      const chains = await import("viem/chains");

      // Get the user's account
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      // Convert to viem account format
      const accountAddress = viem.getAddress(accounts[0]);
      
      // Create wallet client
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const provider = viem.createWalletClient({
        account: accountAddress,
        chain: chains.sepolia,
        // @ts-ignore - Ignore TypeScript errors with window.ethereum
        transport: viem.custom(window.ethereum),
      });

      // Create public client
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const publicClient = viem.createPublicClient({
        chain: chains.sepolia,
        // @ts-ignore - Ignore TypeScript errors with window.ethereum
        transport: viem.custom(window.ethereum),
      });

      // Create Irys uploader
      // @ts-ignore - Ignore TypeScript errors with adapter
      const irys = await WebUploader(WebEthereum).withAdapter(
        ViemV2Adapter(provider, { publicClient })
      );
      
      // Convert amount to atomic units
      const atomicAmount = irys.utils.toAtomic(amount);
      
      // Fund the account
      const fundTx = await irys.fund(atomicAmount);
      
      console.log(`Successfully funded ${irys.utils.fromAtomic(fundTx.quantity)} ${irys.token}`);
    } catch (error) {
      console.error("Error funding Irys account:", error);
      throw new Error("Failed to fund Irys account");
    }
  }

  /**
   * Internal method that will be implemented at runtime
   * This approach avoids TypeScript errors with window.ethereum
   */
  private async _uploadToIrys(progressData: UserProgress): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error("Window is not defined. This method should only be called in browser context.");
    }
    
    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install a wallet.");
    }

    try {
      // Dynamically import all required modules
      const { WebUploader } = await import("@irys/web-upload");
      const { WebEthereum } = await import("@irys/web-upload-ethereum");
      const { ViemV2Adapter } = await import("@irys/web-upload-ethereum-viem-v2");
      const viem = await import("viem");
      const chains = await import("viem/chains");

      // Get the user's account
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      // Convert to viem account format
      const accountAddress = viem.getAddress(accounts[0]);
      
      // Create wallet client
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const provider = viem.createWalletClient({
        account: accountAddress,
        chain: chains.sepolia,
        // @ts-ignore - Ignore TypeScript errors with window.ethereum
        transport: viem.custom(window.ethereum),
      });

      // Create public client
      // @ts-ignore - Ignore TypeScript errors with window.ethereum
      const publicClient = viem.createPublicClient({
        chain: chains.sepolia,
        // @ts-ignore - Ignore TypeScript errors with window.ethereum
        transport: viem.custom(window.ethereum),
      });

      // Create Irys uploader
      // @ts-ignore - Ignore TypeScript errors with adapter
      const irysUploader = await WebUploader(WebEthereum).withAdapter(
        ViemV2Adapter(provider, { publicClient })
      );

      console.log(`Connected to Irys with address: ${irysUploader.address}`);
      
      // Convert data to JSON string
      const dataToUpload = JSON.stringify(progressData);
      
      // Add metadata tags
      const tags = [
        { name: "Content-Type", value: "application/json" },
        { name: "App-Name", value: "Scarlett" },
        { name: "Type", value: "user-progress" },
        { name: "User-Id", value: progressData.userId },
        { name: "Song-Id", value: progressData.songId.toString() },
        { name: "Completed-At", value: progressData.completedAt.toString() }
      ];

      // For small uploads (< 100KB), no funding is needed
      // For larger uploads, we would need to fund the account first
      const receipt = await irysUploader.upload(dataToUpload, { tags });
      
      console.log(`Progress data uploaded to Irys: ${receipt.id}`);
      return receipt.id;
    } catch (error) {
      console.error("Error connecting to Irys:", error);
      throw new Error("Failed to connect to Irys: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Get the latest progress for a user and song
   */
  public async getLatestProgress(userId: string, songId: string): Promise<UserProgress | null> {
    console.log(`[IrysService] getLatestProgress called for userId=${userId}, songId=${songId}`);
    
    try {
      // Use the simplified API route with query parameters
      const url = `/api/irys/progress?userId=${userId}&songId=${songId}`;
      console.log(`[IrysService] Fetching from API: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[IrysService] API request failed: ${response.statusText}`);
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[IrysService] API response received:`, data ? 'Data found' : 'No data found');
      
      if (!data) return null;

      // The API now returns data in the correct format, so we can use it directly
      return data as UserProgress;
    } catch (error) {
      console.error('[IrysService] Error fetching progress:', error);
      return null;
    }
  }
}

export default IrysService.getInstance(); 