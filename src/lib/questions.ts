/**
 * Helper functions for working with questions
 */
import { getIPFSUrl } from './ipfs'

interface Question {
  uuid: string
  question: string
  options: {
    a: string
    b: string
    c: string
    d: string
  }
  audio_cid: string
  correct_answer?: string
}

/**
 * Fetches questions from IPFS using the provided CID
 * @param cid The IPFS content identifier for the questions
 * @returns An array of questions
 */
export async function getQuestions(cid: string): Promise<Question[]> {
  try {
    const response = await fetch(`/api/ipfs/${cid}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching questions:', error)
    return []
  }
} 