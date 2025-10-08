'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface ErrorFiltersProps {
  onFilterChange: (filters: Record<string, string | undefined>) => void;
}

export function ErrorFilters({ onFilterChange }: ErrorFiltersProps) {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [errorType, setErrorType] = useState<string | undefined>(undefined);

  const applyFilters = () => {
    onFilterChange({
      search: search || undefined,
      severity,
      status,
      type: errorType
    });
  };

  const clearFilters = () => {
    setSearch('');
    setSeverity(undefined);
    setStatus(undefined);
    setErrorType(undefined);
    onFilterChange({});
  };

  const hasActiveFilters = search || severity || status || errorType;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search error messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Severity filter */}
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-severity">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        {/* Error type filter */}
        <Select value={errorType} onValueChange={setErrorType}>
          <SelectTrigger className="w-full md:w-[200px]" data-testid="select-error-type">
            <SelectValue placeholder="Error Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
            <SelectItem value="DATABASE">Database</SelectItem>
            <SelectItem value="EXTERNAL_API">External API</SelectItem>
            <SelectItem value="VALIDATION">Validation</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
            <SelectItem value="PAYMENT">Payment</SelectItem>
            <SelectItem value="NETWORK">Network</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={applyFilters} data-testid="button-apply-filters">
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
