'use server'

import { TablelandClient, type Song } from '@/services/tableland'

/**
 * Server action to get a song by ID
 * @param id The song ID
 * @returns The song data or null if not found
 */
export async function getSong(id: number): Promise<Song | null> {
  try {
    const tableland = TablelandClient.getInstance()
    return await tableland.getSong(id)
  } catch (error) {
    console.error('Error fetching song:', error)
    return null
  }
}