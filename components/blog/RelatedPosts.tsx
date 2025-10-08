'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, User, ArrowRight, Tag } from 'lucide-react'

interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  tags: string[]
  author: {
    name: string
  }
}

interface RelatedPostsProps {
  posts: RelatedPost[]
  className?: string
}

export default function RelatedPosts({ posts, className = '' }: RelatedPostsProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleImageError = (postId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [postId]: true
    }))
  }

  if (posts.length === 0) {
    return null
  }

  return (
    <section className={`${className}`} data-testid="related-posts-section">
      <div className="border-t border-border pt-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8" data-testid="related-posts-title">
          Related Articles
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group bg-black border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1"
              data-testid={`related-post-${post.slug}`}
            >
              {/* Featured Image */}
              <div className="aspect-[16/10] relative overflow-hidden bg-black">
                {post.featured_image_url && !imageErrors[post.id] ? (
                  <img
                    src={post.featured_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => handleImageError(post.id)}
                    data-testid={`related-post-image-${post.slug}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Tag className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No image</p>
                    </div>
                  </div>
                )}
                
                {/* Tags overlay */}
                {post.tags.length > 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/90 text-white">
                      {post.tags[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Meta information */}
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(post.published_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{post.author.name}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
                  <Link 
                    href={`/blog/${post.slug}`}
                    data-testid={`related-post-title-${post.slug}`}
                    className="hover:text-accent transition-colors"
                  >
                    {post.title}
                  </Link>
                </h3>

                {/* Excerpt */}
                <p className="text-gray-300 mb-4 line-clamp-2 text-sm leading-relaxed" data-testid={`related-post-excerpt-${post.slug}`}>
                  {post.excerpt}
                </p>

                {/* Read more link */}
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group text-sm"
                  data-testid={`related-post-link-${post.slug}`}
                >
                  <span>Read More</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}