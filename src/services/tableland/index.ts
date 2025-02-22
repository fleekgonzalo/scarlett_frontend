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
  private readonly gateway = 'https://tableland.network/api/v1';

  private constructor() {
    console.info('Initializing read-only TablelandClient...');
  }

  public static getInstance(): TablelandClient {
    if (!TablelandClient.instance) {
      TablelandClient.instance = new TablelandClient();
    }
    return TablelandClient.instance;
  }

  async getAllSongs(): Promise<Song[]> {
    try {
      const query = `SELECT * FROM ${SONGS_TABLE} ORDER BY id DESC`;
      console.info('Fetching all songs...', { query });
      
      const url = `${this.gateway}/query?statement=${encodeURIComponent(query)}`;
      console.info('Request URL:', url);
      
      const response = await fetch(url);
      console.info('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Query failed: ${errorText}`);
      }
      
      const data = await response.json();
      console.info('Raw response data:', data);

      // Check if the response is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array');
      }

      // Map the array directly since each item should be a Song object
      const songs = data as Song[];
      console.info(`Successfully processed ${songs.length} songs`);
      return songs;
    } catch (err) {
      const error = err as Error;
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getSong(songId: number): Promise<Song | null> {
    try {
      const query = `SELECT * FROM ${SONGS_TABLE} WHERE id = ${songId}`;
      console.info(`Fetching song ${songId}...`, { query });
      
      const url = `${this.gateway}/query?statement=${encodeURIComponent(query)}`;
      console.info('Request URL:', url);
      
      const response = await fetch(url);
      console.info('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Query failed: ${errorText}`);
      }
      
      const data = await response.json();
      console.info('Raw response data:', data);

      // Check if the response is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array');
      }
      
      if (data.length === 0) {
        console.warn(`No song found with id ${songId}`);
        return null;
      }

      // Return the first item in the array
      const song = data[0] as Song;
      console.info(`Successfully processed song ${songId}:`, song);
      return song;
    } catch (err) {
      const error = err as Error;
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
} 