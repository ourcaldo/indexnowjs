'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { apiRequest } from '@/lib/core/queryClient'
import { useApiError } from '@/hooks/useApiError'
import { ErrorState } from '@/components/shared/ErrorState'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { DomainSelectionStep } from './DomainSelectionStep'
import { KeywordConfigurationStep } from './KeywordConfigurationStep'

interface AddKeywordModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

function AddKeywordModal({ open, onClose, onSuccess }: AddKeywordModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { handleApiError } = useApiError()
  
  // Form state
  const [step, setStep] = useState(1)
  const [selectedDomain, setSelectedDomain] = useState('')
  const [keywordText, setKeywordText] = useState('')
  const [deviceType, setDeviceType] = useState('desktop')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Fetch domains
  const { data: domainsData, error: domainsError, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.DOMAINS],
    queryFn: async () => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.DOMAINS)
    },
    enabled: open
  })

  // Fetch countries
  const { data: countriesData, error: countriesError, isLoading: countriesLoading, refetch: refetchCountries } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.COUNTRIES],
    queryFn: async () => {
      return await apiRequest(RANK_TRACKING_ENDPOINTS.COUNTRIES)
    },
    enabled: open
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
      handleClose()
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/indexnow/overview')
      }
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

  const handleNext = () => {
    if (!selectedDomain) {
      setErrors({ ...errors, domain: 'Please select a domain' })
      return
    }
    setErrors({})
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleChangeDomain = () => {
    setStep(1)
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

  const handleClose = () => {
    // Reset all states
    setStep(1)
    setSelectedDomain('')
    setKeywordText('')
    setDeviceType('desktop')
    setSelectedCountry('')
    setTags([])
    setErrors({})
    onClose()
  }

  const keywordsList = getKeywordsList()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0" data-testid="modal-add-keyword">
        {/* Header - Compact */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-lg sm:text-xl">
            Add Keywords to Track
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add keywords to monitor their search rankings and performance
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator - Compact */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 bg-secondary/30">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm ${step >= 1 ? 'font-medium bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary-foreground text-primary' : 'bg-secondary'}`}>
              1
            </span>
            <span className="hidden sm:inline">Select Domain</span>
            <span className="sm:hidden">Domain</span>
          </div>
          <div className={`w-6 sm:w-8 h-px ${step >= 2 ? 'bg-primary' : 'bg-border'}`}></div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm ${step >= 2 ? 'font-medium bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary-foreground text-primary' : 'bg-secondary'}`}>
              2
            </span>
            <span className="hidden sm:inline">Add Keywords</span>
            <span className="sm:hidden">Keywords</span>
          </div>
        </div>

        {/* Content - Compact with better scrolling */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-5 py-4">
          {domainsLoading || countriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading data...</p>
              </div>
            </div>
          ) : domainsError ? (
            <ErrorState
              title="Failed to load domains"
              message={domainsError instanceof Error ? domainsError.message : 'An error occurred while loading domains'}
              onRetry={refetchDomains}
            />
          ) : countriesError ? (
            <ErrorState
              title="Failed to load countries"
              message={countriesError instanceof Error ? countriesError.message : 'An error occurred while loading countries'}
              onRetry={refetchCountries}
            />
          ) : (
            <>
              {step === 1 && (
                <DomainSelectionStep
                  domains={domains}
                  selectedDomain={selectedDomain}
                  onDomainSelect={setSelectedDomain}
                  onNext={handleNext}
                />
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <KeywordConfigurationStep
                    domains={domains}
                    countries={countries}
                    selectedDomain={selectedDomain}
                    keywordText={keywordText}
                    deviceType={deviceType}
                    selectedCountry={selectedCountry}
                    tags={tags}
                    errors={errors}
                    onKeywordTextChange={setKeywordText}
                    onDeviceTypeChange={setDeviceType}
                    onCountryChange={setSelectedCountry}
                    onTagsChange={setTags}
                    onBack={handleBack}
                    onChangeDomain={handleChangeDomain}
                  />

                  {/* Submit Button - Compact */}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button 
                      onClick={handleSubmitKeywords}
                      disabled={!selectedDomain || keywordsList.length === 0 || !selectedCountry || addKeywordsMutation.isPending}
                      className="flex-1 h-9"
                      data-testid="button-submit-keywords"
                    >
                      {addKeywordsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding Keywords...
                        </>
                      ) : (
                        <>Add {keywordsList.length} Keyword{keywordsList.length !== 1 ? 's' : ''}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddKeywordModal
export { AddKeywordModal }
