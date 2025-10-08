'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import NeonCard from './NeonCard'

export default function EnhancedFAQSection() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const faqs = [
    {
      question: "What can I track with IndexNow Studio?",
      answer: "Track **keyword rankings** for your websites across different countries and devices. Monitor **position changes over time**, organize keywords with **custom tags**, and manage multiple domains from one dashboard."
    },
    {
      question: "How often are rankings updated?",
      answer: "Rankings are checked **daily** to give you fresh data on your keyword positions. View **historical trends** and track progress over weeks and months."
    },
    {
      question: "Can I track mobile and desktop separately?",
      answer: "Yes! Track rankings on both **desktop and mobile devices** to see how your keywords perform across different platforms in various countries."
    },
    {
      question: "How many keywords can I track?",
      answer: "Keyword limits depend on your **subscription plan**. Organize your keywords with **custom tags** and filter by country, device, or performance to make the most of your allocation."
    },
    {
      question: "What about Google indexing?",
      answer: "Beyond rank tracking, IndexNow Studio helps you **submit URLs to Google** for faster indexing. Schedule automatic submissions and monitor indexing progress."
    },
    {
      question: "Is it easy to get started?",
      answer: "Very easy! Add your domain, upload your keywords, and start tracking immediately. The dashboard shows everything clearly with **charts and historical data**."
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Frequently asked questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about IndexNow rank tracking.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="p-1">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full text-left p-6 focus:outline-none"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white pr-4">
                      {faq.question}
                    </h3>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>
                
                {expandedFAQ === index && (
                  <div className="px-6 pb-6">
                    <div className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{
                      __html: faq.answer.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                    }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}