// This component adds Farcaster Frame metadata to a page
// It should be used in client components

'use client'

import { useEffect } from 'react'

interface FrameMetadataProps {
  title: string
  description: string
  imageSrc: string
  postUrl?: string
  buttons?: string[]
  audioSrc?: string
}

export function FrameMetadata({
  title,
  description,
  imageSrc,
  postUrl,
  buttons = [],
  audioSrc
}: FrameMetadataProps) {
  useEffect(() => {
    // Add frame metadata to the document head
    const addMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    }

    // Frame metadata
    addMetaTag('fc:frame', 'vNext')
    addMetaTag('fc:frame:image', imageSrc)
    addMetaTag('fc:frame:image:aspect_ratio', '1.91:1')
    
    // Buttons
    if (buttons[0]) addMetaTag('fc:frame:button:1', buttons[0])
    if (buttons[1]) addMetaTag('fc:frame:button:2', buttons[1])
    if (buttons[2]) addMetaTag('fc:frame:button:3', buttons[2])
    if (buttons[3]) addMetaTag('fc:frame:button:4', buttons[3])
    
    // Post URL
    if (postUrl) addMetaTag('fc:frame:post_url', postUrl)
    
    // Audio
    if (audioSrc) addMetaTag('fc:frame:audio', audioSrc)
    
    // Open Graph metadata
    addMetaTag('og:title', title)
    addMetaTag('og:description', description)
    addMetaTag('og:image', imageSrc)
    
    // Clean up function
    return () => {
      // No cleanup needed as we're just modifying the document head
    }
  }, [title, description, imageSrc, postUrl, buttons, audioSrc])
  
  // This component doesn't render anything visible
  return null
} 