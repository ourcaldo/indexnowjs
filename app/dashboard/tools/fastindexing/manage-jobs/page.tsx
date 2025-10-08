'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocketIO } from '@/hooks/useSocketIO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause,
  Play,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Archive,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/database';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger';
import { INDEXING_ENDPOINTS, buildEndpoint } from '@/lib/core/constants/ApiEndpoints';

interface Job {
  id: string;
  name: string;
  type: 'manual' | 'sitemap';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  schedule_type: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

// Real jobs data will be loaded from API

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success text-success-foreground';
    case 'failed':
      return 'bg-destructive text-destructive-foreground';
    case 'running':
      return 'bg-primary text-primary-foreground';
    case 'paused':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'failed':
      return <XCircle className="h-3 w-3" />;
    case 'running':
      return <Play className="h-3 w-3" />;
    case 'paused':
      return <Pause className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export default function ManageJobsPage() {
  const { addToast } = useToast();
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  
  // Log page view and job management activities
  usePageViewLogger('/dashboard/manage-jobs', 'Manage Jobs', { section: 'job_management' })
  const { logJobActivity } = useActivityLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const jobsPerPage = 20;

  // Memoized callback functions to prevent infinite re-renders
  const handleJobUpdate = useCallback((message: any) => {
    // Update the specific job in the list
    setJobs(prevJobs => 
      prevJobs.map(job => {
        if (job.id === message.jobId) {
          return {
            ...job,
            status: (message.status as Job['status']) || job.status,
            progress_percentage: message.progress?.progress_percentage ?? job.progress_percentage,
            processed_urls: message.progress?.processed_urls ?? job.processed_urls,
            successful_urls: message.progress?.successful_urls ?? job.successful_urls,
            failed_urls: message.progress?.failed_urls ?? job.failed_urls,
            total_urls: message.progress?.total_urls ?? job.total_urls,
            updated_at: new Date().toISOString()
          };
        }
        return job;
      })
    );
  }, []);

  const handleJobCompleted = useCallback((message: any) => {
    addToast({
      title: 'Job Completed',
      description: `Job completed successfully!`,
      type: 'success'
    });
  }, [addToast]);

  // Socket.io for real-time updates
  const { isConnected } = useSocketIO({
    onJobUpdate: handleJobUpdate,
    onJobCompleted: handleJobCompleted
  });

  // Listen for real-time job list updates
  useEffect(() => {
    const handleJobListUpdate = (event: any) => {
      const { detail: updatedJobs } = event;
      setJobs(updatedJobs);
    };

    window.addEventListener('job-list-update', handleJobListUpdate);
    return () => {
      window.removeEventListener('job-list-update', handleJobListUpdate);
    };
  }, []);

  // Memoized loadJobs function to prevent unnecessary re-renders
  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: jobsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        schedule: scheduleFilter
      });

      const response = await fetch(buildEndpoint(INDEXING_ENDPOINTS.JOBS, Object.fromEntries(params)), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.data.jobs);
        setTotalCount(data.data.count);
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to load jobs',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load jobs',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, scheduleFilter, addToast]);

  // Load jobs data
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateJobId = (id: string) => `#${id}`;

  // Pagination
  const totalPages = Math.ceil(totalCount / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;

  const handleSelectJob = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId]);
    } else {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(jobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(INDEXING_ENDPOINTS.JOB_BY_ID(jobId), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Job deleted successfully',
          type: 'success'
        });
        
        // Log job deletion activity
        const job = jobs.find(j => j.id === jobId);
        logJobActivity('job_delete', jobId, `Deleted job: ${job?.name || jobId}`, {
          job_id: jobId,
          job_name: job?.name,
          job_type: job?.type,
          action: 'delete'
        });
        
        loadJobs(); // Reload jobs list
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to delete job',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      addToast({
        title: 'Error',
        description: 'Failed to delete job',
        type: 'error'
      });
    }
  };

  const handleRerunJob = async (jobId: string) => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(INDEXING_ENDPOINTS.JOB_BY_ID(jobId), {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'pending' })
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Job restarted successfully',
          type: 'success'
        });
        loadJobs(); // Reload jobs list
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to restart job',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error restarting job:', error);
      addToast({
        title: 'Error',
        description: 'Failed to restart job',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">View and manage your indexing jobs</p>
        </div>
        {selectedJobs.length > 0 && (
          <Button 
            variant="destructive"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Archive className="h-4 w-4 mr-2" />
            Delete Selected ({selectedJobs.length})
          </Button>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Jobs */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Search Jobs</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border focus:border-muted-foreground focus:ring-muted-foreground"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-border focus:border-muted-foreground focus:ring-muted-foreground focus-visible:ring-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="All Status" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">All Status</SelectItem>
                <SelectItem value="completed" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Completed</SelectItem>
                <SelectItem value="paused" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Paused</SelectItem>
                <SelectItem value="running" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Running</SelectItem>
                <SelectItem value="failed" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Schedule</label>
            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger className="border-border focus:border-muted-foreground focus:ring-muted-foreground focus-visible:ring-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="All Schedules" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">All Schedules</SelectItem>
                <SelectItem value="one-time" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">One-time</SelectItem>
                <SelectItem value="daily" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Daily</SelectItem>
                <SelectItem value="weekly" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Weekly</SelectItem>
                <SelectItem value="monthly" className="hover:bg-secondary focus:bg-secondary focus:text-foreground">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-card border border-border rounded-lg">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Indexing Jobs</h2>
            <Badge variant="secondary" className="bg-secondary text-muted-foreground">
              {totalCount} jobs
            </Badge>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left p-4 w-12">
                  <Checkbox
                    checked={selectedJobs.length === jobs.length && jobs.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-border"
                  />
                </th>
                <th className="text-left p-4 font-medium text-foreground">Name</th>
                <th className="text-left p-4 font-medium text-foreground">Created</th>
                <th className="text-left p-4 font-medium text-foreground min-w-[120px]">Schedule</th>
                <th className="text-left p-4 font-medium text-foreground">URLs</th>
                <th className="text-left p-4 font-medium text-foreground">Status</th>
                <th className="text-left p-4 font-medium text-foreground">Progress</th>
                <th className="text-left p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="text-muted-foreground">Loading jobs...</div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border hover:bg-secondary transition-colors duration-200">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={(checked) => handleSelectJob(job.id, checked as boolean)}
                        className="border-border"
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <Link 
                          href={`/dashboard/manage-jobs/${job.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {job.name}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">{generateJobId(job.id)}</p>
                      </div>
                    </td>
                    <td className="p-4 text-foreground">{formatDate(job.created_at)}</td>
                    <td className="p-4 min-w-[100px]">
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
                        {job.schedule_type}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="text-foreground font-medium">{job.total_urls} total</div>
                        <div className="text-muted-foreground">
                          <span className="text-success">{job.successful_urls} success</span>, <span className="text-destructive">{job.failed_urls} failed</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${getStatusColor(job.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(job.status)}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="text-sm text-foreground font-medium">
                          {job.total_urls > 0 ? `${Math.round(job.progress_percentage)}%` : '0%'} processed
                        </div>
                        <Progress 
                          value={job.progress_percentage || 0} 
                          className="h-2 w-24"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem asChild className="hover:bg-secondary focus:bg-secondary focus:text-foreground">
                            <Link 
                              href={`/dashboard/manage-jobs/${job.id}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              See details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRerunJob(job.id)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-secondary focus:bg-secondary focus:text-foreground"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Re-run
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteJob(job.id)}
                            className="flex items-center gap-2 cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && jobs.length === 0 && (
          <div className="p-8 text-center">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'All Status' || scheduleFilter !== 'All Schedules'
                ? "Try adjusting your filters to see more jobs."
                : "You haven't created any indexing jobs yet."
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + jobsPerPage, totalCount)} of {totalCount} jobs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-border text-foreground hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-border text-foreground hover:bg-secondary"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-border text-foreground hover:bg-secondary"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}