'use client'

import { useState } from 'react'
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Tag,
  AlertCircle,
  X,
  Plus,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface Country {
  id: string
  name: string
  iso2_code: string
}

interface KeywordConfigurationStepProps {
  domains: Domain[]
  countries: Country[]
  selectedDomain: string
  keywordText: string
  deviceType: string
  selectedCountry: string
  tags: string[]
  errors: { [key: string]: string }
  onKeywordTextChange: (text: string) => void
  onDeviceTypeChange: (deviceType: string) => void
  onCountryChange: (countryId: string) => void
  onTagsChange: (tags: string[]) => void
  onBack: () => void
  onChangeDomain: () => void
}

export function KeywordConfigurationStep({
  domains,
  countries,
  selectedDomain,
  keywordText,
  deviceType,
  selectedCountry,
  tags,
  errors,
  onKeywordTextChange,
  onDeviceTypeChange,
  onCountryChange,
  onTagsChange,
  onBack,
  onChangeDomain
}: KeywordConfigurationStepProps) {
  const [tagText, setTagText] = useState('')

  const selectedDomainData = domains.find(d => d.id === selectedDomain)
  
  const getKeywordsList = () => {
    return keywordText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  const keywordsList = getKeywordsList()

  const handleAddTag = () => {
    if (tagText.trim() && !tags.includes(tagText.trim())) {
      onTagsChange([...tags, tagText.trim()])
      setTagText('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-4">
      {/* Selected Domain Info - Compact */}
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/20">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {selectedDomainData?.display_name || selectedDomainData?.domain_name}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onChangeDomain}
          className="h-7 px-2 text-xs flex-shrink-0"
          data-testid="button-change-domain"
        >
          Change
        </Button>
      </div>

      {/* Device Type & Country - Compact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Device Type - Compact */}
        <div className="space-y-1.5">
          <Label className="text-sm">Device Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-sm transition-all ${
                deviceType === 'desktop' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background border-border hover:border-primary/50'
              }`}
              onClick={() => onDeviceTypeChange('desktop')}
              data-testid="button-device-desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="font-medium">Desktop</span>
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-sm transition-all ${
                deviceType === 'mobile' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background border-border hover:border-primary/50'
              }`}
              onClick={() => onDeviceTypeChange('mobile')}
              data-testid="button-device-mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="font-medium">Mobile</span>
            </button>
          </div>
        </div>

        {/* Country - Compact */}
        <div className="space-y-1.5">
          <Label htmlFor="country-select" className="text-sm">Country</Label>
          <Select value={selectedCountry} onValueChange={onCountryChange}>
            <SelectTrigger 
              id="country-select"
              className={`w-full ${selectedCountry ? 'border-primary' : ''}`}
              data-testid="select-country"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select country" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name} ({country.iso2_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-1" data-testid="error-country">
              <AlertCircle className="w-3 h-3" />
              {errors.country}
            </p>
          )}
        </div>
      </div>

      {/* Keywords - Compact */}
      <div className="space-y-2">
        <div>
          <Label htmlFor="keywords-textarea" className="text-sm">Keywords</Label>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Enter one keyword per line. Each keyword will consume 1 quota.
          </p>
        </div>
        <Textarea
          id="keywords-textarea"
          placeholder={`keyword 1\nkeyword 2\nkeyword 3`}
          rows={6}
          value={keywordText}
          onChange={(e) => onKeywordTextChange(e.target.value)}
          className="resize-none"
          data-testid="textarea-keywords"
        />
        {keywordsList.length > 0 && (
          <div className="text-xs text-muted-foreground" data-testid="text-keyword-count">
            {keywordsList.length} keyword{keywordsList.length !== 1 ? 's' : ''} • {keywordsList.length} quota to be consumed
          </div>
        )}
        {errors.keywords && (
          <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid="error-keywords">
            <AlertCircle className="w-3 h-3" />
            {errors.keywords}
          </div>
        )}
      </div>

      {/* Tags - Compact */}
      <div className="space-y-2">
        <div>
          <Label htmlFor="tag-input" className="text-sm">Tags (Optional)</Label>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Add tags to organize your keywords.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="tag-input"
            placeholder="Add a tag"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            className="flex-1 h-9"
            data-testid="input-tag"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddTag} 
            disabled={!tagText.trim()}
            className="h-9 px-3"
            data-testid="button-add-tag"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <div 
                key={tag} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-secondary border border-border"
                data-testid={`tag-${tag}`}
              >
                <Tag className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{tag}</span>
                <button 
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                  data-testid={`button-remove-tag-${tag}`}
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons - Compact */}
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onBack}
          className="h-9"
          data-testid="button-back"
        >
          Back
        </Button>
      </div>
    </div>
  )
}
