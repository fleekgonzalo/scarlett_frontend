// Table names - these are unique to your deployment
export const SONGS_TABLE = 'song_v2_8453_22';

export interface Song {
  id: number
  song_title: string
  song_title_translated: string
  cover_img_cid: string
  thumb_img_cid: string
  language_1: string
  language_2: string
  lyrics_cid: string
  questions_cid_1: string
  questions_cid_2: string
  apple_id: string | null
  spotify_id: string | null
  youtube_id: string | null
  odyssey_id: string | null
  tidal_id: string | null
  deezer_id: string | null
  genius_id: string | null
  artist_name: string
  song_duration: number
  unique_words_1: number
  unique_words_2: number
  cefr_level: number
  words_per_second: number
  audio_cid: string
  rating: string
}

export class TablelandClient {
  private static instance: TablelandClient;
  private baseUrl = 'https://tableland.network/api/v1/query'
  private timeout = 5000 // 5 second timeout

  private constructor() {
    console.log('Initializing read-only TablelandClient...')
  }

  static getInstance(): TablelandClient {
    if (!TablelandClient.instance) {
      TablelandClient.instance = new TablelandClient()
    }
    return TablelandClient.instance
  }

  private async fetchWithTimeout(url: string) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async getAllSongs(): Promise<Song[]> {
    console.log('Fetching all songs...', { baseUrl: this.baseUrl })
    
    try {
      const query = 'SELECT * FROM song_v2_8453_22 ORDER BY id DESC'
      const url = `${this.baseUrl}?statement=${encodeURIComponent(query)}`
      console.log('Request URL:', url)
      
      const data = await this.fetchWithTimeout(url)
      return data as Song[]
    } catch (error) {
      console.error('Failed to fetch songs:', error)
      throw new Error('Failed to fetch songs. The service might be temporarily unavailable.')
    }
  }

  async getSong(id: number): Promise<Song | null> {
    console.log('Fetching song...', { id, baseUrl: this.baseUrl })
    
    try {
      const query = `SELECT * FROM song_v2_8453_22 WHERE id = ${id}`
      const url = `${this.baseUrl}?statement=${encodeURIComponent(query)}`
      console.log('Request URL:', url)
      
      const data = await this.fetchWithTimeout(url)
      return data[0] || null
    } catch (error) {
      console.error('Failed to fetch song:', error)
      throw new Error('Failed to fetch song. The service might be temporarily unavailable.')
    }
  }
} 