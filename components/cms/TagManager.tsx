'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

interface TagManagerProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export default function TagManager({ 
  tags, 
  onChange, 
  placeholder = "Add tags...",
  className = ""
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
    }
  }

  return (
    <div className={className}>
      <div className="border border-border rounded-lg p-3 min-h-[42px] focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-sm rounded-md"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:bg-accent/20 rounded-full p-0.5 transition-colors"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent placeholder-muted-foreground text-sm"
          />
        </div>
      </div>
      
      {inputValue.trim() && (
        <div className="mt-2">
          <button
            onClick={() => addTag(inputValue)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent/5 rounded transition-colors"
            type="button"
          >
            <Plus className="h-3 w-3" />
            Add "{inputValue.trim()}"
          </button>
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        Press Enter to add tags. Use backspace to remove the last tag.
      </div>
    </div>
  )
}