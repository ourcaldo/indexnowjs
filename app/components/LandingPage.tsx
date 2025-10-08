'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp } from 'lucide-react'

// New Landing Page Components
import HeroSection from '@/components/landing/HeroSection'
import ValueProofSection from '@/components/landing/ValueProofSection'
import PainPromiseSection from '@/components/landing/PainPromiseSection'
import CoreDifferentiatorsSection from '@/components/landing/CoreDifferentiatorsSection'
import ProductTourSection from '@/components/landing/ProductTourSection'
import UseCasePathsSection from '@/components/landing/UseCasePathsSection'
import ImprovedHowItWorksSection from '@/components/landing/ImprovedHowItWorksSection'
import PricingTeaserSection from '@/components/landing/PricingTeaserSection'
import ComparisonSection from '@/components/landing/ComparisonSection'
import EnhancedFAQSection from '@/components/landing/EnhancedFAQSection'
import FinalCTASection from '@/components/landing/FinalCTASection'

// Existing components to keep
import CompanyLogos from './CompanyLogos'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

export default function LandingPage() {
  const { user, siteSettings, handleAuthAction, handleGetStarted } = usePageData()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  // Refs for sections
  const heroRef = useRef<HTMLElement>(null)
  const companiesRef = useRef<HTMLElement>(null)
  const valueProofRef = useRef<HTMLElement>(null)
  const painPromiseRef = useRef<HTMLElement>(null)
  const differentiatorsRef = useRef<HTMLElement>(null)
  const productTourRef = useRef<HTMLElement>(null)
  const useCasesRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const comparisonRef = useRef<HTMLElement>(null)
  const faqRef = useRef<HTMLElement>(null)
  const finalCtaRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Scroll event listener
    const handleScroll = () => {
      const scrollY = window.scrollY
      setShowScrollTop(scrollY > 400)
      
      // Update active section based on scroll position
      const sections = [
        { name: 'hero', ref: heroRef },
        { name: 'companies', ref: companiesRef },
        { name: 'value-proof', ref: valueProofRef },
        { name: 'pain-promise', ref: painPromiseRef },
        { name: 'differentiators', ref: differentiatorsRef },
        { name: 'product-tour', ref: productTourRef },
        { name: 'use-cases', ref: useCasesRef },
        { name: 'how-it-works', ref: howItWorksRef },
        { name: 'pricing', ref: pricingRef },
        { name: 'comparison', ref: comparisonRef },
        { name: 'faq', ref: faqRef },
        { name: 'final-cta', ref: finalCtaRef },
        { name: 'contact', ref: contactRef }
      ]
      
      const current = sections.find(section => {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect()
          return rect.top <= 100 && rect.bottom >= 100
        }
        return false
      })
      
      if (current) {
        setActiveSection(current.name)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Navigation configuration for the header
  const navigation = [
    {
      label: 'Features',
      onClick: () => scrollToSection(productTourRef),
      isActive: activeSection === 'product-tour'
    },
    {
      label: 'Pricing',
      href: '/pricing'
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
    <div className="min-h-screen text-white relative overflow-hidden bg-background">
      <Background />
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="landing"
      />

      {/* Hero Section */}
      <section ref={heroRef}>
        <HeroSection 
          user={user}
          onGetStarted={handleGetStarted}
          onScrollToDemo={() => scrollToSection(productTourRef)}
        />
      </section>

      {/* Company Logos Section */}
      <section ref={companiesRef} className="relative z-10">
        <CompanyLogos />
      </section>

      {/* Value Proof Snapshot Section */}
      <section ref={valueProofRef}>
        <ValueProofSection />
      </section>

      {/* Pain → Promise Section */}
      <section ref={painPromiseRef}>
        <PainPromiseSection onGetStarted={handleGetStarted} />
      </section>

      {/* Core Differentiators Section */}
      <section ref={differentiatorsRef}>
        <CoreDifferentiatorsSection />
      </section>

      {/* Product Tour Section */}
      <section ref={productTourRef}>
        <ProductTourSection />
      </section>

      {/* Use Case Paths Section */}
      <section ref={useCasesRef}>
        <UseCasePathsSection />
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef}>
        <ImprovedHowItWorksSection />
      </section>

      {/* Pricing Teaser Section */}
      <section ref={pricingRef}>
        <PricingTeaserSection 
          onGetStarted={handleGetStarted}
          onScrollToPricing={() => scrollToSection(pricingRef)}
        />
      </section>

      {/* Comparison Section */}
      <section ref={comparisonRef}>
        <ComparisonSection onGetStarted={handleGetStarted} />
      </section>

      {/* Enhanced FAQ Section */}
      <section ref={faqRef}>
        <EnhancedFAQSection />
      </section>

      {/* Final CTA Section */}
      <section ref={finalCtaRef}>
        <FinalCTASection onGetStarted={handleGetStarted} />
      </section>

      {/* Footer */}
      <section ref={contactRef}>
        <Footer 
          siteSettings={siteSettings} 
          onScrollToPricing={() => scrollToSection(pricingRef)}
        />
      </section>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-white/10 backdrop-blur-sm text-white p-4 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-110 z-40 shadow-lg"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}