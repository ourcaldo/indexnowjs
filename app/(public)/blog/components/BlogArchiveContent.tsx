'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, TrendingUp, Zap } from 'lucide-react'
import { BLOG_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

// Blog components
import BlogCard from '@/components/blog/BlogCard'
import BlogFilters from '@/components/blog/BlogFilters'
import BlogPagination from '@/components/blog/BlogPagination'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  tags: string[]
  category: string
  category_name?: string
  post_type: string
  author: {
    name: string
    avatar_url?: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
  count?: number
}

interface PaginationData {
  current_page: number
  per_page: number
  total_posts: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
}

interface BlogResponse {
  posts: BlogPost[]
  pagination: PaginationData
  filters: {
    tag: string | null
    category: string | null
    search: string | null
  }
}

export default function BlogArchiveContent() {
  const { user, siteSettings, handleAuthAction } = usePageData()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])

  // Navigation configuration for the header
  const navigation = [
    {
      label: 'Features',
      href: '/#features'
    },
    {
      label: 'Pricing',
      href: '/pricing'
    },
    {
      label: 'Blog',
      href: '/blog',
      isActive: true
    },
    {
      label: 'FAQ',
      href: '/faq'
    },
    {
      label: 'Contact',
      href: '/contact'
    }
  ]

  const fetchPosts = useCallback(async (page: number = 1, search: string = '', tag: string | null = null, category: string | null = null) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      if (search) params.append('search', search)
      if (tag) params.append('tag', tag)
      if (category) params.append('category', category)

      const response = await fetch(BLOG_ENDPOINTS.POSTS_WITH_PARAMS(params), {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch blog posts')
      }

      const data: BlogResponse = await response.json()

      setPosts(data.posts)
      setPagination(data.pagination)

      // Extract unique tags from posts for filter dropdown
      const tags = new Set<string>()
      data.posts.forEach(post => {
        post.tags.forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags).sort())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch categories on component mount
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(BLOG_ENDPOINTS.CATEGORIES, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchPosts(currentPage, searchQuery, selectedTag, selectedCategory)
  }, [fetchPosts, currentPage, searchQuery, selectedTag, selectedCategory])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleTagFilter = (tag: string | null) => {
    setSelectedTag(tag)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden bg-background">
      <Background />
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="page"
        currentPage="blog"
      />

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">INSIGHTS</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white" data-testid="blog-hero-title">
              SEO Insights & Strategies
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed" data-testid="blog-hero-description">
              Discover expert insights on rank tracking, search engine optimization, and digital marketing strategies to boost your website's performance.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-5 h-5 text-info" />
                <span>SEO Strategies</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-5 h-5 text-info" />
                <span>Rank Tracking Tips</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-5 h-5 text-info" />
                <span>Expert Insights</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Filters */}
            <BlogFilters
              onSearch={handleSearch}
              onTagFilter={handleTagFilter}
              onCategoryFilter={handleCategoryFilter}
              currentSearch={searchQuery}
              currentTag={selectedTag || ''}
              currentCategory={selectedCategory || ''}
              availableTags={availableTags}
              availableCategories={availableCategories}
              className="mb-12"
            />

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" data-testid="blog-loading">
                {[...Array(12)].map((_, index) => (
                  <div key={index} className="bg-muted/10 border border-border rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[16/10] bg-muted/20"></div>
                    <div className="p-6">
                      <div className="h-4 bg-muted/20 rounded mb-3"></div>
                      <div className="h-6 bg-muted/20 rounded mb-3"></div>
                      <div className="h-4 bg-muted/20 rounded mb-2"></div>
                      <div className="h-4 bg-muted/20 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-20" data-testid="blog-error">
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Posts</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <button
                    onClick={() => fetchPosts(currentPage, searchQuery, selectedTag)}
                    className="bg-destructive hover:bg-destructive/90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* No Posts State */}
            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-20" data-testid="blog-no-posts">
                <BookOpen className="w-16 h-16 text-muted-foreground/70 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Posts Found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || selectedTag 
                    ? "No posts match your current filters. Try adjusting your search criteria."
                    : "No blog posts have been published yet. Check back soon for exciting content!"
                  }
                </p>
                {(searchQuery || selectedTag) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedTag(null)
                      setCurrentPage(1)
                    }}
                    className="text-info hover:text-info/90 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Blog Posts Grid */}
            {!loading && !error && posts.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12" data-testid="blog-posts-grid">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && (
                  <BlogPagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    className="mt-16"
                  />
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}