'use client'

interface SkeletonSidebarProps {
  isCollapsed?: boolean
}

export const SkeletonSidebar = ({ isCollapsed = false }: SkeletonSidebarProps) => {
  return (
    <>
      {/* Desktop Skeleton Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full bg-background border-r border-border transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } hidden md:block`}>
        <div className="flex flex-col h-full">
          {/* Header Skeleton */}
          <div className={`px-4 py-5 ${
            isCollapsed ? 'flex flex-col items-center space-y-4' : 'flex items-center justify-between'
          }`}>
            <div className="flex items-center">
              <div className={`bg-muted animate-pulse rounded ${
                isCollapsed ? 'h-8 w-8' : 'h-12 w-24'
              }`}></div>
            </div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg"></div>
          </div>

          {/* Search Bar Skeleton */}
          {!isCollapsed && (
            <div className="px-4 mb-6">
              <div className="h-10 bg-muted animate-pulse rounded-lg"></div>
            </div>
          )}

          {/* Navigation Skeleton */}
          <nav className={`flex-1 px-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {/* Dashboard Section */}
            <div className="mb-6">
              {!isCollapsed && (
                <div className="px-3 mb-3">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                </div>
              )}
              <div className="space-y-1">
                <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
              </div>
            </div>

            {/* Keyword Tracker Section */}
            <div className="mb-6">
              {!isCollapsed && (
                <div className="px-3 mb-3">
                  <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
                </div>
              )}
              <div className="space-y-1">
                <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
              </div>
            </div>

            {/* Tools Section */}
            <div className="mb-6">
              {!isCollapsed && (
                <div className="px-3 mb-3">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
                </div>
              )}
              <div className="space-y-1">
                <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
              </div>
            </div>
          </nav>

          {/* Upgrade Section Skeleton */}
          {!isCollapsed && (
            <div className="px-4 py-4">
              <div className="bg-muted animate-pulse rounded-xl h-32"></div>
            </div>
          )}

          {/* Settings Skeleton */}
          <div className="px-4 pb-2">
            <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
          </div>

          {/* Bottom Section Skeleton */}
          <div className="border-t border-border p-4">
            <div className={`h-10 bg-muted animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
          </div>
        </div>
      </div>

      {/* Mobile Header Skeleton */}
      <div className="md:hidden bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
            <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg"></div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SkeletonSidebar