'use client'

import { useState } from 'react'
import { Zap, Download, AlertTriangleIcon, InfoIcon } from 'lucide-react'

export default function NewIndexPage() {
  const [activeTab, setActiveTab] = useState('manual')
  const [jobName, setJobName] = useState('#Job-1753026377069-420')
  const [urls, setUrls] = useState('https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">IndexNow</h1>
        <p className="mt-1 text-muted-foreground">Submit URLs for indexing and manage schedules</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg border bg-background border-border">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Submit URLs for Indexing</h2>
            </div>

            {/* Job Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Job Name
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-ring text-foreground"
              />
            </div>

            {/* Input Method Tabs */}
            <div className="mb-6">
              <div className="flex border rounded-lg p-1 border-border bg-secondary">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'manual' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>✋</span>
                    Manual Input
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('sitemap')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'sitemap' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    From Sitemap
                  </div>
                </button>
              </div>
            </div>

            {/* URL Input */}
            {activeTab === 'manual' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono text-sm bg-background border-border focus:ring-ring text-foreground"
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter one URL per line. Maximum 1000 URLs per job.
                </p>
              </div>
            )}

            {activeTab === 'sitemap' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Sitemap URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-ring text-foreground"
                  placeholder="https://example.com/sitemap.xml"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter your sitemap URL to automatically import all URLs for indexing.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors">
              Submit URLs for Indexing
            </button>
          </div>
        </div>

        {/* Sidebar - API Quota Status */}
        <div className="lg:col-span-1">
          <div className="bg-background p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">API Quota Status</h3>
            
            {/* Service Account */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">indexnow@nexpocker.com</span>
                <span className="text-xs bg-error/10 text-error px-2 py-1 rounded-full border border-error/20">Critical</span>
              </div>
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1">Daily Requests</div>
                <div className="w-full bg-border rounded-full h-2">
                  <div className="bg-error h-2 rounded-full" style={{width: '97.5%'}}></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">195/200</div>
              </div>
            </div>

            {/* Combined Quota */}
            <div className="bg-info/10 p-4 rounded-lg border border-info/20">
              <div className="text-center">
                <div className="text-xs text-info mb-1">Combined Quota</div>
                <div className="text-2xl font-bold text-info">195/200</div>
                <div className="text-xs text-info">Daily requests available</div>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-xs text-warning-foreground">
                  API quota is running low. Consider adding more service accounts to avoid interruptions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}