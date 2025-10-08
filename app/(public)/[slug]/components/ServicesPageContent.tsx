'use client'

import { ArrowRight, CheckCircle, Star, Zap, Shield, TrendingUp } from 'lucide-react'

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

interface ServicesPageContentProps {
  page: CMSPage
}

export default function ServicesPageContent({ page }: ServicesPageContentProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-brand-primary text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              {page.title}
            </h1>
            
            {page.meta_description && (
              <p className="text-xl text-secondary leading-relaxed mb-8">
                {page.meta_description}
              </p>
            )}

            <a
              href="/pricing"
              className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              View Pricing
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {page.featured_image_url && (
        <section className="relative -mt-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative z-10">
              <img 
                src={page.featured_image_url}
                alt={page.title}
                className="w-full h-64 lg:h-96 object-cover rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </section>
      )}

      {/* Custom Content */}
      {page.content && (
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="prose prose-lg max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: page.content }} 
                className="text-brand-primary leading-relaxed"
              />
            </div>
          </div>
        </section>
      )}

      {/* Services Grid */}
      <section className={`${page.content ? 'py-10' : 'py-20'} bg-secondary`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-brand-primary mb-6">
              Our Services
            </h2>
            <p className="text-xl text-brand-text max-w-3xl mx-auto">
              Professional SEO tools and services designed to accelerate your online success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Instant URL Indexing',
                description: 'Get your URLs indexed by Google instantly using our advanced API integration with Google Search Console.',
                features: ['Bulk URL submission', 'Real-time status tracking', 'API integration', 'Automated scheduling'],
                price: 'Starting at $29/mo'
              },
              {
                icon: TrendingUp,
                title: 'Advanced Rank Tracking',
                description: 'Monitor your search rankings across multiple keywords, locations, and devices with precision.',
                features: ['Multi-location tracking', 'Daily rank updates', 'Competitor analysis', 'Historical data'],
                price: 'Starting at $49/mo'
              },
              {
                icon: Shield,
                title: 'Enterprise Solutions',
                description: 'Custom enterprise solutions for agencies and large organizations with dedicated support.',
                features: ['White-label options', 'Custom integrations', 'Dedicated support', 'SLA guarantees'],
                price: 'Custom pricing'
              }
            ].map((service, index) => {
              const IconComponent = service.icon
              return (
                <div key={index} className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-brand-accent/10 rounded-lg flex items-center justify-center mb-6">
                    <IconComponent className="h-6 w-6 text-brand-accent" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-brand-primary mb-4">
                    {service.title}
                  </h3>
                  
                  <p className="text-brand-text leading-relaxed mb-6">
                    {service.description}
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-sm text-brand-text">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="border-t border-border pt-6">
                    <div className="text-lg font-semibold text-brand-primary mb-4">
                      {service.price}
                    </div>
                    <a
                      href="/pricing"
                      className="w-full inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-brand-primary mb-6">
              Why Choose Our Services?
            </h2>
            <p className="text-xl text-brand-text max-w-3xl mx-auto">
              We provide the most comprehensive and reliable SEO tools in the industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'Get results in seconds, not hours. Our optimized infrastructure ensures rapid processing.'
              },
              {
                icon: '📊',
                title: 'Accurate Data',
                description: 'Reliable, real-time data from official sources you can trust for critical decisions.'
              },
              {
                icon: '🔧',
                title: 'Easy Integration',
                description: 'Simple APIs and webhooks that integrate seamlessly with your existing workflow.'
              },
              {
                icon: '🛡️',
                title: 'Enterprise Security',
                description: 'Bank-level security with SOC 2 compliance and encrypted data transmission.'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-brand-primary mb-3">
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

      {/* CTA Section */}
      <section className="py-20 bg-brand-primary text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Boost Your SEO?
          </h2>
          <p className="text-xl text-secondary mb-12 max-w-3xl mx-auto">
            Join thousands of SEO professionals who trust our services to accelerate their online success.
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