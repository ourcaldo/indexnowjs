'use client'

export default function ImprovedHowItWorksSection() {
  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional keyword rank tracking platform with automated monitoring and analytics.
            Set up your complete rank tracking system in minutes.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          {/* Large Feature - Keyword Management */}
          <div className="lg:col-span-2 lg:row-span-2 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-500 group">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Keyword Management</h3>
                <p className="text-sm text-accent">Complete tracking setup</p>
              </div>
              
              <div className="space-y-4 flex-grow">
                <div>
                  <p className="text-white font-medium">CSV Import & Manual Entry</p>
                  <p className="text-sm text-muted-foreground">Bulk import keywords via CSV or add them manually with domain assignment</p>
                </div>
                
                <div>
                  <p className="text-white font-medium">Multi-Location Tracking</p>
                  <p className="text-sm text-muted-foreground">Track rankings across different countries with desktop and mobile support</p>
                </div>
                
                <div>
                  <p className="text-white font-medium">Domain Organization</p>
                  <p className="text-sm text-muted-foreground">Organize keywords by domain with custom tagging and filtering system</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Tracking */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Daily Tracking</h3>
              <p className="text-xs text-accent">Automated monitoring</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Automated daily rank checks with intelligent quota management and batch processing.
            </p>
          </div>

          {/* Position Analytics */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Position Analytics</h3>
              <p className="text-xs text-success">Historical insights</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Track position changes over time with comprehensive ranking history and trend analysis.
            </p>
          </div>

          {/* Advanced Features */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-1">Advanced Features</h3>
              <p className="text-sm text-warning">Complete monitoring suite</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white font-medium">Position Tracking</p>
                <p className="text-sm text-muted-foreground">Monitor ranking changes with position history</p>
              </div>
              
              <div>
                <p className="text-white font-medium">Domain Management</p>
                <p className="text-sm text-muted-foreground">Organize keywords by domain with tagging system</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}