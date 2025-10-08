/**
 * SeRanking Database Integration Test Suite
 * 
 * This test suite verifies that the SeRanking database integration
 * and keyword bank operations work correctly with the actual database schema.
 * 
 * Run this test after setting up Supabase environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY  
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { KeywordBankService } from '../lib/rank-tracking/seranking/services/KeywordBankService';
import { IntegrationService } from '../lib/rank-tracking/seranking/services/IntegrationService';
import { supabaseAdmin } from '../lib/database/supabase';
import { SeRankingKeywordData } from '../lib/rank-tracking/seranking/types/SeRankingTypes';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  error?: any;
  data?: any;
}

class SeRankingDatabaseIntegrationTest {
  private keywordBankService: KeywordBankService;
  private integrationService: IntegrationService;
  private testResults: TestResult[] = [];

  constructor() {
    this.keywordBankService = new KeywordBankService();
    this.integrationService = new IntegrationService();
  }

  /**
   * Run all database integration tests
   */
  async runAllTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
    summary: string;
  }> {
    console.log('🧪 Starting SeRanking Database Integration Tests...\n');

    // Check environment setup first
    await this.testEnvironmentSetup();

    // Test database connectivity
    await this.testDatabaseConnectivity();

    // Test Keyword Bank Service methods
    await this.testKeywordBankOperations();

    // Test Integration Service methods
    await this.testIntegrationServiceOperations();

    // Test schema compatibility
    await this.testSchemaCompatibility();

    // Test error handling
    await this.testErrorHandling();

    // Generate summary
    const summary = this.generateTestSummary();
    
    console.log('\n📊 Test Summary:');
    console.log(summary.summary);
    
    return summary;
  }

  /**
   * Test environment setup
   */
  private async testEnvironmentSetup(): Promise<void> {
    try {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ];

      const missingVars: string[] = [];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingVars.push(envVar);
        }
      }

      if (missingVars.length > 0) {
        this.addTestResult('Environment Setup', false, 
          `Missing environment variables: ${missingVars.join(', ')}. Please set up Supabase credentials.`);
        return;
      }

      this.addTestResult('Environment Setup', true, 'All required environment variables are set');
    } catch (error) {
      this.addTestResult('Environment Setup', false, 'Failed to check environment variables', error);
    }
  }

  /**
   * Test database connectivity
   */
  private async testDatabaseConnectivity(): Promise<void> {
    try {
      // Test basic Supabase connection
      const { data, error } = await supabaseAdmin
        .from('indb_keyword_bank')
        .select('count')
        .limit(1);

      if (error) {
        this.addTestResult('Database Connectivity', false, 
          'Failed to connect to Supabase database', error);
        return;
      }

      this.addTestResult('Database Connectivity', true, 
        'Successfully connected to Supabase database');

    } catch (error) {
      this.addTestResult('Database Connectivity', false, 
        'Database connection error', error);
    }
  }

  /**
   * Test Keyword Bank Service operations
   */
  private async testKeywordBankOperations(): Promise<void> {
    const testKeyword = 'test-seo-keyword-' + Date.now();
    const testCountry = 'us';
    const testLanguage = 'en';

    // Test data that matches SeRanking API response structure
    const testApiData: SeRankingKeywordData = {
      is_data_found: true,
      volume: 1000,
      cpc: 2.5,
      competition: 0.8,
      difficulty: 45,
      history_trend: [100, 120, 110, 130, 140]
    };

    try {
      // Test 1: Store keyword data
      console.log('Testing keyword storage...');
      const storeResult = await this.keywordBankService.storeKeywordData(
        testKeyword, testCountry, testApiData, testLanguage
      );

      if (storeResult.success) {
        this.addTestResult('Store Keyword Data', true, 
          'Successfully stored keyword data', storeResult.data);
      } else {
        this.addTestResult('Store Keyword Data', false, 
          'Failed to store keyword data', storeResult.error);
        return; // Skip subsequent tests if store fails
      }

      // Test 2: Retrieve keyword data
      console.log('Testing keyword retrieval...');
      const retrieveResult = await this.keywordBankService.getKeywordData(
        testKeyword, testCountry, testLanguage
      );

      if (retrieveResult) {
        this.addTestResult('Retrieve Keyword Data', true, 
          'Successfully retrieved keyword data', retrieveResult);
        
        // Verify data integrity
        const dataMatch = (
          retrieveResult.keyword === testKeyword.toLowerCase() &&
          retrieveResult.country_code === testCountry.toLowerCase() &&
          retrieveResult.volume === testApiData.volume &&
          retrieveResult.cpc === testApiData.cpc
        );

        this.addTestResult('Data Integrity Check', dataMatch, 
          dataMatch ? 'Stored and retrieved data match' : 'Data mismatch detected');
      } else {
        this.addTestResult('Retrieve Keyword Data', false, 
          'Failed to retrieve stored keyword data');
      }

      // Test 3: Batch operations
      console.log('Testing batch operations...');
      const batchKeywords = [
        testKeyword + '-batch-1',
        testKeyword + '-batch-2',
        testKeyword + '-batch-3'
      ];

      const batchData = batchKeywords.map(keyword => ({
        keyword,
        countryCode: testCountry,
        apiData: { ...testApiData, volume: Math.floor(Math.random() * 1000) },
        languageCode: testLanguage
      }));

      const batchResult = await this.keywordBankService.storeKeywordDataBatch(batchData);
      
      this.addTestResult('Batch Store Operation', batchResult.success_rate > 0.8, 
        `Batch operation success rate: ${(batchResult.success_rate * 100).toFixed(1)}%`, batchResult);

      // Test 4: Cache status check
      console.log('Testing cache status...');
      const cacheStatus = await this.keywordBankService.checkCacheStatus(
        batchKeywords, testCountry, testLanguage
      );

      this.addTestResult('Cache Status Check', 
        cacheStatus.cached_keywords === batchKeywords.length,
        `Cache hit rate: ${(cacheStatus.cache_hit_rate * 100).toFixed(1)}%`, cacheStatus);

      // Test 5: Query operations
      console.log('Testing query operations...');
      const queryResult = await this.keywordBankService.queryKeywordData({
        keyword: testKeyword.split('-')[0], // Partial match
        country_code: testCountry,
        language_code: testLanguage
      });

      this.addTestResult('Query Operations', queryResult.success,
        `Query found ${queryResult.data?.length || 0} keywords`, queryResult);

      // Cleanup test data
      await this.cleanupTestData([testKeyword, ...batchKeywords], testCountry, testLanguage);

    } catch (error) {
      this.addTestResult('Keyword Bank Operations', false, 
        'Unexpected error during keyword bank testing', error);
    }
  }

  /**
   * Test Integration Service operations
   */
  private async testIntegrationServiceOperations(): Promise<void> {
    try {
      // Test 1: Get integration settings
      console.log('Testing integration settings retrieval...');
      const settingsResult = await this.integrationService.getIntegrationSettings();

      this.addTestResult('Get Integration Settings', settingsResult.success,
        settingsResult.success ? 'Successfully retrieved integration settings' : 'Failed to get integration settings',
        settingsResult.data);

      // Test 2: Test integration health
      console.log('Testing integration health check...');
      const healthResult = await this.integrationService.testIntegration();

      this.addTestResult('Integration Health Check', healthResult.success,
        `Health check status: ${healthResult.data?.status || 'unknown'}`, healthResult.data);

      // Test 3: Record API usage
      console.log('Testing API usage recording...');
      const usageResult = await this.integrationService.recordApiUsage(1, {
        operationType: 'test_operation',
        responseTime: 150,
        successful: true,
        metadata: { test: true }
      });

      this.addTestResult('Record API Usage', usageResult.success,
        usageResult.success ? 'Successfully recorded API usage' : 'Failed to record API usage',
        usageResult.data);

    } catch (error) {
      this.addTestResult('Integration Service Operations', false,
        'Unexpected error during integration service testing', error);
    }
  }

  /**
   * Test schema compatibility
   */
  private async testSchemaCompatibility(): Promise<void> {
    try {
      // Test 1: Verify indb_keyword_bank schema
      console.log('Testing keyword bank schema...');
      const { data: keywordBankSchema, error: kbError } = await supabaseAdmin
        .from('indb_keyword_bank')
        .select('*')
        .limit(1);

      this.addTestResult('Keyword Bank Schema', !kbError,
        kbError ? 'Schema access failed' : 'Schema accessible');

      // Test 2: Verify indb_site_integration schema
      console.log('Testing site integration schema...');
      const { data: integrationSchema, error: intError } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'seranking_keyword_export')
        .limit(1);

      this.addTestResult('Site Integration Schema', !intError,
        intError ? 'Schema access failed' : 'Schema accessible');

      // Test 3: Verify usage logs schema (optional table)
      console.log('Testing usage logs schema...');
      const { data: usageSchema, error: usageError } = await supabaseAdmin
        .from('indb_seranking_usage_logs')
        .select('*')
        .limit(1);

      this.addTestResult('Usage Logs Schema', !usageError,
        usageError ? 'Schema access failed (table may not exist)' : 'Schema accessible');

    } catch (error) {
      this.addTestResult('Schema Compatibility', false,
        'Error during schema compatibility testing', error);
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    try {
      // Test 1: Invalid keyword data
      console.log('Testing error handling...');
      const invalidResult = await this.keywordBankService.getKeywordData(
        '', 'invalid_country', 'invalid_language'
      );

      this.addTestResult('Invalid Data Handling', invalidResult === null,
        'Properly handled invalid input data');

      // Test 2: Non-existent keyword
      const nonExistentResult = await this.keywordBankService.getKeywordData(
        'definitely-does-not-exist-keyword-12345', 'us', 'en'
      );

      this.addTestResult('Non-existent Data Handling', nonExistentResult === null,
        'Properly handled non-existent keyword lookup');

    } catch (error) {
      this.addTestResult('Error Handling', false,
        'Error handling test failed', error);
    }
  }

  /**
   * Clean up test data
   */
  private async cleanupTestData(keywords: string[], countryCode: string, languageCode: string): Promise<void> {
    try {
      const normalizedKeywords = keywords.map(k => k.toLowerCase());
      
      const { error } = await supabaseAdmin
        .from('indb_keyword_bank')
        .delete()
        .in('keyword', normalizedKeywords)
        .eq('country_code', countryCode.toLowerCase())
        .eq('language_code', languageCode.toLowerCase());

      if (!error) {
        console.log(`🧹 Cleaned up ${keywords.length} test keywords`);
      }
    } catch (error) {
      console.warn('Failed to cleanup test data:', error);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(testName: string, success: boolean, message: string, data?: any): void {
    const result: TestResult = {
      testName,
      success,
      message,
      ...(data && { data }),
      ...((!success && data) && { error: data })
    };

    this.testResults.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    const summary = `
📊 Test Results Summary:
  Total Tests: ${totalTests}
  Passed: ${passedTests} (${((passedTests/totalTests) * 100).toFixed(1)}%)
  Failed: ${failedTests} (${((failedTests/totalTests) * 100).toFixed(1)}%)

${failedTests > 0 ? '❌ Failed Tests:' : '✅ All tests passed!'}
${this.testResults
  .filter(r => !r.success)
  .map(r => `  - ${r.testName}: ${r.message}`)
  .join('\n')}

🔍 Detailed Results:
${this.testResults
  .map(r => `  ${r.success ? '✅' : '❌'} ${r.testName}: ${r.message}`)
  .join('\n')}
`;

    return {
      totalTests,
      passedTests,
      failedTests,
      results: this.testResults,
      summary
    };
  }
}

/**
 * Main test runner function
 */
export async function runSeRankingDatabaseTests() {
  const tester = new SeRankingDatabaseIntegrationTest();
  return await tester.runAllTests();
}

/**
 * CLI test runner (if running directly)
 */
if (require.main === module) {
  runSeRankingDatabaseTests()
    .then(results => {
      console.log('\n🎯 Database Integration Test Complete');
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}