'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, List } from 'lucide-react'

interface TocItem {
  id: string
  text: string
  level: number
  element?: Element
}

interface TableOfContentsProps {
  content: string
  className?: string
}

export default function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeId, setActiveId] = useState<string>('')

  // Extract headings from HTML content
  useEffect(() => {
    if (!content) return

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    // Find all headings (h1-h6)
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
    
    const items: TocItem[] = Array.from(headings).map((heading, index) => {
      const level = parseInt(heading.tagName.slice(1))
      const text = heading.textContent || ''
      
      // Generate a unique ID if it doesn't have one
      let id = heading.id
      if (!id) {
        id = `heading-${index}-${text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`
      }
      
      return {
        id,
        text,
        level,
      }
    })

    setTocItems(items)
  }, [content])

  // Add IDs to actual headings in the rendered content and set up intersection observer
  useEffect(() => {
    if (tocItems.length === 0) return

    // Add IDs to headings in the actual rendered content
    setTimeout(() => {
      const contentElement = document.querySelector('[data-testid="post-content"]')
      if (!contentElement) return

      const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      headings.forEach((heading, index) => {
        if (index < tocItems.length) {
          heading.id = tocItems[index].id
        }
      })

      // Set up intersection observer for active section highlighting
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id)
            }
          })
        },
        {
          rootMargin: '-80px 0px -80% 0px',
          threshold: 0.1,
        }
      )

      headings.forEach((heading) => {
        observer.observe(heading)
      })

      return () => {
        headings.forEach((heading) => {
          observer.unobserve(heading)
        })
      }
    }, 100)
  }, [tocItems])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80 // Account for fixed header
      const elementPosition = element.offsetTop - offset
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }

  // Don't render if no headings found
  if (tocItems.length === 0) return null

  return (
    <div className={`bg-transparent border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-white">Table of Contents</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-white transition-colors"
          data-testid="toc-toggle"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <nav className="space-y-1" data-testid="toc-navigation">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={`
                block w-full text-left py-2 px-3 rounded-lg transition-colors text-sm
                ${item.level === 1 ? 'font-semibold' : ''}
                ${item.level === 2 ? 'ml-0' : ''}
                ${item.level === 3 ? 'ml-4' : ''}
                ${item.level === 4 ? 'ml-8' : ''}
                ${item.level === 5 ? 'ml-12' : ''}
                ${item.level === 6 ? 'ml-16' : ''}
                ${activeId === item.id
                  ? 'bg-accent/20 border-l-2 border-accent text-accent'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-white'
                }
              `}
              data-testid={`toc-item-${item.id}`}
            >
              {item.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}