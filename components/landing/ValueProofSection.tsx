'use client'

import NeonCard from './NeonCard'

export default function ValueProofSection() {
  return (
    <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Mini-stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">150K+</div>
            <div className="text-muted-foreground text-sm">projects tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">2.5M</div>
            <div className="text-muted-foreground text-sm">checks/month capacity</div>
          </div>
          <div className="text-center col-span-2 md:col-span-1">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">99.9%</div>
            <div className="text-muted-foreground text-sm">uptime</div>
          </div>
        </div>

        {/* 1-line reassurance */}
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Built for speed and clarity. Get set up in minutes.
          </p>
        </div>
      </div>
    </section>
  )
}