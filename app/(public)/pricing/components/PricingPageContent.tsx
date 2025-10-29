'use client'

import { useState } from 'react'
import { Check, Star, Shield, Clock, ArrowRight, MessageCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { usePricingData } from '@/hooks/business/usePricingData'

import NeonContainer from '@/components/landing/NeonContainer'
import AdvancedNeonCard from '@/components/landing/AdvancedNeonCard'

import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

export default function PricingPageContent() {
  const { user, siteSettings, handleAuthAction, handleGetStarted } = usePageData()
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const {
    packages,
    selectedPeriod,
    currency,
    isLoading,
    error,
    setSelectedPeriod,
    formatPrice,
    getPricing,
    getFeaturesList,
    getSavingsPercentage
  } = usePricingData()

  const periodOptions = [
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'annual' as const, label: 'Annual' }
  ]

  const pricingFAQs = [
    {
      question: "What happens if I exceed my keyword limit?",
      answer: "When you reach your keyword limit, you can either upgrade to a higher plan or remove some keywords to add new ones. We'll notify you when you're approaching your limit so you can decide what works best for your needs."
    },
    {
      question: "Do I need a credit card for the free trial?",
      answer: "Yes, a credit card is required to start your free trial. This helps prevent abuse and ensures a smooth transition to your chosen plan. You won't be charged during your 3-day trial period."
    },
    {
      question: "Can I switch plans anytime?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
    },
    {
      question: "Do you offer discounts for annual plans?",
      answer: "Yes! Annual plans offer significant savings - up to 16% off compared to monthly billing. The longer your commitment, the more you save."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no cancellation fees, and you'll retain access to your data until the end of your billing period."
    }
  ]

  const structuredData = packages.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Product", 
    "name": "IndexNow Rank Tracker",
    "description": "Professional rank tracking tool for SEO professionals and digital marketers",
    "offers": packages.map((pkg) => {
      const pricing = getPricing(pkg)
      return {
        "@type": "Offer",
        "name": pkg.name,
        "description": pkg.description,
        "price": pricing.price,
        "priceCurrency": currency,
        "availability": "https://schema.org/InStock"
      }
    })
  } : null

  const navigation = [
    {
      label: 'Features',
      href: '/#features'
    },
    {
      label: 'Pricing',
      href: '/pricing',
      isActive: true
    },
    {
      label: 'Blog',
      href: '/blog'
    },
    {
      label: 'FAQ',
      href: '/faq'
    },
    {
      label: 'Contact',
      href: '/contact'
    }
  ]

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <div className="min-h-screen text-white relative overflow-hidden bg-[hsl(var(--primary))]">
        <Background />
        <Header 
          user={user}
          siteSettings={siteSettings}
          onAuthAction={handleAuthAction}
          navigation={navigation}
          variant="landing"
        />

      <main className="relative z-10 pt-24">
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
              Fair, transparent pricing built to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-info via-accent to-info">
                grow with you
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              No hidden fees. No confusing credits. Just straightforward plans that scale when you need them.
            </p>
            <button
              onClick={handleGetStarted}
              data-testid="button-get-started"
              className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-accent/10 transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
            >
              <span>Start free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              3-day free trial • cancel anytime
            </p>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-center mb-12">
              <div className="flex items-center space-x-6 rounded-2xl p-4">
                <span className={`text-base font-medium ${selectedPeriod === 'monthly' ? 'text-white' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setSelectedPeriod(selectedPeriod === 'monthly' ? 'annual' : 'monthly')}
                  data-testid="button-toggle-period"
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    selectedPeriod === 'annual' ? 'bg-white' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                      selectedPeriod === 'annual' 
                        ? 'translate-x-6 bg-black' 
                        : 'translate-x-1 bg-white'
                    }`}
                  />
                </button>
                <div className="flex items-center space-x-2">
                  <span className={`text-base font-medium ${selectedPeriod === 'annual' ? 'text-white' : 'text-muted-foreground'}`}>
                    Annual
                  </span>
                  {getSavingsPercentage('annual') && (
                    <span className="text-xs text-success font-semibold bg-success/10 px-2 py-1 rounded-full" data-testid="text-savings">
                      Save {getSavingsPercentage('annual')}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading pricing information...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-20">
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 max-w-md mx-auto">
                  <p className="text-destructive text-lg font-semibold mb-2">Unable to load pricing</p>
                  <p className="text-muted-foreground">Please try refreshing the page or contact support if the issue persists.</p>
                </div>
              </div>
            )}

            {!isLoading && !error && packages.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
                  <p className="text-white text-lg font-semibold mb-2">No pricing plans available</p>
                  <p className="text-muted-foreground">Please contact support for more information.</p>
                </div>
              </div>
            )}

            {!isLoading && !error && packages.length > 0 && (
              <div className="grid md:grid-cols-3 gap-8">
                <NeonContainer className="contents">
                  {(mousePosition, isTracking) => 
                    packages.slice(0, 3).map((pkg) => {
                      const pricing = getPricing(pkg)
                      const isPopular = pkg.is_popular
                      const features = getFeaturesList(pkg)

                      return (
                        <AdvancedNeonCard 
                          key={pkg.id} 
                          intensity={isPopular ? "high" : "medium"} 
                          className="p-8 flex flex-col h-full min-h-[500px]"
                          mousePosition={mousePosition}
                          isTracking={isTracking}
                        >
                          {isPopular && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                              <div className="bg-gradient-to-r from-info to-accent text-white px-4 py-2 rounded-full text-sm font-semibold">
                                MOST POPULAR
                              </div>
                            </div>
                          )}

                          <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2" data-testid={`text-plan-name-${pkg.slug}`}>
                              {pkg.name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              {pkg.description}
                            </p>
                          </div>

                          <div className="mb-8">
                            {pricing.originalPrice && (
                              <div className="mb-2">
                                <span className="text-lg text-muted-foreground/70 line-through" data-testid={`text-original-price-${pkg.slug}`}>
                                  {formatPrice(pricing.originalPrice)}
                                </span>
                              </div>
                            )}
                            <div className="mb-2">
                              <span className="text-4xl font-bold text-white" data-testid={`text-price-${pkg.slug}`}>
                                {formatPrice(pricing.price)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">
                                per {selectedPeriod === 'monthly' ? 'month' : 'year'}
                              </span>
                            </div>
                          </div>

                          <div className="flex-grow">
                            <ul className="space-y-3 mb-8">
                              {features.map((feature, featureIndex) => (
                                <li key={featureIndex} className="flex items-start">
                                  <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                                    <Check className="w-5 h-5 text-success" />
                                  </div>
                                  <span className="ml-3 text-muted-foreground text-sm">
                                    {feature}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-auto">
                            <button
                              onClick={handleGetStarted}
                              data-testid={`button-get-started-${pkg.slug}`}
                              className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-accent/10 transition-colors duration-200"
                            >
                              Get started
                            </button>
                          </div>
                        </AdvancedNeonCard>
                      )
                    })
                  }
                </NeonContainer>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Every plan includes</h2>
            </div>
            <div className="grid md:grid-cols-5 gap-8">
              {[
                { icon: <Star className="w-8 h-8" />, title: "Local & mobile rank tracking", desc: "Track rankings across devices and locations" },
                { icon: <Clock className="w-8 h-8" />, title: "Real-time alerts", desc: "Get notified of significant rank changes" },
                { icon: <Check className="w-8 h-8" />, title: "Exportable reports", desc: "Clean, professional reports for clients" },
                { icon: <Shield className="w-8 h-8" />, title: "Secure cloud dashboard", desc: "Enterprise-grade security and uptime" },
                { icon: <MessageCircle className="w-8 h-8" />, title: "GDPR-ready privacy", desc: "Compliant data handling and storage" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-info mb-4 flex justify-center">
                    {item.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
                Pricing questions answered
              </h2>
              <p className="text-xl text-muted-foreground">
                Everything you need to know about our plans and pricing.
              </p>
            </div>

            <div className="space-y-4">
              {pricingFAQs.map((faq, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="p-1">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      data-testid={`button-faq-${index}`}
                      className="w-full text-left p-6 focus:outline-none"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white pr-4">
                          {faq.question}
                        </h3>
                        <div className="flex-shrink-0">
                          {expandedFAQ === index ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-6 pb-6">
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
                Why IndexNow over all-in-one tools?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">IndexNow</h3>
                <div className="space-y-4">
                  {[
                    "Predictable pricing",
                    "Focused rank tracking",
                    "Clean, client-ready reports",
                    "Fast, responsive interface",
                    "No feature bloat"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-success mr-3" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-destructive/5 backdrop-blur-sm rounded-2xl border border-destructive/20 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">All-in-one tools</h3>
                <div className="space-y-4">
                  {[
                    "Expensive bundles",
                    "Overwhelming dashboards", 
                    "Features you don't use",
                    "Slow, cluttered interface",
                    "Pay for tools you never touch"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <X className="w-5 h-5 text-destructive mr-3" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Track rankings with clarity without breaking the bank
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start your 3-day free trial today and see how simple rank tracking can be.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                data-testid="button-start-free"
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-accent/10 transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center justify-center space-x-2"
              >
                <span>Start free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`}
                data-testid="link-talk-to-sales"
                className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300 inline-flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Talk to sales</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={siteSettings} />
    </div>
    </>
  )
}
