'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Zap, CheckCircle, Clock, Globe, TrendingUp, Users, Shield } from 'lucide-react'

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState('overview')
  const [animationStep, setAnimationStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 4)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const stats = [
    { label: 'URLs Indexed Today', value: '2,847', icon: Globe, color: 'text-success' },
    { label: 'Success Rate', value: '98.7%', icon: TrendingUp, color: 'text-accent' },
    { label: 'Avg Index Time', value: '24 min', icon: Clock, color: 'text-warning' },
    { label: 'Active Jobs', value: '12', icon: Zap, color: 'text-accent' }
  ]

  const recentJobs = [
    { id: 1, name: 'Blog Posts Batch', status: 'completed', urls: 45, progress: 100 },
    { id: 2, name: 'Product Pages', status: 'processing', urls: 128, progress: 67 },
    { id: 3, name: 'News Articles', status: 'scheduled', urls: 23, progress: 0 },
  ]

  return (
    <div className="relative w-full h-full bg-background/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
      {/* Elegant background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/5"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-foreground/10 to-transparent"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-foreground/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">IndexNow Studio Dashboard</h3>
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-success">Live</span>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mt-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              activeTab === 'overview' 
                ? 'bg-foreground/20 text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              activeTab === 'jobs' 
                ? 'bg-foreground/20 text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Jobs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label}
                  className="bg-foreground/5 backdrop-blur-sm rounded-xl p-4 border border-foreground/10 hover:bg-foreground/10 transition-all duration-300"
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    transform: animationStep === index ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Indexing Progress Chart Simulation */}
            <div className="bg-foreground/5 backdrop-blur-sm rounded-xl p-4 border border-foreground/10">
              <h4 className="text-sm font-medium text-foreground mb-3">Today's Indexing Activity</h4>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground w-12">{String(6 + i * 2).padStart(2, '0')}:00</div>
                    <div className="flex-1 bg-foreground/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-success to-accent rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.random() * 60 + 30}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground w-8">{Math.floor(Math.random() * 500 + 100)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="bg-foreground/5 backdrop-blur-sm rounded-xl p-4 border border-foreground/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">{job.name}</h4>
                  <div className="flex items-center space-x-2">
                    {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-success" />}
                    {job.status === 'processing' && <Zap className="w-4 h-4 text-warning animate-pulse" />}
                    {job.status === 'scheduled' && <Clock className="w-4 h-4 text-accent" />}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'completed' ? 'bg-success/20 text-success' :
                      job.status === 'processing' ? 'bg-warning/20 text-warning' :
                      'bg-accent/20 text-accent'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{job.urls} URLs</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-foreground/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      job.status === 'completed' ? 'bg-success' :
                      job.status === 'processing' ? 'bg-warning' :
                      'bg-accent'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Glossy overlay effect */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none"></div>
    </div>
  )
}