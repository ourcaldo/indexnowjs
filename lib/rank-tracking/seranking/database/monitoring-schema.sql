-- Comprehensive Database Schema for SeRanking Monitoring Services
-- This file defines all tables needed for ApiMetricsCollector, QuotaMonitor, and HealthChecker services

-- ================================================================
-- API METRICS COLLECTOR TABLES
-- ================================================================

-- Raw API call metrics for detailed analysis
CREATE TABLE IF NOT EXISTS indb_seranking_metrics_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  duration_ms INTEGER NOT NULL,
  request_size INTEGER,
  response_size INTEGER,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  error_type VARCHAR(50),
  error_message TEXT,
  user_id UUID,
  quota_remaining INTEGER,
  rate_limit_remaining INTEGER,
  retry_attempt INTEGER DEFAULT 0,
  country_code VARCHAR(5),
  keyword_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_raw_timestamp ON indb_seranking_metrics_raw (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_raw_endpoint ON indb_seranking_metrics_raw (endpoint, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_raw_status ON indb_seranking_metrics_raw (status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_raw_user ON indb_seranking_metrics_raw (user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_raw_country ON indb_seranking_metrics_raw (country_code, timestamp DESC) WHERE country_code IS NOT NULL;

-- Aggregated metrics for faster querying and dashboards
CREATE TABLE IF NOT EXISTS indb_seranking_metrics_aggregated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TIMESTAMPTZ NOT NULL,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  timeout_requests INTEGER NOT NULL DEFAULT 0,
  rate_limited_requests INTEGER NOT NULL DEFAULT 0,
  average_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
  median_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
  p95_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
  p99_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  error_breakdown JSONB NOT NULL DEFAULT '{}',
  quota_utilization_avg DECIMAL(5,4) NOT NULL DEFAULT 0,
  total_keywords_processed INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  peak_rps DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period, period_type)
);

-- Indexes for aggregated metrics
CREATE INDEX IF NOT EXISTS idx_seranking_metrics_agg_period ON indb_seranking_metrics_aggregated (period_type, period DESC);

-- Alert configurations for metrics monitoring
CREATE TABLE IF NOT EXISTS indb_seranking_metrics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('error_rate', 'response_time', 'cache_miss_rate', 'quota_threshold')),
  threshold_value DECIMAL(10,4) NOT NULL,
  period_minutes INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email'],
  last_triggered TIMESTAMPTZ,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- QUOTA MONITOR TABLES
-- ================================================================

-- Detailed quota usage tracking
CREATE TABLE IF NOT EXISTS indb_seranking_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  service_account_id UUID,
  operation_type VARCHAR(50) NOT NULL DEFAULT 'api_request',
  quota_consumed INTEGER NOT NULL,
  quota_remaining INTEGER NOT NULL,
  quota_limit INTEGER NOT NULL,
  usage_percentage DECIMAL(6,4) NOT NULL,
  session_id VARCHAR(100),
  endpoint VARCHAR(255),
  country_code VARCHAR(5),
  keywords_count INTEGER,
  cost_per_request DECIMAL(10,6),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quota usage
CREATE INDEX IF NOT EXISTS idx_seranking_quota_usage_timestamp ON indb_seranking_quota_usage (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_quota_usage_user ON indb_seranking_quota_usage (user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seranking_quota_usage_operation ON indb_seranking_quota_usage (operation_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_quota_usage_session ON indb_seranking_quota_usage (session_id, timestamp DESC) WHERE session_id IS NOT NULL;

-- Usage pattern detection and analysis
CREATE TABLE IF NOT EXISTS indb_seranking_usage_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(100) UNIQUE NOT NULL,
  pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('hourly', 'daily', 'weekly', 'seasonal', 'burst')),
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pattern_data JSONB NOT NULL,
  predictions JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quota predictions and forecasting
CREATE TABLE IF NOT EXISTS indb_seranking_quota_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id VARCHAR(100) UNIQUE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prediction_horizon_hours INTEGER NOT NULL,
  current_usage INTEGER NOT NULL,
  current_limit INTEGER NOT NULL,
  predicted_usage INTEGER NOT NULL,
  exhaustion_eta TIMESTAMPTZ,
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  contributing_factors TEXT[] NOT NULL DEFAULT '{}',
  recommended_actions JSONB NOT NULL,
  accuracy_score DECIMAL(4,3),
  actual_usage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for predictions
CREATE INDEX IF NOT EXISTS idx_seranking_quota_predictions_generated ON indb_seranking_quota_predictions (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_quota_predictions_risk ON indb_seranking_quota_predictions (risk_level, generated_at DESC);

-- Quota alert configurations and history
CREATE TABLE IF NOT EXISTS indb_seranking_quota_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  threshold_percentage DECIMAL(5,4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email'],
  escalation_rules JSONB NOT NULL DEFAULT '{}',
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- HEALTH CHECKER TABLES
-- ================================================================

-- Comprehensive health check results
CREATE TABLE IF NOT EXISTS indb_seranking_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_name VARCHAR(100) NOT NULL,
  check_type VARCHAR(20) NOT NULL CHECK (check_type IN ('api', 'database', 'cache', 'queue', 'dependency', 'custom')),
  dependency_level VARCHAR(20) NOT NULL CHECK (dependency_level IN ('critical', 'important', 'optional')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'critical')),
  response_time INTEGER NOT NULL,
  error_message TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  diagnostics JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for health checks
CREATE INDEX IF NOT EXISTS idx_seranking_health_checks_timestamp ON indb_seranking_health_checks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_health_checks_service ON indb_seranking_health_checks (service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_health_checks_status ON indb_seranking_health_checks (status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_health_checks_level ON indb_seranking_health_checks (dependency_level, timestamp DESC);

-- System incidents tracking
CREATE TABLE IF NOT EXISTS indb_seranking_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(100) UNIQUE NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  component VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  recovery_actions TEXT[] DEFAULT '{}',
  impact_description TEXT,
  root_cause_analysis TEXT,
  prevention_measures TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for incidents
CREATE INDEX IF NOT EXISTS idx_seranking_incidents_status ON indb_seranking_incidents (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_incidents_severity ON indb_seranking_incidents (severity, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_incidents_component ON indb_seranking_incidents (component, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_incidents_assigned ON indb_seranking_incidents (assigned_to, status, started_at DESC) WHERE assigned_to IS NOT NULL;

-- Recovery actions tracking
CREATE TABLE IF NOT EXISTS indb_seranking_recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id VARCHAR(100) UNIQUE NOT NULL,
  incident_id UUID REFERENCES indb_seranking_incidents(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT NOT NULL,
  execution_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executing', 'completed', 'failed', 'skipped')),
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  impact_description TEXT,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_actions TEXT[],
  executed_at TIMESTAMPTZ,
  executed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance bottleneck analysis
CREATE TABLE IF NOT EXISTS indb_seranking_performance_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  component VARCHAR(100) NOT NULL,
  bottleneck_type VARCHAR(50) NOT NULL CHECK (bottleneck_type IN ('cpu', 'memory', 'network', 'database', 'api_limit', 'cache', 'queue')),
  severity_score DECIMAL(5,2) NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
  impact_description TEXT NOT NULL,
  root_cause_analysis TEXT,
  optimization_suggestions TEXT[] NOT NULL DEFAULT '{}',
  estimated_improvement TEXT,
  implementation_effort VARCHAR(20) CHECK (implementation_effort IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'planned', 'in_progress', 'completed', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- SHARED MONITORING TABLES
-- ================================================================

-- System-wide configuration and settings
CREATE TABLE IF NOT EXISTS indb_seranking_monitoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('threshold', 'interval', 'notification', 'feature_flag')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_name, config_key)
);

-- Notification history and tracking
CREATE TABLE IF NOT EXISTS indb_seranking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('alert', 'incident', 'recovery', 'prediction', 'maintenance')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  service_name VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  channels_sent TEXT[] NOT NULL DEFAULT '{}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  metadata JSONB DEFAULT '{}',
  related_incident_id UUID,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_seranking_notifications_type ON indb_seranking_notifications (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_notifications_severity ON indb_seranking_notifications (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seranking_notifications_status ON indb_seranking_notifications (delivery_status, created_at DESC);

-- ================================================================
-- DATA RETENTION AND CLEANUP
-- ================================================================

-- Create function for automatic data cleanup (optional - can be handled by cron jobs)
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Clean up raw metrics older than 90 days
  DELETE FROM indb_seranking_metrics_raw 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up quota usage older than 180 days
  DELETE FROM indb_seranking_quota_usage 
  WHERE created_at < NOW() - INTERVAL '180 days';
  
  -- Clean up health checks older than 30 days
  DELETE FROM indb_seranking_health_checks 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Clean up old notifications older than 365 days
  DELETE FROM indb_seranking_notifications 
  WHERE created_at < NOW() - INTERVAL '365 days';
  
  -- Clean up resolved incidents older than 180 days
  DELETE FROM indb_seranking_incidents 
  WHERE status = 'closed' AND closed_at < NOW() - INTERVAL '180 days';
  
  -- Clean up old predictions older than 30 days
  DELETE FROM indb_seranking_quota_predictions 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================

-- Current system health overview
CREATE OR REPLACE VIEW v_seranking_system_health AS
SELECT 
  service_name,
  check_type,
  dependency_level,
  status,
  response_time,
  timestamp,
  ROW_NUMBER() OVER (PARTITION BY service_name ORDER BY timestamp DESC) as rn
FROM indb_seranking_health_checks
WHERE timestamp > NOW() - INTERVAL '1 hour'
AND rn = 1;

-- Recent API performance metrics
CREATE OR REPLACE VIEW v_seranking_api_performance AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
  AVG(duration_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_response_time,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  COUNT(*) FILTER (WHERE cache_hit = false) as cache_misses
FROM indb_seranking_metrics_raw
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Current quota status
CREATE OR REPLACE VIEW v_seranking_quota_status AS
SELECT 
  operation_type,
  COUNT(*) as total_operations,
  SUM(quota_consumed) as total_quota_consumed,
  AVG(usage_percentage) as avg_usage_percentage,
  MAX(usage_percentage) as peak_usage_percentage,
  MAX(timestamp) as last_activity
FROM indb_seranking_quota_usage
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY operation_type
ORDER BY total_quota_consumed DESC;

-- ================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_raw_endpoint_status_time ON indb_seranking_metrics_raw (endpoint, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quota_usage_user_operation_time ON indb_seranking_quota_usage (user_id, operation_type, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_checks_service_status_time ON indb_seranking_health_checks (service_name, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_component_status ON indb_seranking_incidents (component, status, started_at DESC);

-- Partial indexes for active monitoring
CREATE INDEX IF NOT EXISTS idx_active_alerts_metrics ON indb_seranking_metrics_alerts (alert_type, threshold_value) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_active_quota_alerts ON indb_seranking_quota_alerts (alert_type, threshold_percentage) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_open_incidents ON indb_seranking_incidents (severity, component, started_at DESC) WHERE status IN ('open', 'investigating');

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE indb_seranking_metrics_raw IS 'Raw API metrics for detailed analysis and debugging';
COMMENT ON TABLE indb_seranking_metrics_aggregated IS 'Pre-aggregated metrics for fast dashboard queries';
COMMENT ON TABLE indb_seranking_quota_usage IS 'Detailed quota usage tracking with multi-dimensional analysis';
COMMENT ON TABLE indb_seranking_usage_patterns IS 'Detected usage patterns for predictive analysis';
COMMENT ON TABLE indb_seranking_quota_predictions IS 'Quota exhaustion predictions and forecasts';
COMMENT ON TABLE indb_seranking_health_checks IS 'Comprehensive health check results for all system components';
COMMENT ON TABLE indb_seranking_incidents IS 'System incidents and outage tracking';
COMMENT ON TABLE indb_seranking_recovery_actions IS 'Automated and manual recovery actions tracking';
COMMENT ON TABLE indb_seranking_performance_analysis IS 'Performance bottleneck analysis and optimization recommendations';
COMMENT ON TABLE indb_seranking_monitoring_config IS 'Service configuration and feature flags';
COMMENT ON TABLE indb_seranking_notifications IS 'Notification delivery tracking and audit trail';

-- Grant necessary permissions (adjust based on your user management)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seranking_monitoring_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seranking_monitoring_user;