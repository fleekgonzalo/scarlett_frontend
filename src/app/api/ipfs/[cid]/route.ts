

import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { cid: string } }
) {
  // Await the params to ensure they're resolved
  const cid = params.cid;

  try {
    console.log(`[IPFS API] Fetching content from CID: ${cid}`)
    const response = await fetch(`https://premium.aiozpin.network/ipfs/${cid}`)
    
    if (!response.ok) {
      console.error(`[IPFS API] Failed to fetch from IPFS: ${response.statusText}`)
      return NextResponse.json({ error: `Failed to fetch from IPFS: ${response.statusText}` }, { status: response.status })
    }
    
    const data = await response.json()
    console.log(`[IPFS API] Successfully fetched content from CID: ${cid}`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[IPFS API] Error fetching from IPFS:', error)
    return NextResponse.json({ error: 'Failed to fetch from IPFS' }, { status: 500 })
  }
} 