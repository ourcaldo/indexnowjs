import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CategoryArchiveContent from './components/CategoryArchiveContent'
import { BLOG_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Generate metadata for category archive pages
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  try {
    const { category } = await params
    
    // Capitalize and format category name for display
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')
    
    return {
      title: `${categoryName} - Blog Category - IndexNow Studio`,
      description: `Explore all blog posts in the ${categoryName} category. Discover insights about SEO, rank tracking, and digital marketing.`,
      keywords: `${categoryName}, SEO, rank tracking, digital marketing, IndexNow Studio, blog`,
      openGraph: {
        title: `${categoryName} - Blog Category - IndexNow Studio`,
        description: `Explore all blog posts in the ${categoryName} category. Discover insights about SEO, rank tracking, and digital marketing.`,
        type: 'website',
        url: `/blog/category/${category}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${categoryName} - Blog Category - IndexNow Studio`,
        description: `Explore all blog posts in the ${categoryName} category. Discover insights about SEO, rank tracking, and digital marketing.`,
      },
      alternates: {
        canonical: `/blog/category/${category}`
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
      title: 'Blog Category - IndexNow Studio',
      description: 'Explore blog posts by category on IndexNow Studio.'
    }
  }
}

export default async function CategoryArchivePage({ params }: { params: Promise<{ category: string }> }) {
  try {
    const { category } = await params
    
    // Verify that the category exists by checking if there are any posts
    const response = await fetch(BLOG_ENDPOINTS.POSTS_BY_CATEGORY(category, 1), {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      notFound()
    }
    
    const data = await response.json()
    
    // If no posts found for this category, return 404
    if (!data.posts || data.posts.length === 0) {
      notFound()
    }
    
    return <CategoryArchiveContent category={category} />
    
  } catch (error) {
    console.error('Error loading category archive:', error)
    notFound()
  }
}