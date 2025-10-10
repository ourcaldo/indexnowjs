import React from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Country {
  id: string
  name: string
}

interface DeviceCountryFilterProps {
  selectedDevice: string
  selectedCountry: string
  countries: Country[]
  onDeviceChange: (device: string) => void
  onCountryChange: (country: string) => void
  className?: string
  compact?: boolean
}

export const DeviceCountryFilter = ({
  selectedDevice,
  selectedCountry,
  countries,
  onDeviceChange,
  onCountryChange,
  className = '',
  compact = false
}: DeviceCountryFilterProps) => {
  const handleDeviceChange = (value: string) => {
    if (value !== selectedDevice) {
      onDeviceChange(value)
    }
  }

  const handleCountryChange = (value: string) => {
    if (value !== selectedCountry) {
      onCountryChange(value)
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Device Filter */}
      <Select value={selectedDevice} onValueChange={handleDeviceChange}>
        <SelectTrigger className={`${compact ? 'w-[140px]' : 'w-[180px]'} text-sm bg-background justify-start`} data-testid="select-device">
          <div className="flex items-center gap-2">
            {selectedDevice === 'desktop' && <Monitor className="w-3 h-3" />}
            {selectedDevice === 'mobile' && <Smartphone className="w-3 h-3" />}
            {!selectedDevice && <Monitor className="w-3 h-3 text-muted-foreground" />}
            <SelectValue placeholder="All Devices" />
          </div>
        </SelectTrigger>
        <SelectContent className="text-left">
          <SelectItem 
            value="" 
            disabled={selectedDevice === ''}
            className={`justify-start pl-2 text-left transition-colors duration-150 ${
              selectedDevice === '' 
                ? 'bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 w-full text-left">
              <Monitor className="w-3 h-3 text-muted-foreground" />
              <span className="text-left">All Devices</span>
            </div>
          </SelectItem>
          <SelectItem 
            value="desktop" 
            disabled={selectedDevice === 'desktop'}
            className={`justify-start pl-2 text-left transition-colors duration-150 ${
              selectedDevice === 'desktop' 
                ? 'bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 w-full text-left">
              <Monitor className="w-3 h-3" />
              <span className="text-left">Desktop</span>
            </div>
          </SelectItem>
          <SelectItem 
            value="mobile" 
            disabled={selectedDevice === 'mobile'}
            className={`justify-start pl-2 text-left transition-colors duration-150 ${
              selectedDevice === 'mobile' 
                ? 'bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 w-full text-left">
              <Smartphone className="w-3 h-3" />
              <span className="text-left">Mobile</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Country Filter */}
      <Select value={selectedCountry} onValueChange={handleCountryChange}>
        <SelectTrigger className={`${compact ? 'w-[150px]' : 'min-w-[180px] max-w-[220px]'} text-sm bg-background`} data-testid="select-country">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem 
            value="" 
            disabled={selectedCountry === ''}
            className={`pl-2 text-left transition-colors duration-150 ${
              selectedCountry === '' 
                ? 'bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground'
            }`}
          >
            <span>All Countries</span>
          </SelectItem>
          {countries.map((country: Country) => (
            <SelectItem 
              key={country.id} 
              value={country.id} 
              disabled={selectedCountry === country.id}
              className={`pl-2 text-left transition-colors duration-150 ${
                selectedCountry === country.id 
                  ? 'bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground'
              }`}
            >
              <span className="truncate">{country.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}