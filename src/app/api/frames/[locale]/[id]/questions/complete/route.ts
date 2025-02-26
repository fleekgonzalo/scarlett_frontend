import { NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
import { TablelandClient } from '@/services/tableland'
import { createCanvas, loadImage } from 'canvas'

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string, id: string } }
) {
  try {
    // Get song data
    const tableland = TablelandClient.getInstance()
    const song = await tableland.getSong(Number(params.id))
    
    if (!song) {
      return new Response('Song not found', { status: 404 })
    }

    // Create canvas with 1.91:1 aspect ratio (standard for Frames)
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Load background image (song cover)
    const backgroundImage = await loadImage(getIPFSUrl(song.cover_img_cid))
    
    // Draw background (without blur effect for compatibility)
    ctx.drawImage(backgroundImage, 0, 0, width, height)
    
    // Add semi-transparent overlay with celebration color
    ctx.fillStyle = 'rgba(0, 50, 100, 0.7)'
    ctx.fillRect(0, 0, width, height)
    
    // Draw song cover in a centered position
    const coverSize = 200
    ctx.drawImage(
      backgroundImage, 
      (width - coverSize) / 2, 
      120, 
      coverSize, 
      coverSize
    )
    
    // Add celebration text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🎉 Congratulations! 🎉', width / 2, 80)
    
    // Add completion message
    ctx.fillStyle = 'white'
    ctx.font = 'bold 36px Arial'
    ctx.fillText('You completed all questions!', width / 2, 380)
    
    // Add song title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 28px Arial'
    ctx.fillText(song.song_title || 'Song Title', width / 2, 440)
    
    // Add artist name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '22px Arial'
    ctx.fillText(song.artist_name || 'Artist', width / 2, 480)
    
    // Add next steps instruction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '24px Arial'
    ctx.fillText(
      'Click to explore more songs',
      width / 2, 
      height - 50
    )
    
    // Add decorative elements (confetti-like)
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = 5 + Math.random() * 15
      
      ctx.fillStyle = `hsla(${Math.random() * 360}, 100%, 70%, 0.8)`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=10',
      },
    })
  } catch (error) {
    console.error('Frame completion image error:', error)
    
    // Return a simple error image
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add error message
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.fillText('Error generating completion image', 50, height / 2)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  }
} 