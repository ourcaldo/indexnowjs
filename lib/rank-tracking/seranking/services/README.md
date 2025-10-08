# SeRanking Integration Service

This service provides complete management of SeRanking API integration settings, quota management, and usage tracking.

## Overview

The IntegrationService handles all aspects of SeRanking API integration including:
- API key storage and validation
- Quota usage tracking and enforcement
- Health monitoring and status checking
- Configuration management
- Usage analytics and reporting
- Quota alerts and notifications

## Architecture

The service follows the established architectural patterns in the SeRanking integration system:
- Implements the `IIntegrationService` interface
- Uses dependency injection for API client
- Provides comprehensive error handling
- Includes proper logging and monitoring
- Follows the `ServiceResponse<T>` pattern for return values

## Database Schema

Two new tables have been added to support integration management:

### `indb_site_integration`
Stores integration configuration and settings:
- `id`: Primary key
- `user_id`: Associated user
- `service_name`: Service identifier ('seranking')
- `api_key`: Encrypted API key
- `api_url`: API endpoint URL
- `api_quota_limit`: Monthly quota limit
- `api_quota_used`: Current usage count
- `quota_reset_date`: When quota resets
- `is_active`: Integration status
- `rate_limits`: Rate limiting configuration (JSON)
- `alert_settings`: Alert configuration (JSON)
- `health_status`: Current health status
- Timestamps for creation and updates

### `indb_seranking_usage_logs`
Tracks detailed usage metrics:
- `id`: Primary key
- `integration_id`: Reference to integration
- `operation_type`: Type of operation (e.g., 'keyword_export')
- `request_count`: Number of requests made
- `successful_requests`: Successful request count
- `failed_requests`: Failed request count
- `response_time_ms`: Response time in milliseconds
- `timestamp`: Exact time of operation
- `date`: Date for aggregation
- `metadata`: Additional metadata (JSON)

## Key Features

### Quota Management
- Real-time quota tracking
- Automatic quota reset handling
- Configurable warning and critical thresholds
- Quota availability checking before API calls
- Usage recording with detailed metrics

### Health Monitoring
- API connection testing
- Response time tracking
- Service status monitoring
- Automatic health checks
- Integration status reporting

### Usage Analytics
- Daily, weekly, and monthly reports
- Operation-level breakdown
- Success rate analysis
- Peak usage identification
- Historical trend data

### Alert System
- Configurable quota thresholds
- Real-time alert triggering
- Alert suppression to prevent spam
- Multi-threshold support (warning, critical)

## Usage Examples

### Basic Usage

```typescript
import { IntegrationService } from './IntegrationService';
import { SeRankingApiClient } from '../client/SeRankingApiClient';

// Initialize service
const apiClient = new SeRankingApiClient(config);
const service = new IntegrationService({
  defaultQuotaLimit: 10000,
  quotaWarningThreshold: 0.8,
  quotaCriticalThreshold: 0.95
}, apiClient);

// Check quota before making requests
const quotaCheck = await service.checkQuotaAvailable(10, 'user-123');
if (quotaCheck.data?.allowed) {
  // Proceed with API call
  await service.recordApiUsage(10, {
    operationType: 'keyword_export',
    userId: 'user-123',
    responseTime: 150,
    successful: true
  });
}
```

### Configuration Management

```typescript
// Update integration settings
await service.updateIntegrationSettings({
  api_quota_limit: 15000,
  is_active: true,
  rate_limits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000
  },
  alert_settings: {
    quota_alerts: [
      { threshold: 0.8, enabled: true },
      { threshold: 0.95, enabled: true }
    ],
    error_notifications: true,
    performance_alerts: true
  }
}, 'user-123');
```

### Health Monitoring

```typescript
// Test integration health
const healthResult = await service.testIntegration('user-123');
console.log('Health Status:', healthResult.data?.status);
console.log('Response Time:', healthResult.data?.response_time, 'ms');

// Validate API key
const keyValidation = await service.validateApiKey('your-api-key');
if (keyValidation.data?.isValid) {
  console.log('API key is valid');
  console.log('Permissions:', keyValidation.data.keyInfo?.permissions);
}
```

### Usage Reporting

```typescript
// Generate monthly usage report
const report = await service.getUsageReport('monthly', 'user-123');
console.log('Total Requests:', report.data?.total_requests);
console.log('Success Rate:', report.data?.success_rate + '%');
console.log('Peak Usage Day:', report.data?.peak_usage_day);
console.log('Daily Breakdown:', report.data?.daily_breakdown);
```

## Configuration Options

The service accepts the following configuration options:

```typescript
interface IntegrationServiceConfig {
  defaultQuotaLimit: number;              // Default monthly quota (10000)
  defaultResetInterval: 'daily' | 'monthly'; // Quota reset interval ('monthly')
  quotaWarningThreshold: number;          // Warning threshold (0.8 = 80%)
  quotaCriticalThreshold: number;         // Critical threshold (0.95 = 95%)
  healthCheckInterval: number;            // Health check interval in minutes (30)
  usageReportingInterval: number;         // Usage reporting interval in minutes (60)
  enableAutoQuotaReset: boolean;          // Enable automatic quota reset (true)
  enableUsageAlerts: boolean;             // Enable usage alerts (true)
  logLevel: 'debug' | 'info' | 'warn' | 'error'; // Logging level ('info')
}
```

## Error Handling

The service includes comprehensive error handling:
- Database connection errors
- API authentication failures
- Quota exceeded scenarios
- Network connectivity issues
- Invalid configuration errors

All methods return `ServiceResponse<T>` objects with success/error indicators and detailed error information.

## Testing

The service includes comprehensive test coverage:
- Unit tests for all public methods
- Mock implementations for dependencies
- Error scenario testing
- Integration workflow testing

Run tests using the provided test file:
```bash
# Note: Adjust test runner based on your project setup
npm test -- IntegrationService.test.ts
```

For manual testing, use the provided example:
```typescript
import { runManualTests } from './IntegrationServiceExample';
await runManualTests();
```

## Dependencies

- `supabaseAdmin`: Database operations
- `ISeRankingApiClient`: API integration (optional)
- SeRanking type definitions
- Database type definitions

## Database Migrations

When deploying, ensure the following database tables are created:
1. `indb_site_integration`
2. `indb_seranking_usage_logs`

Table schemas are defined in `lib/database/database-types.ts`.

## Performance Considerations

- Quota checks are optimized for frequent calls
- Health checks are cached to avoid API spam
- Usage logging is non-blocking
- Database queries use appropriate indexes
- Periodic tasks are rate-limited

## Security

- API keys are stored encrypted
- Database queries use parameterized statements
- User isolation enforced through user_id filtering
- Sensitive information excluded from logs
- Rate limiting prevents abuse

## Monitoring

The service provides built-in monitoring:
- API response time tracking
- Success/failure rate metrics
- Quota utilization monitoring
- Alert generation for thresholds
- Health status reporting

## Future Enhancements

Potential improvements:
- Redis caching for high-traffic scenarios
- Webhook integration for real-time alerts
- Advanced analytics and forecasting
- Multi-service integration support
- Custom alert channels (Slack, email, SMS)