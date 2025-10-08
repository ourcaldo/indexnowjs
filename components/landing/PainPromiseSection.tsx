'use client'

import { X, CheckCircle, ArrowRight } from 'lucide-react'
import NeonCard from './NeonCard'

interface PainPromiseSectionProps {
  onGetStarted: () => void
}

export default function PainPromiseSection({ onGetStarted }: PainPromiseSectionProps) {
  const painPoints = [
    "Manual URL submission to Google is time-consuming and unreliable.",
    "Managing multiple Google service accounts for indexing is complex.", 
    "Keyword tracking tools are expensive with confusing pricing models.",
    "No way to automate both indexing and rank tracking in one platform."
  ]

  const solutions = [
    "Automated Google Indexing API submission with service account management.",
    "Comprehensive rank tracking with daily checks across devices and countries.",
    "Fair, transparent pricing with clear quota management and monitoring.",
    "Combined indexing and tracking platform with scheduling and analytics."
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            What most rank trackers get wrong
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Pain Points */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-destructive mb-6">Common Problems</h3>
            {painPoints.map((pain, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center mt-1">
                  <X className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-success mb-6">IndexNow Solutions</h3>
            {solutions.map((solution, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/20 flex items-center justify-center mt-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{solution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-muted transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <span>Track your first keywords</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}