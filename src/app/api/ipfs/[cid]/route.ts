import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { cid: string } }
) {
  const { cid } = params

  try {
    const response = await fetch(`https://premium.aiozpin.network/ipfs/${cid}`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from IPFS:', error)
    return NextResponse.json({ error: 'Failed to fetch from IPFS' }, { status: 500 })
  }
} 