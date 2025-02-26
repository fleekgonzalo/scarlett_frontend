import { NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
import { TablelandClient, Song } from '@/services/tableland'

interface ResponseData {
  timestamp: string;
  request: {
    url: string;
    origin: string;
    headers: { [k: string]: string };
  };
  song: Song | null;
  ipfsGateways: {
    coverImage: string | null;
    questionsCid1: string | null;
    questionsCid2: string | null;
  };
  environment: {
    baseUrl: string;
    nodeEnv: string | undefined;
  };
  questionsData?: any[];
  questionsError?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get a test song (ID 1)
    const tableland = TablelandClient.getInstance()
    const song = await tableland.getSong(1)
    
    // Get debug info from request
    const origin = request.nextUrl.origin
    const headers = Object.fromEntries(request.headers.entries())
    
    // Prepare response data
    const responseData: ResponseData = {
      timestamp: new Date().toISOString(),
      request: {
        url: request.url,
        origin: origin,
        headers: headers
      },
      song: song,
      ipfsGateways: {
        coverImage: song ? getIPFSUrl(song.cover_img_cid) : null,
        questionsCid1: song ? getIPFSUrl(song.questions_cid_1) : null,
        questionsCid2: song ? getIPFSUrl(song.questions_cid_2) : null
      },
      environment: {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
        nodeEnv: process.env.NODE_ENV
      }
    }
    
    // Try to fetch questions if available
    if (song) {
      try {
        // Try to fetch questions from both CIDs
        const questionPromises = []
        
        if (song.questions_cid_1) {
          questionPromises.push(
            fetch(getIPFSUrl(song.questions_cid_1))
              .then(res => res.ok ? res.json() : { error: `Failed with status ${res.status}` })
              .then(data => ({ cid: song.questions_cid_1, data }))
              .catch(err => ({ cid: song.questions_cid_1, error: err.message }))
          )
        }
        
        if (song.questions_cid_2) {
          questionPromises.push(
            fetch(getIPFSUrl(song.questions_cid_2))
              .then(res => res.ok ? res.json() : { error: `Failed with status ${res.status}` })
              .then(data => ({ cid: song.questions_cid_2, data }))
              .catch(err => ({ cid: song.questions_cid_2, error: err.message }))
          )
        }
        
        const questionsResults = await Promise.all(questionPromises)
        responseData.questionsData = questionsResults
      } catch (error) {
        responseData.questionsError = error instanceof Error ? error.message : String(error)
      }
    }
    
    // Return the debug information
    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Debug route error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 