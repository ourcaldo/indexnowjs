import { Metadata } from 'next'
import PricingPageContent from './components/PricingPageContent'

export const metadata: Metadata = {
  title: 'Pricing - IndexNow Studio',
  description: 'Fair, transparent pricing built to grow with you. No hidden fees. No confusing credits. Just straightforward plans that scale when you need them.',
  keywords: 'rank tracker pricing, SEO tool pricing, keyword tracking plans, affordable rank tracking, transparent pricing',
  openGraph: {
    title: 'Pricing - IndexNow Studio', 
    description: 'Fair, transparent pricing built to grow with you. Pay for rank tracking, not for bloat.',
    type: 'website',
    url: '/pricing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing - IndexNow Studio',
    description: 'Fair, transparent pricing built to grow with you. Pay for rank tracking, not for bloat.',
  },
  alternates: {
    canonical: '/pricing'
  }
}

export default function PricingPage() {
  return <PricingPageContent />
}