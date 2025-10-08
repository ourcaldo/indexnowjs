
'use client'

import { useState, useEffect } from 'react'

interface DashboardPreviewProps {}

// Single comprehensive IndexNow Rank Tracker dashboard preview
const dashboardData = {
  title: "IndexNow Rank Tracker",
  description: "Professional keyword ranking monitoring with real-time SEO insights",
  stats: [
    { value: "1,247", label: "Keywords Tracked", color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.1)", border: "hsl(var(--info) / 0.3)" },
    { value: "89", label: "Top 10 Positions", color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.1)", border: "hsl(var(--success) / 0.3)" },
    { value: "12.4", label: "Average Position", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.1)", border: "hsl(var(--warning) / 0.3)" }
  ],
  rankingChart: [
    { height: '45%', value: '156', change: '+12' },
    { height: '60%', value: '203', change: '+8' },
    { height: '35%', value: '124', change: '-5' },
    { height: '75%', value: '287', change: '+23' },
    { height: '55%', value: '198', change: '+2' },
    { height: '85%', value: '324', change: '+18' },
    { height: '95%', value: '389', change: '+27' }
  ],
  domains: [
    { name: "example.com", keywords: 324, avgPos: 8.5, trend: "up" },
    { name: "mysite.org", keywords: 198, avgPos: 12.1, trend: "stable" },
    { name: "business.net", keywords: 287, avgPos: 15.3, trend: "down" }
  ],
  bottomMetrics: [
    { value: "15", label: "Active Domains", color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.1)", border: "hsl(var(--info) / 0.3)" },
    { value: "24", label: "Countries", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.1)", border: "hsl(var(--warning) / 0.3)" }
  ],
  status: { color: "hsl(var(--success))", label: "" }
}

export default function DashboardPreview({}: DashboardPreviewProps) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [mounted])

  const styles = {
    opacity: 1
  }

  if (!mounted) {
    return null
  }

  return (
    <div style={{ 
      maxWidth: isMobile ? '100%' : '500px', 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMobile ? 'center' : 'flex-start',
      textAlign: isMobile ? 'center' : 'left'
    }}>

      {/* Dashboard Mock Slideshow */}
      <div className="shadow-2xl" style={{
        backgroundColor: 'hsl(var(--background))',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '32px',
        position: 'relative',
        opacity: styles.opacity,
        width: '100%',
        maxWidth: isMobile ? '350px' : '500px'
      }}>
        {/* Header Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '24px' : '32px'
        }}>
          {dashboardData.stats.map((stat, idx) => (
            <div key={idx} style={{
              backgroundColor: stat.bg,
              borderRadius: '12px',
              padding: isMobile ? '16px' : '20px',
              textAlign: 'center',
              border: stat.border ? `1px solid ${stat.border}` : 'none'
            }}>
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '800',
                color: stat.color,
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: stat.color === 'hsl(var(--foreground))' ? 'hsl(var(--muted-foreground))' : stat.color,
                fontWeight: '500'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div style={{
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '12px',
          padding: isMobile ? '16px' : '24px',
          marginBottom: isMobile ? '16px' : '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: 'hsl(var(--foreground))',
              margin: 0
            }}>
              {dashboardData.title}
            </h3>
            <div style={{
              fontSize: '12px',
              color: dashboardData.status.color,
              fontWeight: '600',
              backgroundColor: `hsl(var(--success) / 0.15)`,
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              {dashboardData.status.label}
            </div>
          </div>
          
          {/* Ranking Chart */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            height: isMobile ? '60px' : '80px',
            gap: isMobile ? '4px' : '8px'
          }}>
            {dashboardData.rankingChart.map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  fontSize: '8px',
                  color: bar.change.startsWith('+') ? 'hsl(var(--success))' : 'hsl(var(--error))',
                  marginBottom: '2px',
                  fontWeight: '600'
                }}>
                  {bar.change}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  {bar.value}
                </div>
                <div style={{
                  backgroundColor: idx === dashboardData.rankingChart.length - 1 ? dashboardData.status.color : (bar.change.startsWith('+') ? 'hsl(var(--success))' : 'hsl(var(--muted))'),
                  height: bar.height,
                  width: '100%',
                  borderRadius: '3px',
                  transition: 'all 0.3s ease'
                }} />
              </div>
            ))}
          </div>
          
          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: 'hsl(var(--muted-foreground))',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {dashboardData.description}
          </div>
        </div>

        {/* Domain List */}
        <div style={{
          marginBottom: isMobile ? '16px' : '24px'
        }}>
          <div style={{
            fontSize: isMobile ? '12px' : '14px',
            color: 'hsl(var(--foreground))',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            Top Domains
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {dashboardData.domains.slice(0, 3).map((domain, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'hsl(var(--muted))',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'hsl(var(--foreground))'
                }}>
                  {domain.name}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    color: 'hsl(var(--muted-foreground))'
                  }}>
                    {domain.keywords} keywords
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: domain.trend === 'up' ? 'hsl(var(--success))' : domain.trend === 'down' ? 'hsl(var(--error))' : 'hsl(var(--muted-foreground))'
                  }}>
                    {domain.trend === 'up' ? '↗' : domain.trend === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)',
          gap: isMobile ? '12px' : '16px'
        }}>
          {dashboardData.bottomMetrics.map((metric, idx) => (
            <div key={idx} style={{
              backgroundColor: metric.bg,
              borderRadius: '10px',
              padding: isMobile ? '12px' : '16px',
              border: `1px solid ${metric.border}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '700',
                    color: metric.color,
                    marginBottom: '2px'
                  }}>
                    {metric.value}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '10px' : '11px',
                    color: metric.color,
                    fontWeight: '500'
                  }}>
                    {metric.label}
                  </div>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: metric.color,
                  borderRadius: '50%'
                }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
