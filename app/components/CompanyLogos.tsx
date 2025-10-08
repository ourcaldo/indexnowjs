'use client'

import { useState, useEffect } from 'react'

export default function CompanyLogos() {
  // Real company logos using real brand names that would use SEO tools
  const companies = [
    { name: 'Shopify', logo: 'https://logos-world.net/wp-content/uploads/2020/11/Shopify-Logo.png' },
    { name: 'WordPress', logo: 'https://logos-world.net/wp-content/uploads/2020/03/WordPress-Logo.png' },
    { name: 'Wix', logo: 'https://logos-world.net/wp-content/uploads/2020/11/Wix-Logo.png' },
    { name: 'Squarespace', logo: 'https://logos-world.net/wp-content/uploads/2020/11/Squarespace-Logo.png' },
    { name: 'Webflow', logo: 'https://logos-world.net/wp-content/uploads/2021/02/Webflow-Logo.png' },
    { name: 'BigCommerce', logo: 'https://logos-world.net/wp-content/uploads/2021/02/BigCommerce-Logo.png' }
  ]

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-muted-foreground text-sm uppercase tracking-wider font-medium">
            Trusted by Leading Platforms
          </p>
        </div>
        
        <div className="relative overflow-hidden">
          {/* Continuous scrolling animation */}
          <div className="flex animate-scroll">
            {/* First set of logos */}
            {companies.map((company, index) => (
              <div 
                key={`first-${index}`}
                className="flex-shrink-0 w-40 h-16 mx-6 flex items-center justify-center"
              >
                <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center justify-center hover:bg-white/10 transition-all duration-300">
                  <img 
                    src={company.logo} 
                    alt={company.name}
                    className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-60"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const img = e.currentTarget as HTMLImageElement
                      const span = img.nextElementSibling as HTMLElement
                      img.style.display = 'none'
                      if (span) span.style.display = 'block'
                    }}
                  />
                  <span className="text-white/60 text-sm font-medium hidden">
                    {company.name}
                  </span>
                </div>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {companies.map((company, index) => (
              <div 
                key={`second-${index}`}
                className="flex-shrink-0 w-40 h-16 mx-6 flex items-center justify-center"
              >
                <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center justify-center hover:bg-white/10 transition-all duration-300">
                  <img 
                    src={company.logo} 
                    alt={company.name}
                    className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-60"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement
                      const span = img.nextElementSibling as HTMLElement
                      img.style.display = 'none'
                      if (span) span.style.display = 'block'
                    }}
                  />
                  <span className="text-white/60 text-sm font-medium hidden">
                    {company.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Gradient overlays to hide seams */}
          <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  )
}