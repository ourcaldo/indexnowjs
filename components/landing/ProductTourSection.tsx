'use client'

import { useState } from 'react'
import { Monitor, MapPin, Globe, BarChart3, Clock, Phone } from 'lucide-react'
import NeonCard from './NeonCard'

export default function ProductTourSection() {
  const [activeTab, setActiveTab] = useState(0)

  const features = [
    {
      icon: Monitor,
      title: "Keyword Table",
      description: "See position, delta, SERP features, and device at a glance.",
      preview: (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <span className="text-sm">seo tools</span>
            <div className="flex items-center space-x-2">
              <span className="bg-success/20 text-success px-2 py-1 rounded text-xs">#3</span>
              <span className="text-success text-xs">+2</span>
            </div>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <span className="text-sm">rank tracker</span>
            <div className="flex items-center space-x-2">
              <span className="bg-info/20 text-info px-2 py-1 rounded text-xs">#1</span>
              <span className="text-muted-foreground text-xs">-</span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: MapPin,
      title: "Location & Device Views",
      description: "Track desktop/mobile by country, city, ZIP; add competitors.",
      preview: (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Desktop • New York</span>
            </div>
            <span className="text-success font-medium">#3</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Mobile • London</span>
            </div>
            <span className="text-warning font-medium">#7</span>
          </div>
        </div>
      )
    },
    {
      icon: Globe,
      title: "Google Indexing System",
      description: "Submit thousands of URLs to Google's Indexing API automatically with service account management.",
      preview: (
        <div className="space-y-3">
          <div className="bg-info/10 border border-info/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-info rounded-full"></div>
              <span className="text-info text-xs font-medium">INDEXING</span>
            </div>
            <div className="text-sm text-white mt-1">1,247 URLs submitted</div>
          </div>
          <div className="bg-success/10 border border-success/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-success text-xs font-medium">INDEXED</span>
            </div>
            <div className="text-sm text-white mt-1">892 URLs successfully indexed</div>
          </div>
        </div>
      )
    },
    {
      icon: BarChart3,
      title: "Analytics & History",
      description: "Track ranking progress over time with detailed position history and daily statistics.",
      preview: (
        <div className="space-y-3">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Position History</span>
              <span className="text-xs text-success">Updated</span>
            </div>
            <div className="text-xs text-muted-foreground">147 keywords • Daily tracking • Historical data</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Domain Statistics</span>
              <span className="text-xs text-info">Real-time</span>
            </div>
            <div className="text-xs text-muted-foreground">Filtered views • Tag management • Progress tracking</div>
          </div>
        </div>
      )
    },
    {
      icon: Clock,
      title: "Automated Scheduling",
      description: "Schedule indexing jobs with flexible options: one-time, hourly, daily, weekly, or monthly.",
      preview: (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Daily Sitemap Job</span>
            </div>
            <span className="text-success font-medium">Active</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Weekly Batch Job</span>
            </div>
            <span className="text-info font-medium">Scheduled</span>
          </div>
        </div>
      )
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            See IndexNow in action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every feature designed to save you time and deliver clear insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Feature Tabs */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                  activeTab === index 
                    ? 'bg-white/10 border border-white/20' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeTab === index ? 'bg-info/20 text-info' : 'bg-white/10 text-muted-foreground'
                  }`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Feature Preview - Complex Interactive Demo */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {features[activeTab].title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {features[activeTab].description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground/70">
                    <span className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                      <span>Live Data</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-info rounded-full"></div>
                      <span>Real-time Updates</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-warning rounded-full"></div>
                      <span>Interactive</span>
                    </span>
                  </div>
                </div>
                
                {/* Enhanced Preview Content */}
                <div className="h-[400px] bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-destructive rounded-full"></div>
                      <div className="w-3 h-3 bg-warning rounded-full"></div>
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                    </div>
                    <div className="text-xs text-muted-foreground">IndexNow Studio - {features[activeTab].title}</div>
                    <div className="text-xs text-muted-foreground/70">Live Demo</div>
                  </div>
                  
                  <div className="p-4 h-full">
                    <div className="h-full">
                      {features[activeTab].preview}
                      
                      {/* Additional Interactive Elements */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Last updated: 2 mins ago</span>
                          <span className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-success rounded-full animate-pulse"></div>
                            <span>Monitoring active</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/5 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Today</div>
                            <div className="text-sm font-medium text-success">+12</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Week</div>
                            <div className="text-sm font-medium text-info">+47</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">Month</div>
                            <div className="text-sm font-medium text-warning">+156</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Interactive Controls */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button className="text-xs bg-info/20 text-info px-2 py-1 rounded hover:bg-info/30 transition-colors">
                      Export Data
                    </button>
                    <button className="text-xs bg-white/10 text-white px-2 py-1 rounded hover:bg-white/20 transition-colors">
                      Set Alert
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Try clicking elements above ↑
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}