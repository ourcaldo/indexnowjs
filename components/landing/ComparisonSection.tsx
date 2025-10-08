'use client'

import { CheckCircle, X, ArrowRight } from 'lucide-react'

interface ComparisonSectionProps {
  onGetStarted: () => void
}

export default function ComparisonSection({ onGetStarted }: ComparisonSectionProps) {
  const comparisons = [
    {
      feature: "Focused rank tracking",
      indexnow: true,
      competitors: false
    },
    {
      feature: "Clear, usable reports",
      indexnow: true,
      competitors: false
    },
    {
      feature: "Fair, scalable pricing",
      indexnow: true,
      competitors: false
    },
    {
      feature: "Unused features",
      indexnow: false,
      competitors: true
    },
    {
      feature: "Confusing dashboards",
      indexnow: false,
      competitors: true
    },
    {
      feature: "Surprise overages",
      indexnow: false,
      competitors: true
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Why choose IndexNow over all-in-one suites?
          </h2>
          <p className="text-xl text-muted-foreground">
            Sometimes less is more. Focus on what actually moves the needle.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-3 gap-0">
            {/* Headers */}
            <div className="p-6 border-r border-white/10">
              <h3 className="text-lg font-semibold text-muted-foreground">Features</h3>
            </div>
            <div className="p-6 border-r border-white/10 text-center">
              <h3 className="text-lg font-semibold text-white">IndexNow</h3>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">All-in-One Tools</h3>
            </div>

            {/* Comparison rows */}
            {comparisons.map((item, index) => (
              <div key={index} className="contents">
                <div className={`p-6 border-r border-white/10 ${index < comparisons.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="text-muted-foreground">{item.feature}</span>
                </div>
                <div className={`p-6 border-r border-white/10 text-center ${index < comparisons.length - 1 ? 'border-b border-white/5' : ''}`}>
                  {item.indexnow ? (
                    <CheckCircle className="w-6 h-6 text-success mx-auto" />
                  ) : (
                    <X className="w-6 h-6 text-destructive mx-auto" />
                  )}
                </div>
                <div className={`p-6 text-center ${index < comparisons.length - 1 ? 'border-b border-white/5' : ''}`}>
                  {item.competitors ? (
                    <X className="w-6 h-6 text-destructive mx-auto" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-success mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={onGetStarted}
            className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-accent/10 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <span>Keep it simple, start free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}