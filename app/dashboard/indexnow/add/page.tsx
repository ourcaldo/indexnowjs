'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { apiRequest } from '@/lib/core/queryClient'
import { ErrorState } from '@/components/shared/ErrorState'
import { useApiError } from '@/hooks/useApiError'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// Simple UI Components using project color scheme
const Card = ({ children, className = '' }: any) => (
  <div className={`p-6 rounded-lg bg-background border border-border ${className}`}>
    {children}
  </div>
)

const Button = ({ children, variant = 'default', size = 'default', className = '', onClick, disabled, loading, ...props }: any) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantClasses: { [key: string]: string } = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-foreground border border-border',
    outline: 'bg-transparent text-muted-foreground border border-border',
    ghost: 'bg-transparent text-muted-foreground',
    destructive: 'bg-destructive text-destructive-foreground'
  }
  
  const sizes: { [key: string]: string } = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  }
  
  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}

const Input = ({ placeholder, className = '', value, onChange, ...props }: any) => (
  <input
    className={`flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-background border border-border text-foreground focus-visible:ring-ring ${className}`}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
)

const Textarea = ({ placeholder, className = '', value, onChange, rows = 4, ...props }: any) => (
  <textarea
    className={`flex w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none bg-background border border-border text-foreground focus-visible:ring-ring ${className}`}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, placeholder, disabled, className = '', ...props }: any) => (
  <select 
    className={`flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 bg-background border border-border text-foreground focus-visible:ring-ring ${className}`}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    disabled={disabled}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
)

const Label = ({ children, className = '' }: any) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground ${className}`}>
    {children}
  </label>
)

const Alert = ({ children, variant = 'default' }: any) => {
  const variantClasses: { [key: string]: string } = {
    default: 'bg-secondary border-border text-foreground',
    destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
    success: 'bg-muted border-border text-foreground'
  }
  
  return (
    <div className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]}`}>
      {children}
    </div>
  )
}

export default function AddKeywords() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { handleApiError } = useApiError()
  
  // Form state
  const [step, setStep] = useState(1) // 1: Domain, 2: Keywords
  const [selectedDomain, setSelectedDomain] = useState('')
  const [newDomainName, setNewDomainName] = useState('')
  const [keywordText, setKeywordText] = useState('')
  const [deviceType, setDeviceType] = useState('desktop')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [tagText, setTagText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Fetch domains
  const { data: domainsData, error: domainsError, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.DOMAINS],
    queryFn: async () => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.DOMAINS)
    }
  })

  // Fetch countries
  const { data: countriesData, error: countriesError, isLoading: countriesLoading, refetch: refetchCountries } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.COUNTRIES],
    queryFn: async () => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.COUNTRIES)
    }
  })

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async (domainData: { domain_name: string; display_name?: string }) => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.DOMAINS, {
        method: 'POST',
        body: JSON.stringify(domainData)
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RANK_TRACKING_ENDPOINTS.DOMAINS] })
      setSelectedDomain(data.id)
      setNewDomainName('')
      setErrors({ ...errors, domain: '' })
    },
    onError: handleApiError
  })

  // Add keywords mutation
  const addKeywordsMutation = useMutation({
    mutationFn: async (keywordData: any) => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.KEYWORDS, {
        method: 'POST',
        body: JSON.stringify(keywordData)
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RANK_TRACKING_ENDPOINTS.KEYWORDS] })
      router.push('/dashboard/indexnow/overview')
    },
    onError: handleApiError
  })

  const domains = domainsData?.data?.data || []
  const countries = countriesData?.data?.data || []

  // Parse keywords from textarea
  const getKeywordsList = () => {
    return keywordText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  const handleCreateDomain = () => {
    if (!newDomainName.trim()) {
      setErrors({ ...errors, domain: 'Domain name is required' })
      return
    }

    createDomainMutation.mutate({
      domain_name: newDomainName.trim(),
      display_name: newDomainName.trim()
    })
  }

  const handleAddTag = () => {
    if (tagText.trim() && !tags.includes(tagText.trim())) {
      setTags([...tags, tagText.trim()])
      setTagText('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmitKeywords = () => {
    const keywordsList = getKeywordsList()
    
    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!selectedDomain) newErrors.domain = 'Please select a domain'
    if (keywordsList.length === 0) newErrors.keywords = 'Please enter at least one keyword'
    if (!selectedCountry) newErrors.country = 'Please select a country'
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      addKeywordsMutation.mutate({
        domain_id: selectedDomain,
        keywords: keywordsList,
        device_type: deviceType,
        country_id: selectedCountry,
        tags: tags
      })
    }
  }

  const keywordsList = getKeywordsList()

  if (domainsLoading || countriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (domainsError) {
    return (
      <ErrorState
        title="Failed to load domains"
        message={domainsError instanceof Error ? domainsError.message : 'An error occurred while loading domains'}
        onRetry={refetchDomains}
      />
    )
  }

  if (countriesError) {
    return (
      <ErrorState
        title="Failed to load countries"
        message={countriesError instanceof Error ? countriesError.message : 'An error occurred while loading countries'}
        onRetry={refetchCountries}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Add Keywords to Track
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Add keywords to monitor their search rankings and performance
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 1 ? 'font-medium bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary-foreground text-primary' : 'bg-transparent text-muted-foreground'}`}>
            1
          </span>
          Select Domain
        </div>
        <div className={`w-8 h-px ${step >= 2 ? 'bg-primary' : 'bg-border'}`}></div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 2 ? 'font-medium bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary-foreground text-primary' : 'bg-transparent text-muted-foreground'}`}>
            2
          </span>
          Add Keywords
        </div>
      </div>

      {step === 1 && (
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Select or Add Domain
              </h2>
              <p className="text-muted-foreground">
                Choose an existing domain or add a new one to track keywords for.
              </p>
            </div>

            {/* Existing Domains */}
            {domains.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Existing Domains</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domains.map((domain: any) => (
                    <div
                      key={domain.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedDomain === domain.id ? 'ring-2 bg-primary/10 border-primary ring-primary' : 'bg-background border-border'
                      }`}
                      onClick={() => setSelectedDomain(domain.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">
                            {domain.display_name || domain.domain_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {domain.domain_name}
                          </div>
                        </div>
                        {selectedDomain === domain.id && (
                          <CheckCircle2 className="w-5 h-5 ml-auto text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Domain */}
            <div className={`space-y-4 ${domains.length > 0 ? 'border-t border-border pt-6' : ''}`}>
              <h3 className="font-medium text-foreground">Add New Domain</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="example.com"
                    value={newDomainName}
                    onChange={(e: any) => setNewDomainName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateDomain} 
                  disabled={!newDomainName.trim()}
                  loading={createDomainMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </div>
              {errors.domain && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.domain}
                </Alert>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedDomain}
              >
                Continue to Keywords
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Selected Domain Info */}
          <Card>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-foreground">
                  Selected Domain: {domains.find((d: any) => d.id === selectedDomain)?.display_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {domains.find((d: any) => d.id === selectedDomain)?.domain_name}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="ml-auto">
                Change Domain
              </Button>
            </div>
          </Card>

          <Card>
            <div className="space-y-6">
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
                          deviceType === 'desktop' ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'bg-background border-border'
                        }`}
                        onClick={() => setDeviceType('desktop')}
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
                        deviceType === 'mobile' ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'bg-background border-border'
                      }`}
                      onClick={() => setDeviceType('mobile')}
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
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all min-h-[48px] ${
                      selectedCountry ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'bg-background border-border'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                    <Select 
                      value={selectedCountry} 
                      onValueChange={setSelectedCountry} 
                      placeholder="Select country"
                      className="border-0 bg-transparent flex-1 focus:ring-0"
                    >
                      {countries.map((country: any) => (
                        <option key={country.id} value={country.id}>
                          {country.name} ({country.iso2_code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country}</p>
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
                  placeholder={`keyword 1
keyword 2  
keyword 3`}
                  rows={8}
                  value={keywordText}
                  onChange={(e: any) => setKeywordText(e.target.value)}
                />
                {keywordsList.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {keywordsList.length} keyword(s) to be added • {keywordsList.length} quota will be consumed
                  </div>
                )}
                {errors.keywords && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {errors.keywords}
                  </Alert>
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
                      onChange={(e: any) => setTagText(e.target.value)}
                      onKeyPress={(e: any) => e.key === 'Enter' && handleAddTag()}
                    />
                  </div>
                  <Button variant="outline" onClick={handleAddTag} disabled={!tagText.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-secondary border border-border">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground">{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmitKeywords}
                  disabled={!selectedDomain || keywordsList.length === 0 || !selectedCountry}
                  loading={addKeywordsMutation.isPending}
                  className="flex-1"
                >
                  Add {keywordsList.length} Keyword{keywordsList.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}