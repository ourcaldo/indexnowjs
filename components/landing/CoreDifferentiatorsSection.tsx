'use client'

import { Target, Eye, DollarSign } from 'lucide-react'
import NeonBorderCard from './NeonBorderCard'

export default function CoreDifferentiatorsSection() {
  const differentiators = [
    {
      icon: Target,
      title: "Dual-purpose automation",
      description: "Combines Google URL indexing with keyword rank tracking in one platform for complete SEO workflow automation.",
      color: "text-info"
    },
    {
      icon: Eye,
      title: "Enterprise-grade security",
      description: "AES-256 encryption for credentials, comprehensive audit logging, and secure service account management.",
      color: "text-accent"
    },
    {
      icon: DollarSign,
      title: "Transparent operations",
      description: "Clear quota monitoring, job scheduling with email notifications, and organized domain management.",
      color: "text-success"
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Three pillars that set us apart
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            While others overcomplicate, we focus on what actually matters for your success.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8" style={{gridAutoRows: '1fr'}}>
          {differentiators.map((item, index) => (
            <NeonBorderCard key={index} intensity={index === 1 ? "high" : "medium"} className="p-8 text-center h-full flex flex-col">
              <div className={`w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 ${item.color}`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">
                {item.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed flex-grow">
                {item.description}
              </p>
            </NeonBorderCard>
          ))}
        </div>
      </div>
    </section>
  )
}