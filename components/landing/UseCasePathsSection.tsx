'use client'

import { User, Users, Building2 } from 'lucide-react'
import NeonBorderCard from './NeonBorderCard'

export default function UseCasePathsSection() {
  const useCases = [
    {
      icon: User,
      title: "Solo/Small Team",
      description: "Everything you need for Google indexing and keyword tracking without complexity.",
      features: ["Keyword rank tracking", "Daily position checks", "Google URL indexing", "Service account management"],
      color: "text-accent"
    },
    {
      icon: Building2,
      title: "Agencies",
      description: "Manage multiple client domains with organized keyword tracking and indexing jobs.",
      features: ["Multiple domains", "Job scheduling", "Position history", "Quota monitoring"],
      color: "text-accent"
    },
    {
      icon: Users,
      title: "In-house Marketer",
      description: "Track your website's keyword positions and automate Google URL submission.",
      features: ["Domain management", "Automated indexing", "Historical tracking", "Tag organization"],
      color: "text-success"
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Built for your workflow
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're flying solo or managing a team, IndexNow adapts to your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8" style={{gridAutoRows: '1fr'}}>
          {useCases.map((useCase, index) => (
            <NeonBorderCard key={index} intensity={index === 1 ? "high" : "medium"} className="p-8 h-full flex flex-col">
              <div className={`w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 ${useCase.color}`}>
                <useCase.icon className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-semibold mb-4 text-white">
                {useCase.title}
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed flex-grow">
                {useCase.description}
              </p>
              
              <ul className="space-y-2">
                {useCase.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </NeonBorderCard>
          ))}
        </div>
      </div>
    </section>
  )
}