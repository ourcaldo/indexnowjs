/**
 * Integration Service Tests
 * Test suite for SeRanking Integration Service functionality
 */

import { IntegrationService } from '../IntegrationService';
import { SeRankingErrorType } from '../../types/SeRankingTypes';
import { ISeRankingApiClient } from '../../types/ServiceTypes';

// Mock Supabase admin client
jest.mock('../../../../database/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          })),
          order: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn()
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

// Mock API Client
const createMockApiClient = (healthy = true): jest.Mocked<ISeRankingApiClient> => ({
  fetchKeywordData: jest.fn().mockResolvedValue([]),
  testConnection: jest.fn().mockResolvedValue({
    status: healthy ? 'healthy' : 'unhealthy',
    last_check: new Date(),
    response_time: 100
  }),
  getQuotaStatus: jest.fn().mockResolvedValue({
    current_usage: 50,
    quota_limit: 1000,
    quota_remaining: 950,
    usage_percentage: 0.05,
    reset_date: new Date(),
    is_approaching_limit: false,
    is_quota_exceeded: false
  }),
  isHealthy: jest.fn().mockResolvedValue(healthy)
});

describe('IntegrationService', () => {
  let service: IntegrationService;
  let mockApiClient: jest.Mocked<ISeRankingApiClient>;
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient = createMockApiClient(true);
    
    // Get the mocked supabaseAdmin
    const { supabaseAdmin } = require('../../../../database/supabase');
    mockSupabaseAdmin = supabaseAdmin;
    
    service = new IntegrationService({
      defaultQuotaLimit: 1000,
      quotaWarningThreshold: 0.8,
      quotaCriticalThreshold: 0.95,
      logLevel: 'error' // Suppress logs in tests
    }, mockApiClient);
  });

  describe('getIntegrationSettings', () => {
    it('should return default settings when no integration found', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
            })
          })
        })
      });

      const result = await service.getIntegrationSettings('test-user');

      expect(result.success).toBe(true);
      expect(result.data?.service_name).toBe('seranking');
      expect(result.data?.api_quota_limit).toBe(1000);
      expect(result.data?.is_active).toBe(false);
      expect(result.metadata?.source).toBe('default');
    });

    it('should return database settings when integration exists', async () => {
      const mockIntegrationData = {
        service_name: 'seranking',
        api_url: 'https://api.seranking.com',
        api_quota_limit: 5000,
        api_quota_used: 100,
        quota_reset_date: '2024-01-01T00:00:00Z',
        is_active: true
      };

      mockSupabaseAdmin.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockIntegrationData, error: null })
            })
          })
        })
      });

      const result = await service.getIntegrationSettings('test-user');

      expect(result.success).toBe(true);
      expect(result.data?.api_quota_limit).toBe(5000);
      expect(result.data?.is_active).toBe(true);
      expect(result.metadata?.source).toBe('database');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Database error' } 
              })
            })
          })
        })
      });

      const result = await service.getIntegrationSettings('test-user');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(SeRankingErrorType.UNKNOWN_ERROR);
    });
  });

  describe('updateIntegrationSettings', () => {
    it('should update settings successfully', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          error: null
        })
      });

      const result = await service.updateIntegrationSettings({
        api_quota_limit: 2000,
        is_active: true
      }, 'test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle update errors', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          error: { message: 'Update failed' }
        })
      });

      const result = await service.updateIntegrationSettings({
        api_quota_limit: 2000
      }, 'test-user');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(SeRankingErrorType.UNKNOWN_ERROR);
    });
  });

  describe('recordApiUsage', () => {
    beforeEach(() => {
      // Mock getIntegrationSettings for recordApiUsage
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'indb_site_integration') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      api_quota_limit: 1000,
                      api_quota_used: 100
                    },
                    error: null
                  })
                })
              })
            }),
            update: () => ({
              eq: () => ({
                eq: jest.fn().mockReturnValue({ error: null })
              })
            })
          };
        } else if (table === 'indb_seranking_usage_logs') {
          return {
            insert: jest.fn().mockReturnValue({ error: null })
          };
        }
      });
    });

    it('should record successful API usage', async () => {
      const result = await service.recordApiUsage(5, {
        operationType: 'keyword_export',
        userId: 'test-user',
        responseTime: 200,
        successful: true
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.quota_remaining).toBe(895); // 1000 - 100 - 5
    });

    it('should record failed API usage', async () => {
      const result = await service.recordApiUsage(3, {
        operationType: 'keyword_export',
        userId: 'test-user',
        successful: false
      });

      expect(result.success).toBe(true);
    });
  });

  describe('resetQuotaUsage', () => {
    it('should reset quota usage successfully', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: jest.fn().mockReturnValue({ error: null })
          })
        })
      });

      const result = await service.resetQuotaUsage('test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle reset errors', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            eq: jest.fn().mockReturnValue({ error: { message: 'Reset failed' } })
          })
        })
      });

      const result = await service.resetQuotaUsage('test-user');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(SeRankingErrorType.UNKNOWN_ERROR);
    });
  });

  describe('testIntegration', () => {
    it('should return healthy status with API client', async () => {
      // Mock getIntegrationSettings
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'indb_site_integration') {
          if (mockSupabaseAdmin.from.mock.calls.length <= 2) { // First call is for getIntegrationSettings
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: jest.fn().mockResolvedValue({
                      data: { is_active: true },
                      error: null
                    })
                  })
                })
              })
            };
          } else { // Subsequent calls for updateHealthStatus
            return {
              update: () => ({
                eq: () => ({
                  eq: jest.fn().mockReturnValue({ error: null })
                })
              })
            };
          }
        }
        return mockSupabaseAdmin.from();
      });

      const result = await service.testIntegration('test-user');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
      expect(mockApiClient.testConnection).toHaveBeenCalled();
    });

    it('should return unhealthy status when integration is inactive', async () => {
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'indb_site_integration') {
          if (mockSupabaseAdmin.from.mock.calls.length <= 2) {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: jest.fn().mockResolvedValue({
                      data: { is_active: false },
                      error: null
                    })
                  })
                })
              })
            };
          } else {
            return {
              update: () => ({
                eq: () => ({
                  eq: jest.fn().mockReturnValue({ error: null })
                })
              })
            };
          }
        }
        return mockSupabaseAdmin.from();
      });

      const result = await service.testIntegration('test-user');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('unhealthy');
      expect(result.data?.error_message).toContain('Integration is not active');
    });
  });

  describe('validateApiKey', () => {
    it('should return invalid for empty API key', async () => {
      const result = await service.validateApiKey('');

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
    });

    it('should return valid for healthy API connection', async () => {
      const result = await service.validateApiKey('valid-api-key-123');

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
      expect(result.data?.keyInfo?.permissions).toEqual(['keyword_export']);
    });

    it('should return invalid for unhealthy API connection', async () => {
      mockApiClient = createMockApiClient(false);
      service = new IntegrationService({}, mockApiClient);

      const result = await service.validateApiKey('invalid-api-key');

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
    });

    it('should validate format when no API client available', async () => {
      service = new IntegrationService({}, undefined);

      const validResult = await service.validateApiKey('valid_api_key_123456789012345');
      expect(validResult.data?.isValid).toBe(true);

      const invalidResult = await service.validateApiKey('short');
      expect(invalidResult.data?.isValid).toBe(false);
    });
  });

  describe('getQuotaStatus', () => {
    beforeEach(() => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  api_quota_limit: 1000,
                  api_quota_used: 800,
                  quota_reset_date: '2024-01-01T00:00:00Z'
                },
                error: null
              })
            })
          })
        })
      });
    });

    it('should return current quota status', async () => {
      const result = await service.getQuotaStatus('test-user');

      expect(result.success).toBe(true);
      expect(result.data?.current_usage).toBe(800);
      expect(result.data?.quota_limit).toBe(1000);
      expect(result.data?.quota_remaining).toBe(200);
      expect(result.data?.usage_percentage).toBe(0.8);
      expect(result.data?.is_approaching_limit).toBe(true); // 80% >= 80% threshold
      expect(result.data?.is_quota_exceeded).toBe(false);
    });
  });

  describe('checkQuotaAvailable', () => {
    beforeEach(() => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  api_quota_limit: 1000,
                  api_quota_used: 900,
                  quota_reset_date: '2024-01-01T00:00:00Z'
                },
                error: null
              })
            })
          })
        })
      });
    });

    it('should allow request when quota is available', async () => {
      const result = await service.checkQuotaAvailable(50, 'test-user');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
      expect(result.data?.remaining).toBe(100);
    });

    it('should deny request when quota is exceeded', async () => {
      const result = await service.checkQuotaAvailable(200, 'test-user');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.reason).toBe('Quota exceeded');
    });
  });

  describe('getUsageReport', () => {
    beforeEach(() => {
      const mockUsageLogs = [
        {
          operation_type: 'keyword_export',
          request_count: 10,
          successful_requests: 9,
          failed_requests: 1,
          response_time_ms: 150,
          date: '2024-01-01',
          timestamp: '2024-01-01T10:00:00Z'
        },
        {
          operation_type: 'keyword_export',
          request_count: 15,
          successful_requests: 14,
          failed_requests: 1,
          response_time_ms: 200,
          date: '2024-01-02',
          timestamp: '2024-01-02T10:00:00Z'
        }
      ];

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'indb_seranking_usage_logs') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => ({
                    order: jest.fn().mockResolvedValue({
                      data: mockUsageLogs,
                      error: null
                    })
                  })
                })
              })
            })
          };
        } else if (table === 'indb_site_integration') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      api_quota_limit: 1000,
                      api_quota_used: 25
                    },
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabaseAdmin.from();
      });
    });

    it('should generate monthly usage report', async () => {
      const result = await service.getUsageReport('monthly', 'test-user');

      expect(result.success).toBe(true);
      expect(result.data?.total_requests).toBe(25);
      expect(result.data?.successful_requests).toBe(23);
      expect(result.data?.failed_requests).toBe(2);
      expect(result.data?.success_rate).toBe(92); // (23/25) * 100
      expect(result.data?.quota_usage.used).toBe(25);
      expect(result.data?.daily_breakdown).toHaveLength(2);
      expect(result.data?.operation_breakdown.keyword_export.requests).toBe(25);
      expect(result.data?.peak_usage_day).toBe('2024-01-02');
      expect(result.data?.peak_usage_count).toBe(15);
    });
  });

  describe('enableQuotaAlerts', () => {
    it('should enable quota alerts with specified thresholds', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          error: null
        })
      });

      const result = await service.enableQuotaAlerts([0.75, 0.9], 'test-user');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      
      const upsertCall = mockSupabaseAdmin.from().upsert.mock.calls[0][0];
      expect(upsertCall.alert_settings.quota_alerts).toHaveLength(2);
      expect(upsertCall.alert_settings.quota_alerts[0].threshold).toBe(0.75);
      expect(upsertCall.alert_settings.quota_alerts[1].threshold).toBe(0.9);
    });
  });
});

// Integration Tests
describe('IntegrationService Integration Tests', () => {
  let service: IntegrationService;

  beforeEach(() => {
    service = new IntegrationService({
      defaultQuotaLimit: 1000,
      logLevel: 'error'
    });
  });

  it('should handle complete integration workflow', async () => {
    // This would test the full workflow in a real environment
    // For now, just verify service instantiation
    expect(service).toBeDefined();
  });

  it('should handle configuration validation', () => {
    const service1 = new IntegrationService({
      defaultQuotaLimit: 5000,
      quotaWarningThreshold: 0.7,
      quotaCriticalThreshold: 0.85
    });
    
    const service2 = new IntegrationService({
      defaultQuotaLimit: 2000,
      quotaWarningThreshold: 0.9,
      quotaCriticalThreshold: 0.98
    });

    expect(service1).toBeDefined();
    expect(service2).toBeDefined();
  });
});