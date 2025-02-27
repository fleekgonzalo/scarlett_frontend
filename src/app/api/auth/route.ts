

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

export async function POST(req: Request) {
  try {
    const { address, signature } = await req.json()
    
    // Verify wallet signature
    const isValid = await verifyMessage({
      message: 'Login to Scarlett',
      signature,
      address
    })

    if (isValid) {
      // In production, you'd want to:
      // 1. Create a proper session/JWT
      // 2. Store session in a database
      // 3. Add proper session expiry
      // For now, we'll just set a simple cookie
      const response = NextResponse.json({ success: true })
      response.cookies.set('session', address, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })

      return response
    }

    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
} 