/**
 * Helper functions for working with IPFS
 */

/**
 * Converts an IPFS CID to a URL that can be used to fetch the content
 * @param cid The IPFS content identifier
 * @returns A URL that can be used to fetch the content
 */
export function getIPFSUrl(cid: string): string {
  return `https://premium.aiozpin.network/ipfs/${cid}`
} 