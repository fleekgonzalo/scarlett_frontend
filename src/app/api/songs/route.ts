import { NextResponse } from 'next/server'
import { TablelandClient } from '@/services/tableland'

export async function GET() {
  try {
    const client = TablelandClient.getInstance()
    const songs = await client.getAllSongs()
    return NextResponse.json(songs)
  } catch (error) {
    console.error('Failed to fetch songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    )
  }
} 