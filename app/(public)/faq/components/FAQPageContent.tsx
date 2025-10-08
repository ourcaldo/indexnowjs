'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Mail, MessageCircle } from 'lucide-react'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: 'General Product',
    items: [
      {
        question: 'What is IndexNow: Rank Tracker?',
        answer: 'IndexNow is a simple, powerful rank tracker built for marketers, agencies, and SEO professionals who need accuracy without bloat. We focus on precise keyword rankings with clean reports and transparent pricing.'
      },
      {
        question: 'How accurate is IndexNow\'s ranking data?',
        answer: 'We use advanced location and device simulation to provide highly accurate rankings. Our system neutralizes personalization factors and tracks from genuine geographic locations, ensuring you get the real rankings your audience sees.'
      },
      {
        question: 'Can I track mobile and local rankings?',
        answer: 'Yes! You can track both desktop and mobile rankings with location granularity down to city level. This helps you understand how your site performs across different devices and locations.'
      },
      {
        question: 'How often do you update rankings?',
        answer: 'We provide daily rank updates for all plans. Rankings are refreshed every 24 hours to ensure you have current and accurate positioning data.'
      },
      {
        question: 'Can I track competitors?',
        answer: 'Currently, our focus is on tracking your own website\'s keyword rankings. Competitor tracking is planned for future updates.'
      }
    ]
  },
  {
    title: 'Pricing & Billing',
    items: [
      {
        question: 'Is there a free trial?',
        answer: 'Yes! We offer a 3-day free trial so you can test all features before committing to a paid plan.'
      },
      {
        question: 'Do I need a credit card to start?',
        answer: 'Yes, a credit card is required to start your 3-day free trial. This helps us prevent abuse while ensuring you can seamlessly continue using the service if you decide to stay.'
      },
      {
        question: 'What happens if I exceed my keyword limit?',
        answer: 'If you approach your keyword limit, we\'ll notify you via email. You can either upgrade to a higher plan or remove some keywords to stay within your limit. We never surprise you with overage charges.'
      },
      {
        question: 'Can I change or cancel my plan anytime?',
        answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. Billing changes are prorated, and you\'ll only pay for what you use.'
      },
      {
        question: 'Do you offer discounts for annual billing?',
        answer: 'Yes! We offer significant savings for longer billing periods - up to 20% off with annual billing. Quarterly and bi-annual options are also available with increasing discounts.'
      }
    ]
  },
  {
    title: 'Features & Reporting',
    items: [
      {
        question: 'Can I export my ranking data?',
        answer: 'You can view all your ranking data in the dashboard. Export functionality is currently being developed for future updates.'
      },
      {
        question: 'How do I track my keyword progress?',
        answer: 'Your dashboard displays real-time ranking data with position changes over time. You can view rankings by domain, device type, and location to monitor your SEO progress.'
      },
      {
        question: 'How often is my ranking data updated?',
        answer: 'We update all keyword rankings daily to provide you with current and accurate position data across all your tracked keywords.'
      },
      {
        question: 'Is there an API available?',
        answer: 'Currently, we don\'t offer a public API, but we\'re actively developing one. If you have specific integration needs, contact our support team to discuss custom solutions.'
      }
    ]
  },
  {
    title: 'Account & Team Management',
    items: [
      {
        question: 'How many keywords can I track?',
        answer: 'The Basic plan includes 50 keywords, Premium allows up to 250 keywords, and Pro supports up to 1,500 keywords. You can track keywords across unlimited domains within your keyword limit.'
      },
      {
        question: 'Can I track multiple domains?',
        answer: 'Yes! All plans support unlimited domains. You can organize keywords by domain to track different websites within your keyword limit.'
      },
      {
        question: 'How do I organize my keywords?',
        answer: 'You can organize keywords by domain and add custom tags to group related keywords. This helps you manage large keyword lists and filter results in your dashboard.'
      }
    ]
  },
  {
    title: 'Technical & Privacy',
    items: [
      {
        question: 'Is my data secure?',
        answer: 'Absolutely! We use enterprise-grade security with encrypted connections, secure data storage, and regular security audits. Your ranking data and business information are protected with industry-standard security measures.'
      },
      {
        question: 'Are you GDPR compliant?',
        answer: 'Yes, we are fully GDPR compliant. We respect your privacy and provide full control over your data, including the ability to export or delete your information at any time.'
      },
      {
        question: 'Do you have uptime guarantees?',
        answer: 'We maintain 99.9% uptime and monitor our systems 24/7. You can check our current status and historical uptime data on our status page.'
      },
      {
        question: 'Can I access my historical ranking data?',
        answer: 'Yes! All your ranking history is preserved and accessible through the dashboard. You can view ranking trends and changes over time for all your tracked keywords.'
      }
    ]
  },
  {
    title: 'Trial & Getting Started',
    items: [
      {
        question: 'What happens after my free trial ends?',
        answer: 'After your 3-day trial, you can choose to continue with a paid plan. All your keywords, projects, and historical data will be preserved if you subscribe. If you don\'t subscribe, your data will be retained for 30 days in case you change your mind.'
      },
      {
        question: 'Will my settings and keywords be lost if I upgrade?',
        answer: 'No! All your data, settings, keywords, and historical rankings carry over seamlessly when you upgrade between plans. You won\'t lose anything.'
      },
      {
        question: 'Do you offer onboarding support?',
        answer: 'Yes! We provide comprehensive self-serve documentation and video tutorials. Premium customers also get priority support to help with setup and optimization.'
      }
    ]
  }
]

export default function FAQPageContent() {
  const { user, siteSettings, handleAuthAction } = usePageData()
  const [openSections, setOpenSections] = useState<{ [key: number]: { [key: number]: boolean } }>({})

  const toggleQuestion = (sectionIndex: number, questionIndex: number) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionIndex]: {
        ...prev[sectionIndex],
        [questionIndex]: !prev[sectionIndex]?.[questionIndex]
      }
    }))
  }

  const isQuestionOpen = (sectionIndex: number, questionIndex: number) => {
    return openSections[sectionIndex]?.[questionIndex] || false
  }

  // Navigation configuration for the header
  const navigation = [
    {
      label: 'Home',
      href: '/'
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
      href: '/faq',
      isActive: true
    },
    {
      label: 'Contact',
      href: '/contact'
    }
  ]

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[hsl(var(--primary))]">
      <Background />
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="landing"
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            From setup to billing, here's everything you need to know about IndexNow. 
            Still have questions? Our team is just an email away.
          </p>
          <a 
            href="mailto:hello@indexnow.studio"
            className="inline-flex items-center px-6 py-3 bg-white text-black rounded-lg hover:bg-muted transition-colors"
          >
            <Mail className="w-5 h-5 mr-2" />
            Contact Support
          </a>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-12">
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mb-8 pb-4 border-b border-white/20">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.items.map((item, questionIndex) => (
                    <div key={questionIndex} className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                      <button
                        onClick={() => toggleQuestion(sectionIndex, questionIndex)}
                        className="w-full px-6 py-4 text-left hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-inset"
                        data-testid={`faq-question-${sectionIndex}-${questionIndex}`}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-white pr-4">
                            {item.question}
                          </h3>
                          <ChevronDown 
                            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                              isQuestionOpen(sectionIndex, questionIndex) ? 'transform rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>
                      {isQuestionOpen(sectionIndex, questionIndex) && (
                        <div 
                          className="px-6 py-4 bg-white/10 border-t border-white/10"
                          data-testid={`faq-answer-${sectionIndex}-${questionIndex}`}
                        >
                          <p className="text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Section CTA */}
                <div className="mt-8 text-center">
                  <p className="text-muted-foreground/80 mb-3">Still need help with {section.title.toLowerCase()}?</p>
                  <a 
                    href="mailto:hello@indexnow.studio"
                    className="text-white hover:text-muted-foreground font-medium transition-colors"
                  >
                    Contact us →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-4">
              Didn't find your answer?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Reach out and we'll get back to you quickly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:hello@indexnow.studio"
                className="inline-flex items-center px-6 py-3 bg-white text-black rounded-lg hover:bg-muted transition-colors"
                data-testid="contact-support-final"
              >
                <Mail className="w-5 h-5 mr-2" />
                Contact Support
              </a>
              <a 
                href="/register"
                className="inline-flex items-center px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                data-testid="start-trial-final"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Start 3-Day Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer siteSettings={siteSettings} />
    </div>
  )
}