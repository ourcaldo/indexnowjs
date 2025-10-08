/**
 * Rank tracking type definitions for IndexNow Studio
 */

// Basic types
export type Device = 'desktop' | 'mobile' | 'tablet';
export type SearchEngine = 'google' | 'bing' | 'yahoo';
export type CountryCode = string; // ISO 3166-1 alpha-2

// Core interfaces
export interface RankKeyword {
  id: string;
  userId: string;
  keyword: string;
  domain: string;
  country: CountryCode;
  device: Device;
  searchEngine: SearchEngine;
  targetUrl?: string;
  tags: string[];
  isActive: boolean;
  currentPosition?: number;
  previousPosition?: number;
  bestPosition?: number;
  averagePosition?: number;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    searchVolume?: number;
    difficulty?: number;
    cpc?: number;
    competition?: 'low' | 'medium' | 'high';
  };
}

export interface RankHistory {
  id: string;
  keywordId: string;
  position: number;
  checkedAt: Date;
  searchResults?: SerchResult[];
  features?: SearchFeature[];
  metadata?: {
    totalResults?: number;
    searchTime?: number;
    location?: string;
  };
}

export interface SerchResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
  domain: string;
  isTargetDomain: boolean;
}

export interface SearchFeature {
  type: string;
  position: number;
  data?: any;
}

export interface RankTrackingDomain {
  id: string;
  userId: string;
  domain: string;
  name: string;
  isActive: boolean;
  keywordCount: number;
  averagePosition?: number;
  visibility?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types
export interface CreateKeywordRequest {
  keyword: string;
  domain: string;
  country: CountryCode;
  device?: Device;
  searchEngine?: SearchEngine;
  targetUrl?: string;
  tags?: string[];
}

export interface UpdateKeywordRequest {
  keyword?: string;
  domain?: string;
  country?: CountryCode;
  device?: Device;
  searchEngine?: SearchEngine;
  targetUrl?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface BulkKeywordRequest {
  keywords: CreateKeywordRequest[];
  validateDuplicates?: boolean;
  skipInvalid?: boolean;
}

export interface RankCheckRequest {
  keywordIds: string[];
  forceRefresh?: boolean;
  priority?: boolean;
}

export interface RankCheckResult {
  keywordId: string;
  keyword: string;
  domain: string;
  position: number;
  previousPosition?: number;
  positionChange: number;
  targetUrl?: string;
  actualUrl?: string;
  checkedAt: Date;
  success: boolean;
  error?: string;
  searchResults?: SerchResult[];
  features?: SearchFeature[];
}

// Analytics types
export interface KeywordAnalytics {
  keywordId: string;
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    averagePosition: number;
    bestPosition: number;
    worstPosition: number;
    volatility: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
  history: {
    date: Date;
    position: number;
  }[];
}

export interface DomainAnalytics {
  domain: string;
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    totalKeywords: number;
    averagePosition: number;
    visibility: number;
    topKeywords: number; // Keywords in top 10
    improvingKeywords: number;
    decliningKeywords: number;
  };
  positionDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

// Competitor types
export interface Competitor {
  id: string;
  userId: string;
  domain: string;
  name: string;
  isActive: boolean;
  keywordOverlap?: number;
  averagePosition?: number;
  visibility?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitorAnalysis {
  competitorId: string;
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    sharedKeywords: number;
    winningKeywords: number;
    losingKeywords: number;
    gapOpportunities: number;
  };
  keywordGaps: {
    keyword: string;
    competitorPosition: number;
    ourPosition?: number;
    opportunity: 'low' | 'medium' | 'high';
  }[];
}

// Report types
export interface RankReport {
  id: string;
  userId: string;
  name: string;
  type: 'keyword' | 'domain' | 'competitor';
  filters: {
    keywordIds?: string[];
    domains?: string[];
    countries?: CountryCode[];
    devices?: Device[];
    tags?: string[];
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    emails: string[];
  };
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  lastGenerated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateReportRequest {
  reportId: string;
  period: {
    from: Date;
    to: Date;
  };
  includeCharts?: boolean;
  includeComparison?: boolean;
}

// Quota and limits
export interface RankTrackingQuota {
  totalKeywords: number;
  usedKeywords: number;
  remainingKeywords: number;
  dailyChecks: number;
  usedChecks: number;
  remainingChecks: number;
  resetDate: Date;
}

export interface RankTrackingLimits {
  maxKeywords: number;
  dailyChecks: number;
  historicalData: number; // days
  competitors: number;
  reports: number;
  apiAccess: boolean;
  bulkOperations: boolean;
}

// Settings and configuration
export interface RankTrackingSettings {
  userId: string;
  defaultCountry: CountryCode;
  defaultDevice: Device;
  defaultSearchEngine: SearchEngine;
  checkFrequency: 'daily' | 'weekly' | 'monthly';
  notifications: {
    positionChanges: boolean;
    significantDrops: boolean;
    newTopRankings: boolean;
    weeklyReports: boolean;
  };
  alertThresholds: {
    positionDrop: number;
    positionImprovement: number;
    volatility: number;
  };
}

// Location and language
export interface Location {
  country: CountryCode;
  countryName: string;
  region?: string;
  city?: string;
  language?: string;
  currency?: string;
}

export interface AvailableLocation {
  country: CountryCode;
  countryName: string;
  regions?: {
    code: string;
    name: string;
    cities?: {
      code: string;
      name: string;
    }[];
  }[];
  languages: string[];
}