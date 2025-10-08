'use client'

import { Plus, Settings, Play } from 'lucide-react'
import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

export default function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      icon: Plus,
      title: "Add site & keywords",
      description: "Import CSV or paste your keywords. Setup takes under 5 minutes.",
      details: "(import CSV or paste)"
    },
    {
      number: "2", 
      icon: Settings,
      title: "Choose locations, devices, competitors",
      description: "Configure tracking for desktop/mobile across any location worldwide.",
      details: ""
    },
    {
      number: "3",
      icon: Play,
      title: "Set schedule & alerts done",
      description: "Automated daily tracking with instant notifications when rankings change.",
      details: ""
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes, not hours. Three simple steps to professional rank tracking.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12" style={{gridAutoRows: '1fr'}}>
        <NeonContainer className="contents">
          {(mousePosition, isTracking) => 
            steps.map((step, index) => (
              <div key={index} className="text-center relative h-full flex flex-col">
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-accent/50 to-accent/70 -translate-y-1/2 z-0"></div>
                )}
                
                <AdvancedNeonCard 
                  intensity="medium" 
                  className="relative z-10 p-6 h-full flex flex-col"
                  mousePosition={mousePosition}
                  isTracking={isTracking}
                >
                  {/* Step number and icon */}
                  <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex flex-col items-center justify-center mx-auto mb-6 relative hover:bg-white/20 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent/40 rounded-3xl"></div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-white mb-2">{step.number}</div>
                      <step.icon className="w-8 h-8 text-accent" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {step.title}
                  </h3>
                  
                  {step.details && (
                    <p className="text-sm text-muted-foreground mb-2">{step.details}</p>
                  )}
                  
                  <p className="text-muted-foreground flex-grow">
                    {step.description}
                  </p>
                </AdvancedNeonCard>
              </div>
            ))
          }
        </NeonContainer>
        </div>

        {/* Micro reassurance */}
        <div className="text-center">
          <NeonContainer>
            {(mousePosition, isTracking) => (
              <AdvancedNeonCard 
                intensity="low" 
                className="px-8 py-4 inline-block"
                mousePosition={mousePosition}
                isTracking={isTracking}
              >
                <p className="text-lg font-medium text-white">
                  Setup in under 5 minutes
                </p>
              </AdvancedNeonCard>
            )}
          </NeonContainer>
        </div>
      </div>
    </section>
  )
}