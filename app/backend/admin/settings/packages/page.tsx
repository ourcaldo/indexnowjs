'use client'

import { useEffect, useState } from 'react'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import { 
  Package,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Save,
  X,
  Star,
  Clock,
  Users,
  Zap,
  Search
} from 'lucide-react'

interface CurrencyPricing {
  regular_price: number
  promo_price: number
  period_label: string
}

interface PricingTier {
  period: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  IDR: CurrencyPricing
  USD: CurrencyPricing
}

interface LegacyPricingTier {
  period: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  period_label: string
  regular_price: number
  promo_price: number
}

interface PaymentPackage {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: Record<string, any>
  is_active: boolean
  is_popular?: boolean
  sort_order: number
  pricing_tiers?: PricingTier[]
  created_at: string
  updated_at: string
}

export default function PackageManagement() {
  const [packages, setPackages] = useState<PaymentPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<PaymentPackage | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.PACKAGES, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (packageData: Partial<PaymentPackage>) => {
    try {
      const url = packageData.id 
        ? ADMIN_ENDPOINTS.PACKAGE_BY_ID(packageData.id)
        : ADMIN_ENDPOINTS.PACKAGES
      
      const method = packageData.id ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(packageData),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: `Package ${packageData.id ? 'updated' : 'created'} successfully!` })
        fetchPackages()
        setEditingPackage(null)
        setIsCreating(false)
      } else {
        setMessage({ type: 'error', text: 'Failed to save package' })
      }
    } catch (error) {
      console.error('Failed to save package:', error)
      setMessage({ type: 'error', text: 'Failed to save package' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    try {
      const response = await fetch(ADMIN_ENDPOINTS.PACKAGE_BY_ID(id), {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Package deleted successfully!' })
        fetchPackages()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete package' })
      }
    } catch (error) {
      console.error('Failed to delete package:', error)
      setMessage({ type: 'error', text: 'Failed to delete package' })
    }
  }

  const PackageForm = ({ packageData, onSave, onCancel }: {
    packageData: Partial<PaymentPackage>
    onSave: (packageData: Partial<PaymentPackage>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState<Partial<PaymentPackage>>({
      ...packageData,
      features: packageData.features || [],
      quota_limits: packageData.quota_limits || {},
      pricing_tiers: packageData.pricing_tiers || {}
    })

    const updateField = (field: keyof PaymentPackage, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    const updateQuotaLimit = (key: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        quota_limits: { ...prev.quota_limits, [key]: value }
      }))
    }

    const updatePricingTierField = (period: string, currency: 'IDR' | 'USD', field: keyof CurrencyPricing, value: any) => {
      const currentTiers = (formData.pricing_tiers as any) || {}
      
      // Ensure period object exists
      if (!currentTiers[period]) {
        currentTiers[period] = {}
      }
      
      // Ensure currency object exists for this period
      if (!currentTiers[period][currency]) {
        currentTiers[period][currency] = { period_label: period, regular_price: 0, promo_price: 0 }
      }
      
      // Update the specific field
      const updatedTiers = {
        ...currentTiers,
        [period]: {
          ...currentTiers[period],
          [currency]: {
            ...currentTiers[period][currency],
            [field]: value
          }
        }
      }
      
      setFormData(prev => ({ ...prev, pricing_tiers: updatedTiers }))
    }

    const addFeature = () => {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), '']
      }))
    }

    const updateFeature = (index: number, value: string) => {
      const updatedFeatures = [...(formData.features || [])]
      updatedFeatures[index] = value
      setFormData(prev => ({ ...prev, features: updatedFeatures }))
    }

    const removeFeature = (index: number) => {
      const updatedFeatures = (formData.features || []).filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, features: updatedFeatures }))
    }

    const initializePricingTiers = () => {
      const defaultTiers = {
        monthly: {
          IDR: { period_label: 'Monthly', regular_price: 0, promo_price: 0 },
          USD: { period_label: 'Monthly', regular_price: 0, promo_price: 0 }
        },
        annual: {
          IDR: { period_label: 'Annual', regular_price: 0, promo_price: 0 },
          USD: { period_label: 'Annual', regular_price: 0, promo_price: 0 }
        }
      }
      setFormData(prev => ({ ...prev, pricing_tiers: defaultTiers }))
    }

    useEffect(() => {
      if (formData.slug !== 'free' && (!formData.pricing_tiers || Object.keys(formData.pricing_tiers).length === 0)) {
        initializePricingTiers()
      }
    }, [formData.slug])

    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Package Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) => updateField('slug', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="premium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Enhanced features for professionals"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
            <select
              value={formData.currency || 'IDR'}
              onChange={(e) => updateField('currency', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="IDR">IDR (Indonesian Rupiah)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sort Order</label>
            <input
              type="number"
              value={formData.sort_order || 0}
              onChange={(e) => updateField('sort_order', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Quota Limits */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
              Quota Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Service Accounts</label>
                <input
                  type="number"
                  value={formData.quota_limits?.service_accounts || 0}
                  onChange={(e) => updateQuotaLimit('service_accounts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="1 (use -1 for unlimited)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Daily URLs</label>
                <input
                  type="number"
                  value={formData.quota_limits?.daily_urls || 0}
                  onChange={(e) => updateQuotaLimit('daily_urls', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="50 (use -1 for unlimited)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Concurrent Jobs</label>
                <input
                  type="number"
                  value={formData.quota_limits?.concurrent_jobs || 0}
                  onChange={(e) => updateQuotaLimit('concurrent_jobs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="flex items-center gap-2">
                    Keywords Limit
                    <span className="px-2 py-1 text-xs bg-success/10 text-success rounded-full border border-success/20">
                      Rank Tracker
                    </span>
                  </span>
                </label>
                <input
                  type="number"
                  value={formData.quota_limits?.keywords_limit || 0}
                  onChange={(e) => updateQuotaLimit('keywords_limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="100 (use -1 for unlimited)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of keywords that can be tracked simultaneously for rank monitoring
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Tiers (only for paid packages) */}
          {formData.slug !== 'free' && (
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                Pricing Tiers
              </h3>
              <div className="space-y-6">
                {[
                  { period: 'monthly', label: 'Monthly', defaultLabel: 'Monthly' },
                  { period: 'annual', label: 'Annual', defaultLabel: 'Annual' }
                ].map((periodInfo, index) => {
                  const tierData = (formData.pricing_tiers as any)?.[periodInfo.period] || {}
                  
                  return (
                    <div key={periodInfo.period} className="p-6 bg-secondary rounded-lg border border-border">
                      {/* Period Header */}
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Clock className="h-5 w-5 text-accent" />
                          {periodInfo.label} Billing
                        </h4>
                      </div>

                      {/* Currency Pricing Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* IDR Pricing */}
                        <div className="bg-white p-4 rounded-lg border border-border">
                          <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="bg-success text-white px-2 py-1 text-xs rounded">IDR</span>
                            Indonesian Rupiah
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Period Label</label>
                              <input
                                type="text"
                                value={tierData.IDR?.period_label || periodInfo.defaultLabel}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'IDR', 'period_label', e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder={periodInfo.defaultLabel}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Regular Price</label>
                              <input
                                type="number"
                                value={tierData.IDR?.regular_price || 0}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'IDR', 'regular_price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder="50000"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Promo Price</label>
                              <input
                                type="number"
                                value={tierData.IDR?.promo_price || 0}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'IDR', 'promo_price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder="25000"
                              />
                            </div>
                          </div>
                        </div>

                        {/* USD Pricing */}
                        <div className="bg-white p-4 rounded-lg border border-border">
                          <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="bg-accent text-white px-2 py-1 text-xs rounded">USD</span>
                            US Dollar
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Period Label</label>
                              <input
                                type="text"
                                value={tierData.USD?.period_label || periodInfo.defaultLabel}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'USD', 'period_label', e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder={periodInfo.defaultLabel}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Regular Price</label>
                              <input
                                type="number"
                                value={tierData.USD?.regular_price || 0}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'USD', 'regular_price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder="10"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Promo Price</label>
                              <input
                                type="number"
                                value={tierData.USD?.promo_price || 0}
                                onChange={(e) => updatePricingTierField(periodInfo.period, 'USD', 'promo_price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                                placeholder="5"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                Features
              </h3>
              <button
                onClick={addFeature}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Feature</span>
              </button>
            </div>
            <div className="space-y-2">
              {(formData.features || []).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Feature description"
                  />
                  <button
                    onClick={() => removeFeature(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active || false}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="ml-2 text-sm text-foreground">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_popular || false}
                onChange={(e) => updateField('is_popular', e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="ml-2 text-sm text-foreground">Popular</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Package Management</h1>
          <p className="text-muted-foreground mt-1">Manage subscription packages and pricing tiers</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Package</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-success/10 text-success border-success/20' 
            : 'bg-destructive/10 text-destructive border-destructive/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <PackageForm
          packageData={{}}
          onSave={handleSave}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Packages List */}
      <div className="space-y-4">
        {packages.map((pkg) => (
          <div key={pkg.id}>
            {editingPackage?.id === pkg.id ? (
              <PackageForm
                packageData={editingPackage}
                onSave={handleSave}
                onCancel={() => setEditingPackage(null)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                        {pkg.is_popular && (
                          <span className="px-2 py-1 text-xs font-medium bg-warning/10 text-warning rounded-full border border-warning/20 flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Popular</span>
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                          pkg.is_active 
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted/50 text-muted-foreground border-muted'
                        }`}>
                          {pkg.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Slug: {pkg.slug}</p>
                      
                      {/* Package Details */}
                      <div className="mt-3 flex items-center flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{pkg.quota_limits?.service_accounts === -1 ? 'Unlimited' : pkg.quota_limits?.service_accounts || 0} Service Accounts</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="h-4 w-4" />
                          <span>{pkg.quota_limits?.daily_urls === -1 ? 'Unlimited' : pkg.quota_limits?.daily_urls || 0} Daily URLs</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{pkg.quota_limits?.concurrent_jobs || 0} Concurrent Jobs</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Search className="h-4 w-4 text-success" />
                          <span>{pkg.quota_limits?.keywords_limit === -1 ? 'Unlimited' : pkg.quota_limits?.keywords_limit || 0} Keywords</span>
                        </div>
                      </div>

                      {/* Features Preview */}
                      {pkg.features && pkg.features.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground font-medium">Features:</p>
                          <p className="text-xs text-muted-foreground">{pkg.features.slice(0, 3).join(', ')}{pkg.features.length > 3 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {packages.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No packages configured</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 text-accent hover:underline"
            >
              Create your first package
            </button>
          </div>
        )}
      </div>
    </div>
  )
}