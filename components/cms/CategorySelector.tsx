
'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string
}

interface CategorySelectorProps {
  selectedCategories: string[] // Array of category IDs
  mainCategory?: string // ID of the main/primary category
  onChange: (selectedCategories: string[], mainCategory?: string) => void
  className?: string
}

export default function CategorySelector({ 
  selectedCategories = [], 
  mainCategory,
  onChange, 
  className = "" 
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'most-used'>('most-used')
  const { addToast } = useToast()

  // Fetch categories from API
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_CATEGORIES, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        // Fallback to default categories if API fails
        const defaultCategories = [
          { id: '1', name: 'Uncategorized', slug: 'uncategorized' },
          { id: '2', name: 'General', slug: 'general' },
          { id: '3', name: 'SEO', slug: 'seo' },
          { id: '4', name: 'Indexing', slug: 'indexing' },
          { id: '5', name: 'Rank Tracking', slug: 'rank-tracking' },
          { id: '6', name: 'Tutorials', slug: 'tutorials' },
          { id: '7', name: 'News', slug: 'news' },
          { id: '8', name: 'Case Studies', slug: 'case-studies' }
        ]
        setCategories(defaultCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Use fallback categories
      const defaultCategories = [
        { id: '1', name: 'Uncategorized', slug: 'uncategorized' },
        { id: '2', name: 'General', slug: 'general' }
      ]
      setCategories(defaultCategories)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    let updatedSelected = [...selectedCategories]
    let updatedMain = mainCategory

    if (selectedCategories.includes(categoryId)) {
      // Remove category
      updatedSelected = updatedSelected.filter(id => id !== categoryId)
      // If this was the main category, set a new main category
      if (mainCategory === categoryId && updatedSelected.length > 0) {
        updatedMain = updatedSelected[0]
      } else if (mainCategory === categoryId) {
        updatedMain = undefined
      }
    } else {
      // Add category
      updatedSelected.push(categoryId)
      // If this is the first category, make it the main category
      if (!mainCategory || selectedCategories.length === 0) {
        updatedMain = categoryId
      }
    }

    onChange(updatedSelected, updatedMain)
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      addToast({
        title: "Error",
        description: "Please enter a category name",
      })
      return
    }

    setIsAddingCategory(true)
    try {
      const response = await fetch(ADMIN_ENDPOINTS.CMS_CATEGORIES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newCategoryName.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newCategory = data.category
        setCategories(prev => [...prev, newCategory])
        setNewCategoryName('')
        
        // Auto-select the new category
        const updatedSelected = [...selectedCategories, newCategory.id]
        const updatedMain = mainCategory || newCategory.id
        onChange(updatedSelected, updatedMain)

        addToast({
          title: "Success",
          description: `Category "${newCategory.name}" created successfully`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
      })
    } finally {
      setIsAddingCategory(false)
    }
  }

  // Get most used categories (categories with posts or commonly used ones)
  const getMostUsedCategories = () => {
    const commonCategories = ['general', 'seo', 'tutorials', 'news']
    return categories.filter(cat => 
      commonCategories.includes(cat.slug.toLowerCase()) || 
      selectedCategories.includes(cat.id)
    )
  }

  const displayCategories = activeTab === 'most-used' ? getMostUsedCategories() : categories

  return (
    <div className={className}>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Categories
        </label>
        
        {/* WordPress-style Category Box */}
        <div className="border border-border rounded-lg bg-card">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-accent text-accent bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              All Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('most-used')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'most-used'
                  ? 'border-accent text-accent bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Most Used
            </button>
          </div>

          {/* Category List */}
          <div className="p-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading categories...</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {displayCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-secondary p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-1"
                    />
                    <span className="text-foreground flex-1">{category.name}</span>
                  </label>
                ))}
                
                {displayCategories.length === 0 && (
                  <div className="text-sm text-muted-foreground py-2">
                    No categories available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add New Category Section */}
          <div className="border-t border-border p-3 bg-secondary">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                + Add New Category
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCategory()
                    }
                  }}
                  placeholder="New category name"
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={isAddingCategory || !newCategoryName.trim()}
                  className="w-full px-3 py-2 text-sm bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingCategory ? 'Adding Category...' : 'Add New Category'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Category Selection */}
        {selectedCategories.length > 1 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Primary Category
            </label>
            <select
              value={mainCategory || ''}
              onChange={(e) => {
                const categoryId = e.target.value
                let updatedSelected = [...selectedCategories]
                if (!selectedCategories.includes(categoryId)) {
                  updatedSelected.push(categoryId)
                }
                onChange(updatedSelected, categoryId)
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-transparent bg-card text-foreground"
            >
              {categories
                .filter(cat => selectedCategories.includes(cat.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The primary category will be used in the URL structure
            </p>
          </div>
        )}
      </div>

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="mt-3 p-3 bg-secondary rounded-lg border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">Selected Categories:</div>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter(cat => selectedCategories.includes(cat.id))
              .map((category) => (
                <span
                  key={category.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    category.id === mainCategory
                      ? 'bg-accent text-white'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  {category.name}
                  {category.id === mainCategory && (
                    <span className="text-xs opacity-75">(Primary)</span>
                  )}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
