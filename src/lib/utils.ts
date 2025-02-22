import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCEFRLevel(level: number): string {
  // Convert numeric level to CEFR format (1 -> A1, 2 -> A2, 3 -> B1, etc.)
  const tier = Math.ceil(level / 2)
  const level_within_tier = ((level - 1) % 2) + 1
  const tiers = ['A', 'B', 'C']
  
  if (tier < 1 || tier > 3) {
    return 'Unknown'
  }
  
  return `${tiers[tier - 1]}${level_within_tier}`
}

export function getIPFSUrl(cid: string): string {
  return `https://premium.aiozpin.network/ipfs/${cid}`
}
