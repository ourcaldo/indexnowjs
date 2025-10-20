'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { RANK_TRACKING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface Country {
  id: string
  name: string
}

interface DeviceCountryFilterContextType {
  selectedDevice: string
  selectedCountry: string
  countries: Country[]
  setSelectedDevice: (device: string) => void
  setSelectedCountry: (country: string) => void
  isLoading: boolean
}

const DeviceCountryFilterContext = createContext<DeviceCountryFilterContextType | undefined>(undefined)

export function DeviceCountryFilterProvider({ children }: { children: ReactNode }) {
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')

  // Fetch countries for filter
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: [RANK_TRACKING_ENDPOINTS.COUNTRIES],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(RANK_TRACKING_ENDPOINTS.COUNTRIES, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch countries')
      const result = await response.json()
      if (result.success === true && result.data) {
        return result.data
      }
      return result
    }
  })

  const countries = countriesData?.data || []

  return (
    <DeviceCountryFilterContext.Provider
      value={{
        selectedDevice,
        selectedCountry,
        countries,
        setSelectedDevice,
        setSelectedCountry,
        isLoading: countriesLoading
      }}
    >
      {children}
    </DeviceCountryFilterContext.Provider>
  )
}

export function useDeviceCountryFilter() {
  const context = useContext(DeviceCountryFilterContext)
  if (context === undefined) {
    throw new Error('useDeviceCountryFilter must be used within a DeviceCountryFilterProvider')
  }
  return context
}
