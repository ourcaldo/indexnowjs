'use client'

import { useState } from 'react'
import { MessageCircle, Bug, Lightbulb, Users, Send, ArrowRight } from 'lucide-react'
import { PUBLIC_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

type ContactType = 'Issues' | 'Feature Request' | 'Support' | 'Sales' | 'Partnership'

interface ContactFormData {
  name: string
  email: string
  type: ContactType
  subject: string
  orderId: string
  message: string
}

export default function ContactPageContent() {
  const { user, siteSettings, handleAuthAction } = usePageData()
  const [selectedType, setSelectedType] = useState<ContactType | null>(null)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: user?.email || '',
    type: 'Support',
    subject: '',
    orderId: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)

  // Navigation configuration for the header
  const navigation = [
    {
      label: 'Features',
      href: '/#features'
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
      href: '/contact',
      isActive: true
    }
  ]

  const handleBoxClick = (type: ContactType) => {
    if (type !== 'Feature Request') { // Coming soon is unclickable
      setSelectedType(type)
      setFormData(prev => ({ ...prev, type }))
    }
  }

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch(PUBLIC_ENDPOINTS.CONTACT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({
          name: '',
          email: user?.email || '',
          type: 'Support',
          subject: '',
          orderId: '',
          message: ''
        })
        setSelectedType(null)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden bg-[hsl(var(--primary))]">
      <Background />
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="page"
        currentPage="contact"
      />

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">SUPPORT</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
              Hello, how can we help?
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Get in touch with our support team. We're here to help you get the most out of IndexNow Studio.
            </p>

            {/* Search-like Input (Decorative) */}
            <div className="max-w-lg mx-auto mb-16">
              <div className="relative">
                <input
                  type="text"
                  placeholder="How do I track keyword rankings?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-muted-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                  readOnly
                />
                <div className="absolute right-3 top-3 text-muted-foreground/70 text-sm">
                  ⌘K
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Type Boxes */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Issues Box */}
              <div 
                className={`bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 cursor-pointer transition-all duration-300 hover:bg-white/10 ${
                  selectedType === 'Issues' ? 'ring-2 ring-white/30' : ''
                }`}
                onClick={() => handleBoxClick('Issues')}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Bug className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Issues</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Found a bug? We'd love to hear about it in our GitHub issues.
                  </p>
                  <button 
                    className={`inline-flex items-center space-x-2 font-medium transition-colors duration-200 ${
                      selectedType === 'Issues' 
                        ? 'text-destructive' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Open GitHub Issue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Feature Request Box */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 opacity-60">
                <div className="text-center">
                  <div className="w-12 h-12 bg-info/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-6 h-6 text-info" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Feature requests</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Want to suggest a new feature? Share it with our community.
                  </p>
                  <button 
                    className="inline-flex items-center space-x-2 font-medium text-muted-foreground/70 cursor-not-allowed"
                    disabled
                  >
                    <span>Coming Soon</span>
                  </button>
                </div>
              </div>

              {/* Ask the Community Box */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 opacity-60">
                <div className="text-center">
                  <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Ask the Community</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Join our GitHub discussions or our Discord server to browse for help and best practices.
                  </p>
                  <button 
                    className="inline-flex items-center space-x-2 font-medium text-muted-foreground/70 cursor-not-allowed"
                    disabled
                  >
                    <span>Coming Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Can't find what you're looking for section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Can't find what you're looking for?</h2>
              <p className="text-muted-foreground mb-6">
                The IndexNow Studio Support Team is ready to help. Response time for support tickets will vary depending on plan type and severity of the issue.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-muted transition-colors duration-200 flex items-center justify-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Contact Enterprise Sales</span>
                </button>
                <button className="border border-white/20 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-white/5 transition-colors duration-200 flex items-center justify-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>Open Ticket</span>
                </button>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-6">Send us a message</h3>
              
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-success/20 border border-success/30 rounded-lg">
                  <p className="text-success">Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-destructive/20 border border-destructive/30 rounded-lg">
                  <p className="text-destructive">Sorry, there was an error sending your message. Please try again.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Email Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value as ContactType)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                  >
                    <option value="Support" className="bg-background text-foreground">Support</option>
                    <option value="Sales" className="bg-background text-foreground">Sales</option>
                    <option value="Partnership" className="bg-background text-foreground">Partnership</option>
                    <option value="Issues" className="bg-background text-foreground">Issues</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                {/* Order ID */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Order ID <span className="text-white/70">(if any, optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => handleInputChange('orderId', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                    placeholder="ORDER-1234567890-ABC123"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent resize-none"
                    placeholder="Please provide as much detail as possible about your inquiry..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-muted transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={siteSettings} />
    </div>
  )
}