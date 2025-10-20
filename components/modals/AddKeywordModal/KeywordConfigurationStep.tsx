'use client'

import { useState } from 'react'
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Tag,
  AlertCircle,
  Trash2,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
    <div className="space-y-6">
      {/* Selected Domain Info */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium text-foreground">
              Selected Domain: {selectedDomainData?.display_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedDomainData?.domain_name}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onChangeDomain}
            data-testid="button-change-domain"
          >
            Change Domain
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          Keyword Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure your keywords with device type, location, and optional tags.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Type */}
        <div className="space-y-2">
          <Label>Device Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative mr-6">
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  deviceType === 'desktop' 
                    ? 'bg-primary/10 border-primary ring-2 ring-primary' 
                    : 'bg-background border-border hover:border-primary/50'
                }`}
                onClick={() => onDeviceTypeChange('desktop')}
                data-testid="button-device-desktop"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Desktop</span>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary text-primary-foreground">
                <span>Recommended</span>
              </div>
            </div>
            <div
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                deviceType === 'mobile' 
                  ? 'bg-primary/10 border-primary ring-2 ring-primary' 
                  : 'bg-background border-border hover:border-primary/50'
              }`}
              onClick={() => onDeviceTypeChange('mobile')}
              data-testid="button-device-mobile"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">Mobile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label>Country</Label>
          <div
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              selectedCountry 
                ? 'bg-primary/10 border-primary ring-2 ring-primary' 
                : 'bg-background border-border'
            }`}
          >
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <select 
              value={selectedCountry} 
              onChange={(e) => onCountryChange(e.target.value)} 
              className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground cursor-pointer"
              data-testid="select-country"
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.iso2_code})
                </option>
              ))}
            </select>
          </div>
          {errors.country && (
            <p className="text-sm text-destructive flex items-center gap-1" data-testid="error-country">
              <AlertCircle className="w-3 h-3" />
              {errors.country}
            </p>
          )}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-4">
        <div>
          <Label>Keywords</Label>
          <p className="text-sm mt-1 text-muted-foreground">
            Enter one keyword per line. Each keyword + device + country combination will consume 1 quota.
          </p>
        </div>
        <Textarea
          placeholder={`keyword 1\nkeyword 2\nkeyword 3`}
          rows={8}
          value={keywordText}
          onChange={(e) => onKeywordTextChange(e.target.value)}
          data-testid="textarea-keywords"
        />
        {keywordsList.length > 0 && (
          <div className="text-sm text-muted-foreground" data-testid="text-keyword-count">
            {keywordsList.length} keyword(s) to be added • {keywordsList.length} quota will be consumed
          </div>
        )}
        {errors.keywords && (
          <div className="flex items-center gap-2 text-sm text-destructive" data-testid="error-keywords">
            <AlertCircle className="w-4 h-4" />
            {errors.keywords}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <div>
          <Label>Tags (Optional)</Label>
          <p className="text-sm mt-1 text-muted-foreground">
            Add tags to organize and filter your keywords easily.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Add a tag"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              data-testid="input-tag"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleAddTag} 
            disabled={!tagText.trim()}
            data-testid="button-add-tag"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div 
                key={tag} 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-secondary border border-border"
                data-testid={`tag-${tag}`}
              >
                <Tag className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{tag}</span>
                <button 
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                  data-testid={`button-remove-tag-${tag}`}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          onClick={onBack}
          data-testid="button-back"
        >
          Back
        </Button>
      </div>
    </div>
  )
}
