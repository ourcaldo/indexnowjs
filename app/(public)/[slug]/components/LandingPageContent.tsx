'use client'

import { ArrowRight, CheckCircle } from 'lucide-react'

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  status: string
  // Removed is_homepage field
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
}

interface LandingPageContentProps {
  page: CMSPage
}

export default function LandingPageContent({ page }: LandingPageContentProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-primary to-brand-secondary text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div>
              <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
                {page.title}
              </h1>
              
              {page.meta_description && (
                <p className="text-xl lg:text-2xl text-secondary leading-relaxed mb-12">
                  {page.meta_description}
                </p>
              )}
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white hover:bg-white hover:text-brand-primary text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all"
                >
                  View Pricing
                </a>
              </div>
            </div>
            
            {/* Hero Image */}
            {page.featured_image_url && (
              <div className="relative">
                <img 
                  src={page.featured_image_url}
                  alt={page.title}
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      {page.content && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="prose prose-xl max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: page.content }} 
                className="text-brand-primary leading-relaxed"
              />
            </div>
          </div>
        </section>
      )}

      {/* Features Section (if no custom content) */}
      {!page.content && (
        <section className="py-20 bg-secondary">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-brand-primary mb-6">
                Why Choose IndexNow Studio?
              </h2>
              <p className="text-xl text-brand-text max-w-3xl mx-auto">
                Professional-grade SEO tools designed for marketers who demand results
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Instant Indexing',
                  description: 'Get your URLs indexed by Google instantly with our advanced API integration.',
                  icon: '🚀'
                },
                {
                  title: 'Rank Tracking',
                  description: 'Monitor your search rankings across multiple keywords and locations.',
                  icon: '📈'
                },
                {
                  title: 'Professional Reports',
                  description: 'Generate comprehensive SEO reports for clients and stakeholders.',
                  icon: '📊'
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-lg p-8 text-center shadow-lg">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-brand-primary mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-brand-text leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-brand-primary text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-secondary mb-12 max-w-3xl mx-auto">
            Join thousands of SEO professionals who trust IndexNow Studio for their indexing and ranking needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-white hover:bg-white hover:text-brand-primary text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}