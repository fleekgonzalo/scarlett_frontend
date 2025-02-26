import { Metadata } from 'next'
import { TablelandClient } from '@/services/tableland'

// Generate metadata for the questions page
export async function generateMetadata({ params }: { params: { locale: string, id: string } }): Promise<Metadata> {
  try {
    // Get song data
    const tableland = TablelandClient.getInstance()
    const song = await tableland.getSong(Number(params.id))
    
    if (!song) {
      return {
        title: 'Questions - Scarlett',
        description: 'Learn language through music with Scarlett',
      }
    }

    // Base URL for API routes
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scarlett.vercel.app'
    
    return {
      title: `${song.song_title} - ${params.locale === 'zh' ? '学英语' : 'Learn Chinese'}`,
      description: `Learn ${params.locale === 'zh' ? 'English' : 'Chinese'} with ${song.song_title} by ${song.artist_name}`,
      openGraph: {
        title: `${song.song_title} - ${params.locale === 'zh' ? '学英语' : 'Learn Chinese'}`,
        description: `Learn ${params.locale === 'zh' ? 'English' : 'Chinese'} with ${song.song_title} by ${song.artist_name}`,
        images: [`${baseUrl}/api/frames/${params.locale}/${song.id}/questions/image?q=0`],
      },
      other: {
        'fc:frame': 'vNext',
        'fc:frame:image': `${baseUrl}/api/frames/${params.locale}/${song.id}/questions/image?q=0`,
        'fc:frame:image:aspect_ratio': '1.91:1',
        'fc:frame:post_url': `${baseUrl}/api/frames/${params.locale}/${song.id}/questions/answer?q=0`,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Questions - Scarlett',
      description: 'Learn language through music with Scarlett',
    }
  }
}

export default function QuestionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 