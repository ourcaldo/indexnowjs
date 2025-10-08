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
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Device Filter */}
      <Select value={selectedDevice} onValueChange={onDeviceChange}>
        <SelectTrigger className={`${compact ? 'w-[140px]' : 'w-[180px]'} text-sm bg-background justify-start`} data-testid="select-device">
          <div className="flex items-center gap-2">
            {selectedDevice === 'desktop' && <Monitor className="w-3 h-3" />}
            {selectedDevice === 'mobile' && <Smartphone className="w-3 h-3" />}
            {!selectedDevice && <Monitor className="w-3 h-3 text-muted-foreground" />}
            <SelectValue placeholder="All Devices" />
          </div>
        </SelectTrigger>
        <SelectContent className="text-left">
          <SelectItem value="" className="justify-start pl-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground transition-colors duration-150">
            <div className="flex items-center gap-2 w-full text-left">
              <Monitor className="w-3 h-3 text-muted-foreground" />
              <span className="text-left">All Devices</span>
            </div>
          </SelectItem>
          <SelectItem value="desktop" className="justify-start pl-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground transition-colors duration-150">
            <div className="flex items-center gap-2 w-full text-left">
              <Monitor className="w-3 h-3" />
              <span className="text-left">Desktop</span>
            </div>
          </SelectItem>
          <SelectItem value="mobile" className="justify-start pl-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground transition-colors duration-150">
            <div className="flex items-center gap-2 w-full text-left">
              <Smartphone className="w-3 h-3" />
              <span className="text-left">Mobile</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Country Filter */}
      <Select value={selectedCountry} onValueChange={onCountryChange}>
        <SelectTrigger className={`${compact ? 'w-[150px]' : 'min-w-[180px] max-w-[220px]'} text-sm bg-background`} data-testid="select-country">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="pl-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground transition-colors duration-150">
            <span>All Countries</span>
          </SelectItem>
          {countries.map((country: Country) => (
            <SelectItem key={country.id} value={country.id} className="pl-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-foreground data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground dark:data-[highlighted]:text-foreground transition-colors duration-150">
              <span className="truncate">{country.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}