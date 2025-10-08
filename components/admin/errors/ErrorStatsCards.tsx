'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/core/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ErrorStatsProps {
  timeRange: '24h' | '7d' | '30d';
}

export function ErrorStatsCards({ timeRange }: ErrorStatsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/v1/admin/errors/stats', timeRange],
    queryFn: async () => {
      return apiRequest(`/api/v1/admin/errors/stats?range=${timeRange}`);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stats-loading">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = data;
  if (!stats) return null;

  const getTrendIcon = () => {
    if (stats.trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (stats.trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const mostCommonType = Object.entries(stats.distributions.byType || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];

  const errorRate = stats.summary.totalErrors / (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card data-testid="card-total-errors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-errors">
            {stats.summary.totalErrors.toLocaleString()}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {getTrendIcon()}
            <span className="ml-1">
              {Math.abs(stats.trend.value).toFixed(1)}% from previous period
            </span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-critical-errors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive" data-testid="text-critical-errors">
            {stats.summary.criticalErrors.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-error-rate">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-error-rate">
            {errorRate.toFixed(1)}/hr
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average errors per hour
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-most-common">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Common Type</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-most-common-type">
            {mostCommonType?.[0] || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mostCommonType?.[1] || 0} occurrences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
