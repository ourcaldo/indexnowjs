# Resilient Services

Resilient service wrappers that integrate resilience mechanisms (Circuit Breaker, Exponential Backoff, Fallback Handler) with existing services.

## Usage Examples

### 1. Resilient Database Operations

```typescript
import { ResilientSupabaseService } from '@/lib/services/resilient';

// Simple fetch with automatic retry and circuit breaking
const user = await ResilientSupabaseService.fetchOne(
  'indb_auth_user_profiles',
  { user_id: 'user-123' }
);

// Insert with resilience
const newOrder = await ResilientSupabaseService.insert(
  'indb_payment_orders',
  { user_id: 'user-123', amount: 10000, status: 'pending' }
);

// Batch fetch with resilience
const keywords = await ResilientSupabaseService.fetchMany(
  'indb_rank_tracking_keywords',
  { user_id: 'user-123' },
  { limit: 100, orderBy: 'created_at', ascending: false }
);

// For operations with SecureServiceRoleWrapper (maintains security):
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';

const result = await ResilientOperationExecutor.executeDatabase(
  () => SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_fetch_users',
      reason: 'Admin viewing user list',
      source: '/api/v1/admin/users'
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'select',
      columns: ['*'],
      whereConditions: {}
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('*');
      if (error) throw error;
      return data;
    }
  ),
  'admin-fetch-users'
);
```

### 2. Resilient SERP API Calls

```typescript
import { ResilientSerpApiService } from '@/lib/services/resilient';

// Single ranking check with cache fallback
const result = await ResilientSerpApiService.checkRanking({
  keyword: 'seo tools',
  location: 'US',
  device: 'desktop',
  domain: 'example.com'
});

// Batch ranking checks with rate limiting
const results = await ResilientSerpApiService.batchCheckRankings([
  { keyword: 'seo tools', location: 'US' },
  { keyword: 'keyword tracker', location: 'UK' },
  { keyword: 'rank checker', location: 'CA' }
]);

// Search volume with caching
const volume = await ResilientSerpApiService.getSearchVolume('seo tools', 'US');
```

### 3. Direct Resilience Utilities

```typescript
import { ResilientOperationExecutor, CircuitBreakerManager, BackoffStrategies } from '@/lib/resilience';

// Execute any operation with resilience
const result = await ResilientOperationExecutor.execute(
  async () => {
    // Your operation here
    return await externalApiCall();
  },
  {
    serviceName: 'my-service',
    circuitBreaker: true,
    retryConfig: {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000
    },
    fallbackStrategies: [
      { type: 'cached', ttl: 300000 },
      { type: 'default', value: defaultValue }
    ],
    cacheKey: 'my-cache-key'
  }
);

// Check circuit breaker status
const metrics = CircuitBreakerManager.getBreaker('my-service').getMetrics();
console.log('Circuit breaker state:', metrics.state);

// Manual retry with backoff
const data = await BackoffStrategies.rateLimit.execute(
  async () => await rateLimitedApiCall(),
  'rate-limited-operation'
);
```

### 4. Integration with SecureServiceRoleWrapper

Wrap SecureServiceRoleWrapper calls with ResilientOperationExecutor to maintain security while adding resilience:

```typescript
import { ResilientOperationExecutor } from '@/lib/resilience';
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper';
import { supabaseAdmin } from '@/lib/database/supabase';

// All security features are preserved:
// - Audit logging
// - RLS policies
// - Admin authentication
// - Operation context tracking

const result = await ResilientOperationExecutor.executeDatabase(
  () => SecureServiceRoleWrapper.executeSecureOperation(
    {
      userId: adminUser.id,
      operation: 'admin_fetch_users',
      reason: 'Admin viewing user list',
      source: '/api/v1/admin/users',
      metadata: { filters: { role: 'user' } }
    },
    {
      table: 'indb_auth_user_profiles',
      operationType: 'select',
      columns: ['*'],
      whereConditions: { role: 'user' }
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('*')
        .eq('role', 'user');
      if (error) throw error;
      return data;
    }
  ),
  'admin-fetch-users'
);
```

## Benefits

1. **Automatic Retry** - Failed operations are retried with exponential backoff
2. **Circuit Breaking** - Prevents cascade failures by stopping requests to failing services
3. **Graceful Degradation** - Falls back to cached data when services are unavailable
4. **Security Preserved** - All security features (RLS, audit logging) remain intact
5. **Monitoring Ready** - Built-in metrics and logging for observability

## Configuration

Default configurations are optimized for common use cases, but can be customized:

- **Database Operations**: 2 retries, 500ms initial delay, 5s max delay
- **External APIs**: 5 retries, 2s initial delay, 60s max delay
- **SERP API**: 10 retries, 5s initial delay, 5min max delay (handles rate limits)
- **Payment Operations**: 2 retries, 2s initial delay, 10s max delay (fail-fast)
