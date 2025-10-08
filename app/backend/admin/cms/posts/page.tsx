'use client'

import { useEffect, useState } from 'react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { 
  FileText,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  User,
  Tag,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface CMSPost {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  featured_image_url: string | null
  author_id: string
  status: string
  post_type: string
  meta_title: string | null
  meta_description: string | null
  tags: string[]
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
  author_email?: string
}

export default function CMSPosts() {
  const [posts, setPosts] = useState<CMSPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POSTS, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POST_BY_ID(id), {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_POST_STATUS(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Failed to update post status:', error)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesType = typeFilter === 'all' || post.post_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success/10 text-success border-success/20'
      case 'draft':
        return 'bg-muted/10 text-muted-foreground border-muted/20'
      case 'archived':
        return 'bg-warning/10 text-warning border-warning/20'
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4" />
      case 'draft':
        return <Clock className="h-4 w-4" />
      case 'archived':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="text-muted-foreground mt-1">Manage blog posts and content articles</p>
        </div>
        <button 
          onClick={() => window.location.href = '/backend/admin/cms/posts/create'}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{posts.length}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {posts.filter(p => p.status === 'published').length}
              </p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {posts.filter(p => p.status === 'draft').length}
              </p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {posts.filter(p => p.status === 'archived').length}
              </p>
              <p className="text-xs text-muted-foreground">Archived</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="post">Post</option>
              <option value="news">News</option>
              <option value="blog">Blog</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-foreground">Title</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Author</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Type</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Date</th>
                <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-secondary">
                  <td className="py-4 px-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground truncate max-w-xs">
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {post.excerpt || 'No excerpt available'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">/{post.slug}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-accent">
                          {post.author_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{post.author_name || 'Unknown'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                        <span>{post.status}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-muted-foreground capitalize">{post.post_type}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm text-foreground">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-1 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => window.location.href = `/backend/admin/cms/posts/${post.id}/edit`}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                        title="Edit post"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <select
                        value={post.status}
                        onChange={(e) => handleStatusChange(post.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-border rounded focus:ring-1 focus:ring-accent"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No posts found</p>
          </div>
        )}
      </div>
    </div>
  )
}