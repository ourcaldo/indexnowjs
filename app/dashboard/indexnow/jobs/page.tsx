'use client'

import { useState } from 'react'
import { SearchIcon, FilterIcon, CalendarIcon } from 'lucide-react'

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules')

  const jobs = [
    {
      id: '#Job-1753025054083-857',
      created: '20/7/2025, 22.24.42',
      schedule: 'one-time',
      urls: { total: 100, success: 0, failed: 0 },
      status: 'Paused',
      progress: { completed: 0, total: 100 }
    },
    {
      id: '#Job-22',
      created: '18/7/2025, 13.02.11',
      schedule: 'one-time', 
      urls: { total: 1, success: 0, failed: 1 },
      status: 'Completed',
      progress: { completed: 1, total: 1 }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-primary">Jobs</h1>
        <p className="mt-1 text-muted-foreground">View and manage your indexing jobs</p>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border bg-background border-border">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-brand-primary">Filters</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-ring text-foreground"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-ring text-foreground"
          >
            <option>All Status</option>
            <option>Completed</option>
            <option>Running</option>
            <option>Paused</option>
            <option>Failed</option>
          </select>

          {/* Schedule Filter */}
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-background border-border focus:ring-ring text-foreground"
          >
            <option>All Schedules</option>
            <option>one-time</option>
            <option>hourly</option>
            <option>daily</option>
            <option>weekly</option>
            <option>monthly</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-lg border bg-background border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-brand-primary">Indexing Jobs</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left py-3 px-4">
                  <input type="checkbox" className="rounded border border-border" />
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Schedule</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">URLs</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progress</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job.id} className="border-b border-border transition-colors hover:bg-secondary">
                  <td className="py-3 px-4">
                    <input type="checkbox" className="rounded border border-border" />
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">{job.id}</td>
                  <td className="py-3 px-4 text-muted-foreground">{job.created}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-primary text-primary-foreground">
                      {job.schedule}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    <div>{job.urls.total} total</div>
                    <div className="text-xs text-muted-foreground">
                      {job.urls.success} success, {job.urls.failed} failed
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      job.status === 'Completed' ? 'bg-success text-success-foreground' 
                        : job.status === 'Paused' ? 'bg-warning text-warning-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {job.status === 'Completed' ? (
                      <div className="w-full rounded-full h-2 bg-border">
                        <div className="h-2 rounded-full w-full bg-success"></div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{job.progress.completed}/{job.progress.total} processed</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button className="transition-colors text-muted-foreground hover:text-primary">...</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}