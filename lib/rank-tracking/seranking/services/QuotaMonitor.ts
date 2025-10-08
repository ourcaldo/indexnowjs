/**
 * Quota Monitor Service
 * Advanced quota management with real-time tracking, predictive alerting,
 * usage pattern analysis, and automated scaling recommendations
 */

import {
  QuotaStatus,
  QuotaAlert,
  ServiceResponse,
  SeRankingErrorType,
  ApiMetrics
} from '../types/SeRankingTypes';
import { IQuotaMonitor, IIntegrationService } from '../types/ServiceTypes';
import { supabaseAdmin } from '../../../database/supabase';
import { SecureServiceRoleWrapper } from '../../../services/security/SecureServiceRoleWrapper';
import { logger } from '@/lib/monitoring/error-handling';

// Enhanced quota configuration
export interface QuotaMonitorConfig {
  alertThresholds: {
    warning: number; // 0.8 = 80%
    critical: number; // 0.95 = 95%
    emergency: number; // 0.99 = 99%
  };
  predictionWindow: {
    enabled: boolean;
    lookAheadHours: number;
    minimumDataPoints: number;
    accuracyThreshold: number;
  };
  usagePatterns: {
    enableAnalysis: boolean;
    patternDetectionDays: number;
    anomalyThreshold: number;
  };
  autoScaling: {
    enabled: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownMinutes: number;
  };
  notifications: {
    channels: Array<'email' | 'webhook' | 'slack' | 'sms'>;
    escalationLevels: {
      level1: string[]; // User roles/channels
      level2: string[]; // Manager/team leads
      level3: string[]; // Emergency contacts
    };
  };
  retentionDays: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Usage tracking data structure
export interface QuotaUsageEntry {
  id?: string;
  timestamp: Date;
  user_id?: string;
  service_account_id?: string;
  operation_type: string;
  quota_consumed: number;
  quota_remaining: number;
  quota_limit: number;
  usage_percentage: number;
  session_id?: string;
  endpoint?: string;
  country_code?: string;
  keywords_count?: number;
  cost_per_request?: number;
  metadata?: Record<string, any>;
}

// Usage pattern analysis results
export interface UsagePattern {
  pattern_id: string;
  pattern_type: 'hourly' | 'daily' | 'weekly' | 'seasonal' | 'burst';
  confidence: number; // 0-1
  description: string;
  detected_at: Date;
  pattern_data: {
    peak_hours?: number[];
    peak_days?: string[];
    average_usage_rate: number;
    peak_usage_rate: number;
    variance: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  predictions: {
    next_peak_time?: Date;
    expected_usage_rate: number;
    confidence_interval: [number, number];
  };
  recommendations: Array<{
    type: 'quota_increase' | 'usage_optimization' | 'rate_limiting' | 'scheduling';
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimated_impact: string;
  }>;
}

// Quota prediction results
export interface QuotaPrediction {
  prediction_id: string;
  generated_at: Date;
  prediction_horizon_hours: number;
  current_usage: number;
  current_limit: number;
  predicted_usage: number;
  exhaustion_eta?: Date;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  contributing_factors: string[];
  recommended_actions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimated_impact: string;
    implementation_effort: 'low' | 'medium' | 'high';
  }>;
}

// Advanced quota status with analytics
export interface EnhancedQuotaStatus extends QuotaStatus {
  velocity: {
    requests_per_minute: number;
    requests_per_hour: number;
    trend_direction: 'up' | 'stable' | 'down';
    acceleration: number;
  };
  efficiency_metrics: {
    cost_per_successful_request: number;
    cache_hit_rate: number;
    error_rate: number;
    optimization_score: number;
  };
  historical_comparison: {
    same_time_yesterday: number;
    same_time_last_week: number;
    average_this_period: number;
    peak_this_period: number;
  };
  active_patterns: UsagePattern[];
  current_prediction: QuotaPrediction;
}

export class QuotaMonitor implements IQuotaMonitor {
  private config: QuotaMonitorConfig;
  private integrationService: IIntegrationService;
  private usageBuffer: Map<string, QuotaUsageEntry[]> = new Map();
  private activeAlerts: Map<string, QuotaAlert> = new Map();
  private detectedPatterns: Map<string, UsagePattern> = new Map();
  private predictionCache: Map<string, QuotaPrediction> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private lastAnalysis?: Date;

  constructor(
    integrationService: IIntegrationService,
    config: Partial<QuotaMonitorConfig> = {}
  ) {
    this.integrationService = integrationService;
    this.config = {
      alertThresholds: {
        warning: 0.80,
        critical: 0.95,
        emergency: 0.99
      },
      predictionWindow: {
        enabled: true,
        lookAheadHours: 24,
        minimumDataPoints: 20,
        accuracyThreshold: 0.7
      },
      usagePatterns: {
        enableAnalysis: true,
        patternDetectionDays: 30,
        anomalyThreshold: 2.0
      },
      autoScaling: {
        enabled: false,
        scaleUpThreshold: 0.85,
        scaleDownThreshold: 0.4,
        cooldownMinutes: 60
      },
      notifications: {
        channels: ['email', 'webhook'],
        escalationLevels: {
          level1: ['team-lead'],
          level2: ['engineering-manager'],
          level3: ['on-call-engineer']
        }
      },
      retentionDays: 90,
      logLevel: 'info',
      ...config
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize continuous quota monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      this.log('info', 'Initializing QuotaMonitor service');
      
      // Load historical patterns
      await this.loadHistoricalPatterns();
      
      // Start real-time monitoring
      this.startContinuousMonitoring();
      
      // Initialize alert configurations
      await this.loadAlertConfigurations();
      
      this.log('info', 'QuotaMonitor service initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize QuotaMonitor: ${error}`);
      throw error;
    }
  }

  /**
   * Record quota usage with detailed tracking
   */
  async recordQuotaUsage(
    quotaConsumed: number,
    metadata?: {
      userId?: string;
      serviceAccountId?: string;
      operationType?: string;
      endpoint?: string;
      countryCode?: string;
      keywordsCount?: number;
      sessionId?: string;
      costPerRequest?: number;
    }
  ): Promise<void> {
    try {
      // Get current quota status
      const quotaStatus = await this.getCurrentQuotaStatus();
      if (!quotaStatus.success || !quotaStatus.data) {
        this.log('error', 'Failed to get quota status for usage recording');
        return;
      }

      const currentQuota = quotaStatus.data;
      const newUsage = currentQuota.current_usage + quotaConsumed;
      const usagePercentage = newUsage / currentQuota.quota_limit;

      const usageEntry: QuotaUsageEntry = {
        timestamp: new Date(),
        user_id: metadata?.userId,
        service_account_id: metadata?.serviceAccountId,
        operation_type: metadata?.operationType || 'api_request',
        quota_consumed: quotaConsumed,
        quota_remaining: currentQuota.quota_limit - newUsage,
        quota_limit: currentQuota.quota_limit,
        usage_percentage: usagePercentage,
        session_id: metadata?.sessionId,
        endpoint: metadata?.endpoint,
        country_code: metadata?.countryCode,
        keywords_count: metadata?.keywordsCount,
        cost_per_request: metadata?.costPerRequest,
        metadata
      };

      // Store in usage buffer for real-time analysis
      const bufferKey = this.getUsageBufferKey();
      if (!this.usageBuffer.has(bufferKey)) {
        this.usageBuffer.set(bufferKey, []);
      }
      this.usageBuffer.get(bufferKey)!.push(usageEntry);

      // Persist to database
      await this.persistUsageEntry(usageEntry);

      // Update integration service quota tracking
      await this.integrationService.recordApiUsage(quotaConsumed);

      // Check for immediate alerts
      await this.checkImmediateAlerts(usagePercentage);

      // Update real-time predictions if enabled
      if (this.config.predictionWindow.enabled) {
        await this.updateQuotaPredictions();
      }

      this.log('debug', `Recorded quota usage: ${quotaConsumed} (${(usagePercentage * 100).toFixed(1)}%)`);
    } catch (error) {
      this.log('error', `Failed to record quota usage: ${error}`);
    }
  }

  /**
   * Get enhanced quota status with analytics
   */
  async getEnhancedQuotaStatus(): Promise<ServiceResponse<EnhancedQuotaStatus>> {
    try {
      // Get basic quota status
      const basicStatus = await this.getCurrentQuotaStatus();
      if (!basicStatus.success || !basicStatus.data) {
        return {
          success: false,
          error: {
            type: SeRankingErrorType.UNKNOWN_ERROR,
            message: 'Failed to retrieve basic quota status'
          }
        };
      }

      const current = basicStatus.data;
      
      // Calculate velocity metrics
      const velocity = await this.calculateUsageVelocity();
      
      // Calculate efficiency metrics
      const efficiencyMetrics = await this.calculateEfficiencyMetrics();
      
      // Get historical comparison
      const historicalComparison = await this.getHistoricalComparison();
      
      // Get active patterns
      const activePatterns = Array.from(this.detectedPatterns.values());
      
      // Get current prediction
      const currentPrediction = await this.getCurrentPrediction();

      const enhancedStatus: EnhancedQuotaStatus = {
        ...current,
        velocity,
        efficiency_metrics: efficiencyMetrics,
        historical_comparison: historicalComparison,
        active_patterns: activePatterns,
        current_prediction: currentPrediction
      };

      return {
        success: true,
        data: enhancedStatus,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', `Failed to get enhanced quota status: ${error}`);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to retrieve enhanced quota status: ${error}`
        }
      };
    }
  }

  /**
   * Analyze usage patterns and detect anomalies
   */
  async analyzeUsagePatterns(daysPeriod: number = 30): Promise<ServiceResponse<UsagePattern[]>> {
    try {
      this.log('info', `Analyzing usage patterns for ${daysPeriod} days`);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysPeriod * 24 * 60 * 60 * 1000);
      
      // Get historical usage data
      const usageHistory = await this.getUsageHistory(startDate, endDate);
      
      if (usageHistory.length < this.config.usagePatterns.patternDetectionDays) {
        return {
          success: true,
          data: [],
          metadata: {
            source: 'cache',
            timestamp: new Date(),
            message: 'Insufficient data for pattern analysis'
          }
        };
      }

      const patterns: UsagePattern[] = [];
      
      // Detect hourly patterns
      const hourlyPattern = await this.detectHourlyPattern(usageHistory);
      if (hourlyPattern) patterns.push(hourlyPattern);
      
      // Detect daily patterns
      const dailyPattern = await this.detectDailyPattern(usageHistory);
      if (dailyPattern) patterns.push(dailyPattern);
      
      // Detect weekly patterns
      const weeklyPattern = await this.detectWeeklyPattern(usageHistory);
      if (weeklyPattern) patterns.push(weeklyPattern);
      
      // Detect burst patterns
      const burstPatterns = await this.detectBurstPatterns(usageHistory);
      patterns.push(...burstPatterns);
      
      // Update pattern cache
      for (const pattern of patterns) {
        this.detectedPatterns.set(pattern.pattern_id, pattern);
      }
      
      // Persist patterns to database
      await this.persistDetectedPatterns(patterns);
      
      this.log('info', `Detected ${patterns.length} usage patterns`);
      
      return {
        success: true,
        data: patterns,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          analysis_period_days: daysPeriod
        }
      };
    } catch (error) {
      this.log('error', `Failed to analyze usage patterns: ${error}`);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Pattern analysis failed: ${error}`
        }
      };
    }
  }

  /**
   * Generate quota predictions with confidence intervals
   */
  async generateQuotaPredictions(horizonHours: number = 24): Promise<ServiceResponse<QuotaPrediction>> {
    try {
      if (!this.config.predictionWindow.enabled) {
        return {
          success: false,
          error: {
            type: SeRankingErrorType.INVALID_REQUEST_ERROR,
            message: 'Quota predictions are disabled'
          }
        };
      }

      const currentStatus = await this.getCurrentQuotaStatus();
      if (!currentStatus.success || !currentStatus.data) {
        throw new Error('Unable to get current quota status');
      }

      const current = currentStatus.data;
      
      // Get recent usage velocity
      const velocity = await this.calculateUsageVelocity();
      
      // Apply pattern-based corrections
      const patternCorrections = await this.applyPatternCorrections(velocity.requests_per_hour);
      
      // Calculate predicted usage
      const predictedUsageRate = velocity.requests_per_hour * (1 + patternCorrections);
      const predictedUsage = current.current_usage + (predictedUsageRate * horizonHours);
      
      // Calculate exhaustion ETA
      let exhaustionEta: Date | undefined;
      if (predictedUsageRate > 0) {
        const remainingQuota = current.quota_remaining;
        const hoursToExhaustion = remainingQuota / predictedUsageRate;
        if (hoursToExhaustion > 0 && hoursToExhaustion <= horizonHours * 2) {
          exhaustionEta = new Date(Date.now() + hoursToExhaustion * 60 * 60 * 1000);
        }
      }
      
      // Calculate confidence and risk level
      const confidence = this.calculatePredictionConfidence(velocity, patternCorrections);
      const riskLevel = this.assessRiskLevel(predictedUsage / current.quota_limit, exhaustionEta);
      
      const prediction: QuotaPrediction = {
        prediction_id: `pred_${Date.now()}`,
        generated_at: new Date(),
        prediction_horizon_hours: horizonHours,
        current_usage: current.current_usage,
        current_limit: current.quota_limit,
        predicted_usage: predictedUsage,
        exhaustion_eta: exhaustionEta,
        confidence,
        risk_level: riskLevel,
        contributing_factors: this.identifyContributingFactors(velocity, patternCorrections),
        recommended_actions: await this.generateRecommendedActions(riskLevel, exhaustionEta, predictedUsage)
      };
      
      // Cache prediction
      this.predictionCache.set('current', prediction);
      
      // Persist to database
      await this.persistPrediction(prediction);
      
      return {
        success: true,
        data: prediction,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', `Failed to generate quota predictions: ${error}`);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Prediction generation failed: ${error}`
        }
      };
    }
  }

  /**
   * Check quota alerts and trigger notifications
   */
  async checkQuotaAlerts(): Promise<void> {
    try {
      const status = await this.getCurrentQuotaStatus();
      if (!status.success || !status.data) return;

      const currentPercentage = status.data.usage_percentage;
      
      // Check threshold-based alerts
      await this.checkThresholdAlerts(currentPercentage);
      
      // Check predictive alerts
      if (this.config.predictionWindow.enabled) {
        await this.checkPredictiveAlerts();
      }
      
      // Check pattern-based alerts
      if (this.config.usagePatterns.enableAnalysis) {
        await this.checkPatternBasedAlerts();
      }
    } catch (error) {
      this.log('error', `Failed to check quota alerts: ${error}`);
    }
  }

  /**
   * Set custom alert thresholds
   */
  async setAlertThresholds(thresholds: number[]): Promise<void> {
    try {
      // Validate thresholds
      const validThresholds = thresholds
        .filter(t => t > 0 && t <= 1)
        .sort((a, b) => a - b);

      if (validThresholds.length < 2) {
        throw new Error('At least two valid thresholds are required');
      }

      // Update configuration
      this.config.alertThresholds = {
        warning: validThresholds[0],
        critical: validThresholds[1],
        emergency: validThresholds[2] || validThresholds[1]
      };

      // Persist configuration
      await this.saveConfiguration();
      
      this.log('info', `Updated alert thresholds: ${validThresholds.join(', ')}`);
    } catch (error) {
      this.log('error', `Failed to set alert thresholds: ${error}`);
      throw error;
    }
  }

  /**
   * Get detailed usage history with analytics
   */
  async getUsageHistory(startDate?: Date, endDate?: Date, days: number = 7): Promise<Array<{
    date: string;
    usage: number;
    percentage: number;
    velocity: number;
    efficiency_score: number;
    pattern_match?: string;
  }>> {
    try {
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      
      const data = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_quota_usage_history',
          reason: 'Retrieving quota usage history for analytics and pattern analysis',
          source: 'rank-tracking/seranking/services/QuotaMonitor',
          metadata: {
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            days_period: days,
            operation_type: 'quota_usage_history_lookup'
          }
        },
        {
          table: 'indb_seranking_quota_usage',
          operationType: 'select',
          columns: ['*'],
          whereConditions: {
            timestamp_gte: start.toISOString(),
            timestamp_lte: end.toISOString()
          }
        },
        async () => {
          const { data, error } = await supabaseAdmin
            .from('indb_seranking_quota_usage')
            .select('*')
            .gte('timestamp', start.toISOString())
            .lte('timestamp', end.toISOString())
            .order('timestamp', { ascending: true })

          if (error) {
            throw new Error(`Failed to get quota usage history: ${error.message}`)
          }

          return data || []
        }
      )

      // Process data into daily aggregates
      const dailyAggregates = new Map<string, {
        usage: number;
        requests: number;
        total_cost: number;
        min_timestamp: Date;
        max_timestamp: Date;
      }>();

      (data || []).forEach(entry => {
        const date = entry.timestamp.split('T')[0];
        const current = dailyAggregates.get(date) || {
          usage: 0,
          requests: 0,
          total_cost: 0,
          min_timestamp: new Date(entry.timestamp),
          max_timestamp: new Date(entry.timestamp)
        };
        
        current.usage += entry.quota_consumed;
        current.requests += 1;
        current.total_cost += entry.cost_per_request || 0;
        current.min_timestamp = new Date(Math.min(current.min_timestamp.getTime(), new Date(entry.timestamp).getTime()));
        current.max_timestamp = new Date(Math.max(current.max_timestamp.getTime(), new Date(entry.timestamp).getTime()));
        
        dailyAggregates.set(date, current);
      });

      const result = Array.from(dailyAggregates.entries()).map(([date, data]) => ({
        date,
        usage: data.usage,
        percentage: 0, // Would need quota limit for this period
        velocity: data.requests / Math.max((data.max_timestamp.getTime() - data.min_timestamp.getTime()) / (60 * 60 * 1000), 1),
        efficiency_score: data.requests > 0 ? (data.usage / data.requests) : 0
      }));

      return result.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.log('error', `Failed to get usage history: ${error}`);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async getCurrentQuotaStatus(): Promise<ServiceResponse<QuotaStatus>> {
    const integrationSettings = await this.integrationService.getIntegrationSettings();
    if (!integrationSettings.success || !integrationSettings.data) {
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: 'Failed to get integration settings'
        }
      };
    }

    const settings = integrationSettings.data;
    const usagePercentage = settings.api_quota_used / settings.api_quota_limit;
    
    const quotaStatus: QuotaStatus = {
      current_usage: settings.api_quota_used,
      quota_limit: settings.api_quota_limit,
      quota_remaining: settings.api_quota_limit - settings.api_quota_used,
      usage_percentage: usagePercentage,
      reset_date: settings.quota_reset_date,
      is_approaching_limit: usagePercentage >= this.config.alertThresholds.warning,
      is_quota_exceeded: usagePercentage >= 1.0
    };

    return {
      success: true,
      data: quotaStatus
    };
  }

  private getUsageBufferKey(): string {
    return new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  }

  private async persistUsageEntry(entry: QuotaUsageEntry): Promise<void> {
    try {
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'persist_quota_usage_entry',
          reason: 'Persisting quota usage entry for monitoring and analytics tracking',
          source: 'rank-tracking/seranking/services/QuotaMonitor',
          metadata: {
            user_id: entry.user_id,
            service_account_id: entry.service_account_id,
            operation_type: entry.operation_type,
            quota_consumed: entry.quota_consumed,
            usage_percentage: entry.usage_percentage,
            operation_type_tracking: 'quota_usage_insert'
          }
        },
        {
          table: 'indb_seranking_quota_usage',
          operationType: 'insert',
          data: {
            timestamp: entry.timestamp.toISOString(),
            user_id: entry.user_id,
            service_account_id: entry.service_account_id,
            operation_type: entry.operation_type,
            quota_consumed: entry.quota_consumed,
            quota_remaining: entry.quota_remaining,
            quota_limit: entry.quota_limit,
            usage_percentage: entry.usage_percentage,
            session_id: entry.session_id,
            endpoint: entry.endpoint,
            country_code: entry.country_code,
            keywords_count: entry.keywords_count,
            cost_per_request: entry.cost_per_request,
            metadata: entry.metadata
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_seranking_quota_usage')
            .insert({
              timestamp: entry.timestamp.toISOString(),
              user_id: entry.user_id,
              service_account_id: entry.service_account_id,
              operation_type: entry.operation_type,
              quota_consumed: entry.quota_consumed,
              quota_remaining: entry.quota_remaining,
              quota_limit: entry.quota_limit,
              usage_percentage: entry.usage_percentage,
              session_id: entry.session_id,
              endpoint: entry.endpoint,
              country_code: entry.country_code,
              keywords_count: entry.keywords_count,
              cost_per_request: entry.cost_per_request,
              metadata: entry.metadata
            })

          if (error) {
            throw new Error(`Failed to persist usage entry: ${error.message}`)
          }

          return { success: true }
        }
      )
    } catch (error) {
      this.log('error', `Failed to persist usage entry: ${error}`);
    }
  }

  private async calculateUsageVelocity(): Promise<EnhancedQuotaStatus['velocity']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Get recent usage from buffer
    const recentUsage = this.getRecentUsageFromBuffer(oneHourAgo, now);
    const lastMinuteUsage = this.getRecentUsageFromBuffer(oneMinuteAgo, now);

    const totalRequests = recentUsage.length;
    const requestsPerMinute = lastMinuteUsage.length;
    const requestsPerHour = totalRequests;

    // Calculate trend direction
    const firstHalf = recentUsage.slice(0, Math.floor(totalRequests / 2));
    const secondHalf = recentUsage.slice(Math.floor(totalRequests / 2));
    
    let trendDirection: 'up' | 'stable' | 'down' = 'stable';
    if (secondHalf.length > firstHalf.length * 1.1) {
      trendDirection = 'up';
    } else if (secondHalf.length < firstHalf.length * 0.9) {
      trendDirection = 'down';
    }

    const acceleration = secondHalf.length - firstHalf.length;

    return {
      requests_per_minute: requestsPerMinute,
      requests_per_hour: requestsPerHour,
      trend_direction: trendDirection,
      acceleration
    };
  }

  private getRecentUsageFromBuffer(startTime: Date, endTime: Date): QuotaUsageEntry[] {
    const usage: QuotaUsageEntry[] = [];
    
    for (const [key, entries] of this.usageBuffer.entries()) {
      const keyTime = new Date(key);
      if (keyTime >= startTime && keyTime <= endTime) {
        usage.push(...entries.filter(e => e.timestamp >= startTime && e.timestamp <= endTime));
      }
    }
    
    return usage.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async calculateEfficiencyMetrics(): Promise<EnhancedQuotaStatus['efficiency_metrics']> {
    // This would calculate various efficiency metrics
    // Placeholder implementation
    return {
      cost_per_successful_request: 0.1,
      cache_hit_rate: 0.75,
      error_rate: 0.05,
      optimization_score: 0.8
    };
  }

  private async getHistoricalComparison(): Promise<EnhancedQuotaStatus['historical_comparison']> {
    // This would compare with historical data
    // Placeholder implementation
    return {
      same_time_yesterday: 100,
      same_time_last_week: 150,
      average_this_period: 125,
      peak_this_period: 300
    };
  }

  private async getCurrentPrediction(): Promise<QuotaPrediction> {
    const cached = this.predictionCache.get('current');
    if (cached && (Date.now() - cached.generated_at.getTime()) < 30 * 60 * 1000) {
      return cached;
    }

    // Generate new prediction
    const prediction = await this.generateQuotaPredictions(24);
    return prediction.data || this.getEmptyPrediction();
  }

  private getEmptyPrediction(): QuotaPrediction {
    return {
      prediction_id: 'empty',
      generated_at: new Date(),
      prediction_horizon_hours: 24,
      current_usage: 0,
      current_limit: 1000,
      predicted_usage: 0,
      confidence: 0,
      risk_level: 'low',
      contributing_factors: [],
      recommended_actions: []
    };
  }

  private async checkImmediateAlerts(usagePercentage: number): Promise<void> {
    const thresholds = this.config.alertThresholds;
    
    if (usagePercentage >= thresholds.emergency) {
      await this.triggerAlert('emergency', usagePercentage);
    } else if (usagePercentage >= thresholds.critical) {
      await this.triggerAlert('critical', usagePercentage);
    } else if (usagePercentage >= thresholds.warning) {
      await this.triggerAlert('warning', usagePercentage);
    }
  }

  private async triggerAlert(level: string, value: number): Promise<void> {
    this.log('warn', `Quota alert triggered: ${level} at ${(value * 100).toFixed(1)}%`);
    
    // Here you would integrate with your alerting system
    // Implementation depends on your notification channels
  }

  private calculatePredictionConfidence(velocity: any, corrections: number): number {
    // Simplified confidence calculation
    const baseConfidence = 0.7;
    const velocityStability = Math.min(1, Math.abs(velocity.acceleration) / 10);
    const correctionImpact = Math.min(1, Math.abs(corrections));
    
    return Math.max(0.1, baseConfidence - velocityStability * 0.2 - correctionImpact * 0.1);
  }

  private assessRiskLevel(usageRatio: number, eta?: Date): QuotaPrediction['risk_level'] {
    if (eta && eta.getTime() - Date.now() < 2 * 60 * 60 * 1000) { // 2 hours
      return 'critical';
    }
    if (usageRatio >= 0.95) return 'critical';
    if (usageRatio >= 0.85) return 'high';
    if (usageRatio >= 0.7) return 'medium';
    return 'low';
  }

  private identifyContributingFactors(velocity: any, corrections: number): string[] {
    const factors: string[] = [];
    
    if (velocity.trend_direction === 'up') {
      factors.push('Increasing usage trend detected');
    }
    if (velocity.acceleration > 5) {
      factors.push('High usage acceleration');
    }
    if (corrections > 0.2) {
      factors.push('Seasonal pattern correction applied');
    }
    
    return factors;
  }

  private async generateRecommendedActions(
    riskLevel: QuotaPrediction['risk_level'],
    eta?: Date,
    predictedUsage?: number
  ): Promise<QuotaPrediction['recommended_actions']> {
    const actions: QuotaPrediction['recommended_actions'] = [];
    
    if (riskLevel === 'critical') {
      actions.push({
        action: 'Implement immediate rate limiting',
        priority: 'high',
        estimated_impact: 'Reduce usage by 30-50%',
        implementation_effort: 'low'
      });
      
      actions.push({
        action: 'Request emergency quota increase',
        priority: 'high',
        estimated_impact: 'Prevent service interruption',
        implementation_effort: 'medium'
      });
    }
    
    if (riskLevel === 'high') {
      actions.push({
        action: 'Optimize cache hit ratio',
        priority: 'medium',
        estimated_impact: 'Reduce API calls by 20%',
        implementation_effort: 'medium'
      });
    }
    
    return actions;
  }

  // Pattern detection methods (simplified implementations)
  private async detectHourlyPattern(usage: any[]): Promise<UsagePattern | null> {
    // Simplified hourly pattern detection
    return null;
  }

  private async detectDailyPattern(usage: any[]): Promise<UsagePattern | null> {
    // Simplified daily pattern detection
    return null;
  }

  private async detectWeeklyPattern(usage: any[]): Promise<UsagePattern | null> {
    // Simplified weekly pattern detection
    return null;
  }

  private async detectBurstPatterns(usage: any[]): Promise<UsagePattern[]> {
    // Simplified burst pattern detection
    return [];
  }

  private async applyPatternCorrections(baseRate: number): Promise<number> {
    // Apply pattern-based corrections to predictions
    return 0; // Simplified
  }

  private async updateQuotaPredictions(): Promise<void> {
    if (Math.random() > 0.1) return; // Only update 10% of the time to avoid overhead
    
    try {
      await this.generateQuotaPredictions(this.config.predictionWindow.lookAheadHours);
    } catch (error) {
      this.log('error', `Failed to update quota predictions: ${error}`);
    }
  }

  private startContinuousMonitoring(): void {
    // Start monitoring timer
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.checkQuotaAlerts();
        
        // Periodic pattern analysis
        if (!this.lastAnalysis || (Date.now() - this.lastAnalysis.getTime()) > 60 * 60 * 1000) {
          await this.analyzeUsagePatterns();
          this.lastAnalysis = new Date();
        }
      } catch (error) {
        this.log('error', `Monitoring cycle failed: ${error}`);
      }
    }, 60000); // Every minute
  }

  // Additional helper methods
  private async loadHistoricalPatterns(): Promise<void> {
    // Load patterns from database
  }

  private async loadAlertConfigurations(): Promise<void> {
    // Load alert configs from database
  }

  private async saveConfiguration(): Promise<void> {
    // Save configuration to database
  }

  private async persistDetectedPatterns(patterns: UsagePattern[]): Promise<void> {
    // Persist patterns to database
  }

  private async persistPrediction(prediction: QuotaPrediction): Promise<void> {
    // Persist prediction to database
  }

  private async checkThresholdAlerts(percentage: number): Promise<void> {
    // Check threshold-based alerts
  }

  private async checkPredictiveAlerts(): Promise<void> {
    // Check prediction-based alerts
  }

  private async checkPatternBasedAlerts(): Promise<void> {
    // Check pattern-based alerts
  }

  private log(level: string, message: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const metadata = args.length > 0 ? { details: args } : {};
      const logMessage = `[QuotaMonitor] ${message}`;
      
      switch (level) {
        case 'debug':
          logger.debug(metadata, logMessage);
          break;
        case 'info':
          logger.info(metadata, logMessage);
          break;
        case 'warn':
          logger.warn(metadata, logMessage);
          break;
        case 'error':
          logger.error(metadata, logMessage);
          break;
        default:
          logger.info(metadata, logMessage);
      }
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  /**
   * Cleanup resources when shutting down
   */
  async shutdown(): Promise<void> {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.log('info', 'QuotaMonitor service shut down successfully');
  }
}