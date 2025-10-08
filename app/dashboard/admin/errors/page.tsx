'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorStatsCards } from '@/components/admin/errors/ErrorStatsCards';
import { ErrorFilters } from '@/components/admin/errors/ErrorFilters';
import { ErrorListTable } from '@/components/admin/errors/ErrorListTable';
import { ErrorDetailModal } from '@/components/admin/errors/ErrorDetailModal';
import { AlertCircle } from 'lucide-react';

export default function ErrorMonitoringPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleErrorClick = (errorId: string) => {
    setSelectedErrorId(errorId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedErrorId(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <AlertCircle className="h-8 w-8" />
          Error Monitoring Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage system errors across all services
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2" data-testid="tabs-time-range">
        <Button
          variant={timeRange === '24h' ? 'default' : 'outline'}
          onClick={() => setTimeRange('24h')}
          data-testid="tab-24h"
        >
          Last 24 Hours
        </Button>
        <Button
          variant={timeRange === '7d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('7d')}
          data-testid="tab-7d"
        >
          Last 7 Days
        </Button>
        <Button
          variant={timeRange === '30d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('30d')}
          data-testid="tab-30d"
        >
          Last 30 Days
        </Button>
      </div>

      {/* Statistics Cards */}
      <ErrorStatsCards timeRange={timeRange} />

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Log</CardTitle>
          <CardDescription>
            View and manage all system errors with advanced filtering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <ErrorFilters onFilterChange={setFilters} />

          {/* Error Table */}
          <ErrorListTable filters={filters} onErrorClick={handleErrorClick} />
        </CardContent>
      </Card>

      {/* Error Detail Modal */}
      <ErrorDetailModal
        errorId={selectedErrorId}
        open={modalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
