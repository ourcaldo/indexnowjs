import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TagArchiveContent from './components/TagArchiveContent'
import { BLOG_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Generate metadata for tag archive pages
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  try {
    const { tag } = await params
    
    // Capitalize and format tag name for display
    const tagName = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')
    
    return {
      title: `#${tagName} - Blog Tag - IndexNow Studio`,
      description: `Explore all blog posts tagged with ${tagName}. Discover insights about SEO, rank tracking, and digital marketing.`,
      keywords: `${tagName}, SEO, rank tracking, digital marketing, IndexNow Studio, blog, tag`,
      openGraph: {
        title: `#${tagName} - Blog Tag - IndexNow Studio`,
        description: `Explore all blog posts tagged with ${tagName}. Discover insights about SEO, rank tracking, and digital marketing.`,
        type: 'website',
        url: `/blog/tag/${tag}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `#${tagName} - Blog Tag - IndexNow Studio`,
        description: `Explore all blog posts tagged with ${tagName}. Discover insights about SEO, rank tracking, and digital marketing.`,
      },
      alternates: {
        canonical: `/blog/tag/${tag}`
      },
      robots: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    }
  } catch (error) {
    return {
      title: 'Blog Tag - IndexNow Studio',
      description: 'Explore blog posts by tag on IndexNow Studio.'
    }
  }
}

export default async function TagArchivePage({ params }: { params: Promise<{ tag: string }> }) {
  try {
    const { tag } = await params
    
    // Verify that the tag exists by checking if there are any posts
    const response = await fetch(BLOG_ENDPOINTS.POSTS_BY_TAG(tag, 1), {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      notFound()
    }
    
    const data = await response.json()
    
    // If no posts found for this tag, return 404
    if (!data.posts || data.posts.length === 0) {
      notFound()
    }
    
    return <TagArchiveContent tag={tag} />
    
  } catch (error) {
    console.error('Error loading tag archive:', error)
    notFound()
  }
}