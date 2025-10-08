'use client'

import { useState } from 'react'
import { Calendar, User, Tag, Clock, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PostAuthor {
  name: string
  avatar_url?: string
}

interface PostHeaderProps {
  title: string
  excerpt?: string
  author: PostAuthor
  published_at: string
  tags: string[]
  featured_image_url?: string
  readTime?: number
  className?: string
}

export default function PostHeader({ 
  title, 
  excerpt, 
  author, 
  published_at, 
  tags, 
  featured_image_url, 
  readTime = 5,
  className = '' 
}: PostHeaderProps) {
  const [imageError, setImageError] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: excerpt,
          url: window.location.href
        })
      } catch (err) {
        // User cancelled or share failed, show manual share menu
        setShowShareMenu(!showShareMenu)
      }
    } else {
      setShowShareMenu(!showShareMenu)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowShareMenu(false)
      // You could add a toast notification here
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      setShowShareMenu(false)
    }
  }

  return (
    <div className={`${className}`}>
      {/* Back to Blog Link */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          data-testid="back-to-blog"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog</span>
        </Link>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6" data-testid="post-tags">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-info/20 border border-info/30 text-info"
              data-testid={`post-tag-${tag.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight" data-testid="post-title">
        {title}
      </h1>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-4xl" data-testid="post-excerpt">
          {excerpt}
        </p>
      )}

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-6 mb-8 text-gray-300" data-testid="post-meta">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <span data-testid="post-author">{author.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <time dateTime={published_at} data-testid="post-date">
            {formatDate(published_at)}
          </time>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span data-testid="post-read-time">{readTime} min read</span>
        </div>

        {/* Share Button */}
        <div className="relative ml-auto">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-border rounded-lg transition-colors text-white"
            data-testid="post-share-button"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {/* Share Menu */}
          {showShareMenu && (
            <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-xl z-50 min-w-48">
              <div className="p-2">
                <button
                  onClick={copyToClipboard}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  data-testid="copy-link-button"
                >
                  Copy Link
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  data-testid="share-twitter"
                >
                  Share on Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  data-testid="share-linkedin"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Featured Image */}
      {featured_image_url && !imageError && (
        <div className="mb-12">
          <div className="aspect-[16/9] relative overflow-hidden rounded-2xl bg-muted/50">
            <img
              src={featured_image_url}
              alt={title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              data-testid="post-featured-image"
            />
          </div>
        </div>
      )}
    </div>
  )
}