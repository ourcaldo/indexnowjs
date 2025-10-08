'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export interface NavigationItem {
  label: string
  href?: string
  onClick?: () => void
  isActive?: boolean
}

export interface HeaderProps {
  user?: any
  siteSettings?: {
    site_name: string
    white_logo: string
  } | null
  onAuthAction: () => void
  navigation: NavigationItem[]
  variant?: 'landing' | 'page' // 'landing' has dynamic sticky behavior, 'page' is always sticky
  currentPage?: string
}

export default function Header({ 
  user, 
  siteSettings, 
  onAuthAction, 
  navigation, 
  variant = 'page',
  currentPage 
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsHeaderSticky(scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavigationClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick()
    }
    setIsMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className={`transition-all duration-500 ease-in-out ${
        isHeaderSticky 
          ? 'px-6 py-3' 
          : 'px-0 py-0'
      }`}>
        <div className={`transition-all duration-500 ease-in-out ${
          isHeaderSticky 
            ? 'max-w-5xl mx-auto bg-black/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl' 
            : 'w-full bg-black/90 backdrop-blur-md px-4 sm:px-6 lg:px-8'
        }`}>
          <div className={`flex justify-between items-center transition-all duration-500 ease-in-out ${
            isHeaderSticky 
              ? 'h-14 px-6' 
              : 'h-16'
          }`}>
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                <img 
                  src={siteSettings?.white_logo} 
                  alt={siteSettings?.site_name}
                  className="h-20 w-auto"
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item, index) => (
                <NavItem
                  key={index}
                  item={item}
                  onClick={() => handleNavigationClick(item)}
                  currentPage={currentPage}
                />
              ))}
            </nav>

            {/* Desktop Auth Button */}
            <div className="hidden md:flex">
              <button
                onClick={onAuthAction}
                className={`font-medium transition-all duration-300 rounded-full ${
                  isHeaderSticky 
                    ? 'bg-white text-black px-4 py-2 hover:bg-muted text-sm' 
                    : 'bg-white text-black px-6 py-2 hover:bg-muted'
                }`}
              >
                {user ? (isHeaderSticky ? 'Dashboard' : 'Go to Dashboard') : 'Sign In'}
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-4">
              <button
                onClick={onAuthAction}
                className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-muted transition-colors"
              >
                {user ? 'Dashboard' : 'Sign In'}
              </button>
              
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:text-muted-foreground transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black border-t border-border">
            {navigation.map((item, index) => (
              <NavItem
                key={index}
                item={item}
                onClick={() => handleNavigationClick(item)}
                currentPage={currentPage}
                isMobile={true}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

interface NavItemProps {
  item: NavigationItem
  onClick: () => void
  currentPage?: string
  isMobile?: boolean
}

function NavItem({ item, onClick, currentPage, isMobile = false }: NavItemProps) {
  const isCurrentPage = currentPage === item.label.toLowerCase()
  const isActive = item.isActive || isCurrentPage

  const baseClasses = isMobile 
    ? "block px-3 py-2 text-sm font-medium w-full text-left"
    : "text-sm font-medium transition-colors"

  const stateClasses = isActive 
    ? "text-white" 
    : "text-white/80 hover:text-white"

  if (item.href) {
    return (
      <a
        href={item.href}
        className={`${baseClasses} ${stateClasses}`}
      >
        {item.label}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${stateClasses}`}
    >
      {item.label}
    </button>
  )
}