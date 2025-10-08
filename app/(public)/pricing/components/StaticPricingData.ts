// Static pricing data for SEO and fallback
export const staticPricingData = {
  packages: [
    {
      id: "starter",
      name: "Starter", 
      slug: "starter",
      description: "Perfect for small websites and personal projects",
      features: [
        "100 Keywords tracked",
        "5 Domains monitored", 
        "Daily rank updates",
        "Basic reporting",
        "Email notifications"
      ],
      quota_limits: {
        keywords_limit: 100,
        daily_urls: 50
      },
      pricing_tiers: {
        monthly: {
          USD: { promo_price: 29, period_label: "month", regular_price: 29 },
          IDR: { promo_price: 450000, period_label: "month", regular_price: 450000 }
        },
        annual: {
          USD: { promo_price: 279, period_label: "year", regular_price: 348 },
          IDR: { promo_price: 4300000, period_label: "year", regular_price: 5400000 }
        }
      },
      is_popular: false
    },
    {
      id: "premium",
      name: "Premium",
      slug: "premium", 
      description: "Best for agencies and growing businesses",
      features: [
        "1,000 Keywords tracked",
        "25 Domains monitored",
        "Daily rank updates", 
        "Advanced reporting",
        "Priority support",
        "Competitor tracking"
      ],
      quota_limits: {
        keywords_limit: 1000,
        daily_urls: 200
      },
      pricing_tiers: {
        monthly: {
          USD: { promo_price: 89, period_label: "month", regular_price: 89 },
          IDR: { promo_price: 1350000, period_label: "month", regular_price: 1350000 }
        },
        annual: {
          USD: { promo_price: 849, period_label: "year", regular_price: 1068 },
          IDR: { promo_price: 13000000, period_label: "year", regular_price: 16200000 }
        }
      },
      is_popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      slug: "enterprise",
      description: "For large organizations with extensive needs", 
      features: [
        "Unlimited Keywords",
        "Unlimited Domains",
        "Hourly rank updates",
        "White-label reports",
        "Dedicated support",
        "Custom integrations"
      ],
      quota_limits: {
        keywords_limit: -1,
        daily_urls: -1
      },
      pricing_tiers: {
        monthly: {
          USD: { promo_price: 299, period_label: "month", regular_price: 299 },
          IDR: { promo_price: 4500000, period_label: "month", regular_price: 4500000 }
        },
        annual: {
          USD: { promo_price: 2849, period_label: "year", regular_price: 3588 },
          IDR: { promo_price: 43000000, period_label: "year", regular_price: 54000000 }
        }
      },
      is_popular: false
    }
  ]
}

export function formatPrice(amount: number, currency: 'USD' | 'IDR' = 'USD') {
  if (currency === 'USD') {
    return `$${amount}`
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
}

export function getSavings(monthly: number, period: number, periodPrice: number) {
  const regularPrice = monthly * period
  const savings = ((regularPrice - periodPrice) / regularPrice) * 100
  return Math.round(savings)
}