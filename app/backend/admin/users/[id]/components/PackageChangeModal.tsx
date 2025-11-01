'use client'

import { X } from 'lucide-react'

interface PricingTier {
  promo_price: number
  regular_price: number
  period_label: string
  paddle_price_id?: string
}

interface Package {
  id: string
  name: string
  slug: string
  description: string
  currency: string
  billing_period: string
  pricing_tiers?: {
    monthly?: PricingTier
    annual?: PricingTier
  }
}

interface PackageChangeModalProps {
  isOpen: boolean
  availablePackages: Package[]
  selectedPackageId: string
  changePackageLoading: boolean
  onClose: () => void
  onPackageSelect: (packageId: string) => void
  onSubmit: () => void
}

export function PackageChangeModal({
  isOpen,
  availablePackages,
  selectedPackageId,
  changePackageLoading,
  onClose,
  onPackageSelect,
  onSubmit
}: PackageChangeModalProps) {
  if (!isOpen) return null

  const getPackagePrice = (pkg: Package): string => {
    const billingPeriod = pkg.billing_period || 'monthly'
    
    // Use flat USD pricing structure (Paddle handles currency conversion)
    const tierPricing = pkg.pricing_tiers?.[billingPeriod as 'monthly' | 'annual']
    
    if (!tierPricing) {
      return 'Free'
    }
    
    const price = tierPricing.promo_price ?? tierPricing.regular_price
    
    if (price === null || price === undefined || price === 0) {
      return 'Free'
    }
    
    return `$${price.toFixed(2)}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Change Package</h2>
            <p className="text-sm text-muted-foreground mt-1">Select a new package for this user</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {availablePackages.map((pkg) => (
              <label
                key={pkg.id}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPackageId === pkg.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  value={pkg.id}
                  checked={selectedPackageId === pkg.id}
                  onChange={(e) => onPackageSelect(e.target.value)}
                  className="sr-only"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-foreground">{pkg.name}</h3>
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                        pkg.slug === 'free' ? 'bg-muted/10 text-muted-foreground border-muted/20' :
                        pkg.slug === 'premium' ? 'bg-accent/10 text-accent border-accent/20' :
                        pkg.slug === 'pro' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted/10 text-muted-foreground border-muted/20'
                      }`}>
                        {pkg.slug}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="font-bold text-foreground">
                      {getPackagePrice(pkg)}
                    </p>
                    <p className="text-xs text-muted-foreground">per {pkg.billing_period || 'monthly'}</p>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedPackageId === pkg.id && (
                  <div className="mt-3 p-2 bg-accent/10 rounded border border-accent/20">
                    <p className="text-xs text-accent font-medium">✓ Selected Package</p>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!selectedPackageId || changePackageLoading}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changePackageLoading ? 'Changing Package...' : 'Change Package'}
          </button>
        </div>
      </div>
    </div>
  )
}