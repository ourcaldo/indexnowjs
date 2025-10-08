# SeRanking Integration & Keyword Bank Enhancement Plan

## Project Overview

This enhancement plan details the implementation of SeRanking API integration to enrich IndexNow Studio's rank tracking capabilities with comprehensive keyword intelligence including search volume, intent, competition metrics, and historical trend data.

## Current System Analysis

### Existing Keyword Tracking Architecture
- **`indb_keyword_keywords`**: Main keyword tracking table (user_id, domain_id, keyword, device_type, country_id, tags, is_active)
- **`indb_keyword_rank_history`**: Historical position data with dates
- **`indb_keyword_rankings`**: Latest position snapshots
- **`indb_keyword_domains`**: Domain management and verification
- **`indb_keyword_countries`**: Country/locale tracking support
- **`indb_keyword_usage`**: Usage quota tracking with database triggers

### Current Integration System
- **`indb_site_integration`**: Service integration management with API keys and quotas

## Enhancement Goals

1. **Keyword Intelligence**: Add search volume, competition, difficulty, and intent data to keyword tracking
2. **API Efficiency**: Implement keyword bank system to minimize external API calls
3. **Cost Optimization**: Cache SeRanking data locally to reduce API quota usage
4. **Data Enrichment**: Automatically enhance new keywords with market intelligence

## Technical Implementation Plan

### Phase 1: Database Schema Enhancement

#### 1.1 SeRanking Integration Record
**SQL Query to Execute in Supabase:**
```sql
-- Add SeRanking integration to existing indb_site_integration table
INSERT INTO "public"."indb_site_integration" (
    "service_name", 
    "apikey", 
    "api_url", 
    "api_quota_limit", 
    "api_quota_used", 
    "quota_reset_date", 
    "is_active"
) VALUES (
    'seranking_keyword_export',
    '952945a4-5d7a-4719-16cd-5e4b8b3892d6',
    'https://api.seranking.com',
    10000,
    0,
    CURRENT_DATE + INTERVAL '1 month',
    true
);
```

#### 1.2 Keyword Bank Table Creation
**SQL Query to Execute in Supabase:**
```sql
-- Create keyword bank table for cached SeRanking data
CREATE TABLE "public"."indb_keyword_bank" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "keyword" text NOT NULL,
    "country_id" uuid NOT NULL REFERENCES "public"."indb_keyword_countries"("id"),
    "language_code" text NOT NULL DEFAULT 'en',
    "is_data_found" boolean NOT NULL DEFAULT false,
    "volume" integer NULL,
    "cpc" numeric(10,2) NULL,
    "competition" numeric(3,2) NULL,
    "difficulty" integer NULL,
    "history_trend" jsonb NULL,
    "keyword_intent" text NULL,
    "data_updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "indb_keyword_bank_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "indb_keyword_bank_keyword_country_unique" UNIQUE ("keyword", "country_id", "language_code")
) TABLESPACE pg_default;

-- Add RLS policies for keyword bank
ALTER TABLE "public"."indb_keyword_bank" ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access for keyword data (cached data can be shared)
CREATE POLICY "keyword_bank_read_access" ON "public"."indb_keyword_bank"
    FOR SELECT USING (true);

-- Policy: System-level insert/update for API responses
CREATE POLICY "keyword_bank_system_write" ON "public"."indb_keyword_bank"
    FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX "idx_indb_keyword_bank_keyword" ON "public"."indb_keyword_bank" ("keyword");
CREATE INDEX "idx_indb_keyword_bank_country" ON "public"."indb_keyword_bank" ("country_id");
CREATE INDEX "idx_indb_keyword_bank_updated" ON "public"."indb_keyword_bank" ("data_updated_at");
```

#### 1.3 Keyword Table Enhancement
**SQL Query to Execute in Supabase:**
```sql
-- Add keyword intelligence columns and bank reference to existing keyword table
ALTER TABLE "public"."indb_keyword_keywords" 
ADD COLUMN "keyword_bank_id" uuid NULL,
ADD COLUMN "search_volume" integer NULL,
ADD COLUMN "cpc" numeric(10,2) NULL,
ADD COLUMN "competition" numeric(3,2) NULL,
ADD COLUMN "difficulty" integer NULL,
ADD COLUMN "keyword_intent" text NULL,
ADD COLUMN "history_trend" jsonb NULL,
ADD COLUMN "intelligence_updated_at" timestamp with time zone NULL,
ADD CONSTRAINT "fk_keyword_bank" 
    FOREIGN KEY ("keyword_bank_id") 
    REFERENCES "public"."indb_keyword_bank"("id") 
    ON DELETE SET NULL;

-- Add indexes for keyword bank relationships and intelligence data
CREATE INDEX "idx_indb_keyword_keywords_bank_id" 
    ON "public"."indb_keyword_keywords" ("keyword_bank_id");
CREATE INDEX "idx_indb_keyword_keywords_search_volume" 
    ON "public"."indb_keyword_keywords" ("search_volume");
CREATE INDEX "idx_indb_keyword_keywords_difficulty" 
    ON "public"."indb_keyword_keywords" ("difficulty");
```

### Phase 2: Backend Service Implementation

#### 2.1 Well-Refactored Service Architecture
**Complete File Structure:**
```
lib/integrations/seranking/
├── client/
│   ├── SeRankingApiClient.ts      # HTTP client with authentication
│   ├── ApiRequestBuilder.ts       # Request formatting and validation
│   └── RateLimiter.ts            # API rate limiting and throttling
├── services/
│   ├── SeRankingService.ts        # Core business logic orchestration  
│   ├── KeywordBankService.ts      # Keyword bank CRUD operations
│   ├── KeywordEnrichmentService.ts # Keyword intelligence workflow
│   ├── IntegrationService.ts      # Integration settings management
│   └── BulkProcessingService.ts   # Batch processing and queuing
├── validation/
│   ├── ApiResponseValidator.ts    # SeRanking response validation
│   ├── KeywordValidator.ts        # Keyword input validation
│   └── QuotaValidator.ts         # Usage quota validation
├── errors/
│   ├── SeRankingErrorHandler.ts   # Specialized error handling
│   ├── ApiErrorTypes.ts          # Error type definitions
│   └── ErrorRecoveryService.ts   # Retry and recovery logic
├── monitoring/
│   ├── ApiMetricsCollector.ts    # Usage metrics and performance
│   ├── QuotaMonitor.ts          # Quota usage monitoring
│   └── HealthChecker.ts         # Integration health checks
├── queue/
│   ├── EnrichmentQueue.ts        # Background job queue management
│   ├── JobProcessor.ts          # Individual job processing
│   └── QueueMonitor.ts          # Queue health and monitoring
├── types/
│   ├── SeRankingTypes.ts        # API request/response types
│   ├── KeywordBankTypes.ts      # Database entity types
│   └── ServiceTypes.ts          # Service interface types
└── index.ts                     # Barrel exports with facade pattern
```

#### 2.2 Service Responsibility Matrix

**Client Layer (`client/`):**
- **SeRankingApiClient**: HTTP requests, authentication, connection management
- **ApiRequestBuilder**: Request formatting, parameter validation, URL construction  
- **RateLimiter**: Request throttling, quota enforcement, retry delays

**Business Logic Layer (`services/`):**
- **SeRankingService**: Orchestrates API calls, manages integration state
- **KeywordBankService**: Database operations for keyword bank table
- **KeywordEnrichmentService**: End-to-end keyword intelligence workflow
- **IntegrationService**: Manages `indb_site_integration` settings and credentials
- **BulkProcessingService**: Handles batch operations and queue management

**Validation Layer (`validation/`):**
- **ApiResponseValidator**: Validates SeRanking API response structure and data
- **KeywordValidator**: Validates keyword inputs and country codes
- **QuotaValidator**: Checks usage limits and prevents quota exhaustion

**Error Handling Layer (`errors/`):**
- **SeRankingErrorHandler**: Specialized handling for SeRanking API errors
- **ApiErrorTypes**: Comprehensive error type definitions and codes
- **ErrorRecoveryService**: Retry logic, circuit breaker, fallback strategies

**Monitoring Layer (`monitoring/`):**
- **ApiMetricsCollector**: Tracks API usage, response times, success rates
- **QuotaMonitor**: Real-time quota usage tracking and alerting
- **HealthChecker**: Integration health status and diagnostics

**Queue Layer (`queue/`):**
- **EnrichmentQueue**: Manages background keyword enrichment jobs
- **JobProcessor**: Processes individual enrichment tasks
- **QueueMonitor**: Queue health, job status, and performance metrics

#### 2.3 Enhanced Enrichment Workflow
**Multi-Service Orchestration:**
```typescript
class KeywordEnrichmentService {
  constructor(
    private keywordBankService: KeywordBankService,
    private seRankingService: SeRankingService,
    private quotaValidator: QuotaValidator,
    private keywordValidator: KeywordValidator,
    private errorHandler: SeRankingErrorHandler,
    private metricsCollector: ApiMetricsCollector
  ) {}

  async enrichKeyword(keyword: string, countryCode: string): Promise<KeywordEnrichmentResult> {
    const startTime = Date.now();
    
    try {
      // 1. Input validation
      await this.keywordValidator.validateKeywordInput(keyword, countryCode);
      
      // 2. Quota check
      await this.quotaValidator.checkQuotaAvailability();
      
      // 3. Check keyword bank cache first
      const cachedData = await this.keywordBankService.getKeywordData(keyword, countryCode);
      
      if (cachedData && this.isFreshData(cachedData.data_updated_at)) {
        this.metricsCollector.recordCacheHit(Date.now() - startTime);
        return { data: cachedData, source: 'cache' };
      }
      
      // 4. Fetch from SeRanking API with error handling
      const freshData = await this.seRankingService.fetchKeywordData(keyword, countryCode);
      
      // 5. Validate API response
      const validatedData = await this.responseValidator.validateApiResponse(freshData);
      
      // 6. Update keyword bank with fresh data
      await this.keywordBankService.upsertKeywordData(validatedData);
      
      // 7. Update quota usage
      await this.quotaValidator.recordApiUsage();
      
      this.metricsCollector.recordApiCall(Date.now() - startTime, 'success');
      return { data: validatedData, source: 'api' };
      
    } catch (error) {
      await this.errorHandler.handleEnrichmentError(error, keyword, countryCode);
      this.metricsCollector.recordApiCall(Date.now() - startTime, 'error');
      throw error;
    }
  }

  async bulkEnrichKeywords(keywords: KeywordRequest[]): Promise<BulkEnrichmentResult> {
    // Queue-based bulk processing
    const jobId = await this.bulkProcessingService.queueBulkEnrichment(keywords);
    return { jobId, status: 'queued', estimatedCompletion: this.calculateEstimatedTime(keywords.length) };
  }
  
  private isFreshData(lastUpdate: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastUpdate > thirtyDaysAgo;
  }
}
```

#### 2.4 Comprehensive API Endpoints
**New API Route Structure:**
```
app/api/v1/integrations/seranking/
├── keyword-data/
│   ├── route.ts                    # GET: Single keyword intelligence
│   └── bulk/
│       └── route.ts               # POST: Bulk keyword enrichment
├── quota/
│   ├── status/route.ts            # GET: Current quota usage
│   ├── history/route.ts           # GET: Quota usage history
│   └── alerts/route.ts            # GET/POST: Quota alert settings
├── health/
│   ├── route.ts                   # GET: Integration health check
│   └── metrics/route.ts           # GET: Performance metrics
├── admin/
│   ├── integration/route.ts       # GET/PUT: Integration settings
│   ├── cache/
│   │   ├── stats/route.ts         # GET: Cache statistics
│   │   └── clear/route.ts         # DELETE: Clear cache
│   └── jobs/
│       ├── route.ts               # GET: Job queue status
│       └── [jobId]/route.ts       # GET: Individual job status
└── webhooks/
    └── quota-alerts/route.ts      # POST: Quota webhook endpoint
```

**Detailed API Specifications:**

**Single Keyword Intelligence** (`GET /api/v1/integrations/seranking/keyword-data`)
```typescript
// Query parameters
interface KeywordDataRequest {
  keyword: string;
  country_code?: string;
  language_code?: string;
  force_refresh?: boolean;
}

// Response
interface KeywordDataResponse {
  success: boolean;
  data: {
    keyword: string;
    country_code: string;
    is_data_found: boolean;
    volume: number | null;
    cpc: number | null;
    competition: number | null;
    difficulty: number | null;
    keyword_intent: string | null;
    history_trend: Record<string, number> | null;
    source: 'cache' | 'api';
    last_updated: string;
  };
  quota_remaining: number;
  cache_hit: boolean;
}
```

**Bulk Enrichment** (`POST /api/v1/integrations/seranking/keyword-data/bulk`)
```typescript
// Request body
interface BulkEnrichmentRequest {
  keywords: Array<{
    keyword: string;
    country_code?: string;
    language_code?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  callback_url?: string;
}

// Response
interface BulkEnrichmentResponse {
  success: boolean;
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  total_keywords: number;
  estimated_completion: string;
  quota_required: number;
  quota_available: number;
}
```

**Quota Status** (`GET /api/v1/integrations/seranking/quota/status`)
```typescript
interface QuotaStatusResponse {
  success: boolean;
  data: {
    current_usage: number;
    quota_limit: number;
    quota_remaining: number;
    usage_percentage: number;
    reset_date: string;
    daily_usage: Array<{
      date: string;
      usage: number;
    }>;
    alerts: {
      enabled: boolean;
      thresholds: number[];
    };
  };
}
```

### Phase 3: Database Integration Enhancements

#### 3.1 Automatic Keyword Enrichment Trigger
**SQL Query to Execute in Supabase:**
```sql
-- Function to automatically link keywords with bank data and populate intelligence fields
CREATE OR REPLACE FUNCTION link_keyword_to_bank()
RETURNS TRIGGER AS $$
DECLARE
    bank_record RECORD;
    country_code text;
BEGIN
    -- Get country code from country_id
    SELECT iso2_code INTO country_code 
    FROM indb_keyword_countries 
    WHERE id = NEW.country_id;
    
    -- Find matching keyword bank record with all intelligence data
    SELECT id, volume, cpc, competition, difficulty, keyword_intent, history_trend, data_updated_at
    INTO bank_record
    FROM indb_keyword_bank 
    WHERE keyword = NEW.keyword 
    AND country_code = COALESCE(country_code, 'us');
    
    -- Update keyword with bank reference and intelligence data if found
    IF bank_record.id IS NOT NULL THEN
        NEW.keyword_bank_id = bank_record.id;
        NEW.search_volume = bank_record.volume;
        NEW.cpc = bank_record.cpc;
        NEW.competition = bank_record.competition;
        NEW.difficulty = bank_record.difficulty;
        NEW.keyword_intent = bank_record.keyword_intent;
        NEW.history_trend = bank_record.history_trend;
        NEW.intelligence_updated_at = bank_record.data_updated_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic keyword-bank linking
CREATE TRIGGER trigger_link_keyword_to_bank
    BEFORE INSERT OR UPDATE ON indb_keyword_keywords
    FOR EACH ROW
    EXECUTE FUNCTION link_keyword_to_bank();
```

#### 3.2 Keyword Bank Update Trigger
**SQL Query to Execute in Supabase:**
```sql
-- Function to update keyword records when bank data changes
CREATE OR REPLACE FUNCTION update_keywords_on_bank_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp for related keywords
    UPDATE indb_keyword_keywords 
    SET updated_at = now()
    WHERE keyword_bank_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for keyword updates when bank data changes
CREATE TRIGGER trigger_update_keywords_on_bank_change
    AFTER UPDATE ON indb_keyword_bank
    FOR EACH ROW
    EXECUTE FUNCTION update_keywords_on_bank_change();
```

### Phase 4: Frontend Integration

#### 4.1 Enhanced Keyword Management Interface
**Components to Modify:**
- **Keyword Addition Form**: Show search volume and difficulty during keyword entry
- **Keyword List View**: Display enriched data (volume, CPC, competition) in table columns
- **Keyword Details Modal**: Full intelligence panel with historical trends
- **Bulk Import**: Automatic enrichment during CSV/bulk keyword imports

#### 4.2 New Intelligence Dashboard Widgets
**New Components:**
```
components/keyword-intelligence/
├── KeywordMetricsCard.tsx      # Volume, CPC, competition display
├── DifficultyIndicator.tsx     # Visual difficulty scoring
├── IntentBadge.tsx            # Keyword intent categorization
├── TrendChart.tsx             # Historical trend visualization
└── CompetitionMeter.tsx       # Competition level indicator
```

#### 4.3 API Quota Management UI
**Admin Interface Enhancements:**
- SeRanking API quota monitoring dashboard
- Usage alerts and notifications
- Manual keyword enrichment controls
- Bulk enrichment queue management

### Phase 5: Data Migration & Enrichment Strategy

#### 5.1 Existing Keywords Migration
**Background Job Implementation:**
1. **Inventory Existing Keywords**: Catalog all active keywords across all users
2. **Prioritize by Usage**: Enrich most-used keywords first
3. **Batch Processing**: Process in small batches to respect API limits
4. **Progress Tracking**: Maintain migration progress and error logs
5. **User Notification**: Inform users when their keywords are enriched

#### 5.2 Enrichment Scheduling
**Automated Enrichment Logic:**
- **New Keywords**: Immediate enrichment on creation
- **Existing Data**: Refresh every 30 days
- **High-Value Keywords**: Weekly updates for top-performing keywords
- **Bulk Operations**: Queue-based processing for large imports

### Phase 6: Integration Testing & Quality Assurance

#### 6.1 API Integration Testing
- **SeRanking API Response Validation**: Test all response formats and edge cases
- **Rate Limiting Compliance**: Verify API call limits and throttling
- **Error Handling**: Test API failures, timeouts, and invalid responses
- **Quota Management**: Test quota tracking and reset functionality

#### 6.2 Database Performance Testing
- **Keyword Bank Query Performance**: Test lookup speed with large datasets
- **Trigger Performance**: Verify trigger efficiency with bulk operations
- **Index Effectiveness**: Validate query performance with proper indexing
- **Data Integrity**: Test foreign key relationships and constraints

#### 6.3 User Experience Testing
- **Keyword Addition Flow**: Test enrichment during keyword creation
- **Intelligence Display**: Verify accurate data presentation
- **Loading States**: Test UI responsiveness during API calls
- **Error States**: Test graceful handling of API failures

## Implementation Timeline

### Week 1: Foundation
- [ ] Execute database schema changes (indb_keyword_bank table)
- [ ] Add SeRanking integration record
- [ ] Create basic SeRanking API client
- [ ] Implement KeywordBankService foundation

### Week 2: Core Services
- [ ] Complete SeRanking API integration
- [ ] Implement keyword enrichment flow
- [ ] Create database triggers for automatic linking
- [ ] Build API endpoints for keyword intelligence

### Week 3: Frontend Integration
- [ ] Enhance keyword management interface
- [ ] Create intelligence display components
- [ ] Implement quota monitoring dashboard
- [ ] Add enrichment progress indicators

### Week 4: Migration & Testing
- [ ] Implement existing keyword migration
- [ ] Execute comprehensive testing suite
- [ ] Performance optimization and tuning
- [ ] Documentation and deployment preparation

## Risk Mitigation

### API Dependency Risks
- **Fallback Strategy**: Graceful degradation when SeRanking API unavailable
- **Quota Management**: Strict limits to prevent quota exhaustion
- **Caching Strategy**: 30-day cache reduces API dependency
- **Alternative Sources**: Architecture allows adding multiple keyword intelligence providers

### Data Quality Risks
- **Validation Layer**: Comprehensive data validation for API responses
- **Monitoring**: Alert system for unusual data patterns
- **Manual Override**: Admin ability to correct or supplement data
- **Audit Trail**: Track data source and update history

### Performance Risks
- **Bulk Processing**: Queue-based system prevents UI blocking
- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Multiple cache layers for performance
- **Progressive Enhancement**: Core features work without intelligence data

## Success Metrics

### Technical Metrics
- **API Response Time**: < 500ms for cached data, < 2s for fresh API calls
- **Database Performance**: Keyword queries under 100ms
- **Cache Hit Rate**: > 80% of keyword requests served from cache
- **API Quota Efficiency**: < 50% quota usage for typical user activity

### Business Metrics
- **User Engagement**: Increased keyword addition and management activity
- **Feature Adoption**: > 70% of active users accessing intelligence features
- **Data Coverage**: > 90% of active keywords enriched with intelligence data
- **User Satisfaction**: Positive feedback on keyword insights and decision-making

## Conclusion

This enhancement transforms IndexNow Studio from a basic rank tracker into a comprehensive keyword intelligence platform. By implementing the SeRanking integration with a local keyword bank cache, users gain valuable market insights while maintaining system performance and cost efficiency.

The architecture prioritizes data freshness, API efficiency, and user experience while providing a foundation for additional intelligence providers in the future. The phased implementation approach ensures minimal disruption to existing functionality while delivering immediate value to users.

---

**Document Status**: Ready for Implementation  
**Technical Complexity**: Medium-High  
**Estimated Development Time**: 4 weeks  
**Database Changes Required**: Yes (SQL queries provided)  
**API Integration Required**: Yes (SeRanking API)

## Tables schema's that relevant in this features (for full tables, see project.md)

INSERT INTO "public"."indb_site_integration" ("id", "service_name", "apikey", "api_quota_limit", "api_quota_used", "quota_reset_date", "is_active", "created_at", "updated_at", "api_url") VALUES ('22f72381-c158-431c-b600-ea82752ff045', 'seranking_keyword_export', '952945a4-5d7a-4719-16cd-5e4b8b3892d6', '10000', '0', '2025-10-17', 'true', '2025-09-17 16:51:00.926251+00', '2025-09-17 16:51:00.926251+00', 'https://api.seranking.com'), ('8aee4b32-1022-4928-8d9c-ad7254a31134', 'firecrawl', 'fc-92197574a4e549799cc43d0a16c7fdde', '50674', '0', null, 'true', '2025-09-05 04:21:46.756802+00', '2025-09-15 12:35:03.451+00', 'https://api.firecrawl.dev');

INSERT INTO "public"."indb_keyword_keywords" ("id", "user_id", "domain_id", "keyword", "device_type", "country_id", "tags", "is_active", "created_at", "updated_at", "last_check_date", "keyword_bank_id", "search_volume", "cpc", "competition", "difficulty", "keyword_intent", "history_trend", "intelligence_updated_at") VALUES ('64b12962-46de-4bc2-b889-be7949b45ca9', '915f50e5-0902-466a-b1af-bdf19d789722', '9506479c-6d94-4d81-93f3-65f9180f1032', 'nexjob', 'desktop', '1650e5e6-6ed5-44b3-b253-4353714be8e6', '{}', 'true', '2025-09-05 04:25:34.513254+00', '2025-09-15 12:35:04.713+00', '2025-09-15', null, null, null, null, null, null, null, null);

INSERT INTO "public"."indb_keyword_bank" ("id", "keyword", "country_code", "language_code", "is_data_found", "volume", "cpc", "competition", "difficulty", "history_trend", "keyword_intent", "data_updated_at", "created_at", "updated_at") VALUES ('b7152871-fcf2-415c-9fca-8d56db4a24d8', 'cetta', 'us', 'en', 'true', '140', null, null, '5', '{"2024-08-01": 90, "2024-09-01": 70, "2024-10-01": 90, "2024-11-01": 90, "2024-12-01": 110, "2025-01-01": 140, "2025-02-01": 140, "2025-03-01": 140, "2025-04-01": 210, "2025-05-01": 210, "2025-06-01": 170, "2025-07-01": 210}', null, '2025-09-17 20:42:27.088+00', '2025-09-17 20:42:27.134004+00', '2025-09-17 20:42:27.134004+00'), ('d179d56b-d951-4a97-80ab-469436a03017', 'nexjob', 'us', 'en', 'true', '170', null, null, '11', '{"2024-08-01": 50, "2024-09-01": 880, "2024-10-01": 590, "2024-11-01": 90, "2024-12-01": 10, "2025-01-01": 20, "2025-02-01": 20, "2025-03-01": 30, "2025-04-01": 10, "2025-05-01": 20, "2025-06-01": 10, "2025-07-01": 30}', null, '2025-09-17 20:31:29.32+00', '2025-09-17 20:31:29.34523+00', '2025-09-17 20:31:29.34523+00');