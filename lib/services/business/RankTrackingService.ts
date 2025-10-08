/**
 * Rank Tracking Service for IndexNow Studio
 * Business logic for managing keyword rank tracking and monitoring
 */

import { SupabaseService } from '../external/SupabaseService';
import { RANK_TRACKING } from '@/lib/core/constants/AppConstants';

export interface RankKeyword {
  id: string;
  userId: string;
  keyword: string;
  domain: string;
  country: string;
  device: 'desktop' | 'mobile' | 'tablet';
  searchEngine: 'google' | 'bing' | 'yahoo';
  targetUrl?: string;
  tags: string[];
  isActive: boolean;
  currentPosition?: number;
  previousPosition?: number;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankHistory {
  id: string;
  keywordId: string;
  position: number;
  checkedAt: Date;
  searchResults?: any;
}

export interface RankTrackingDomain {
  id: string;
  userId: string;
  domain: string;
  name: string;
  isActive: boolean;
  keywordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankCheckRequest {
  keywordIds: string[];
  forceRefresh?: boolean;
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
}

export interface KeywordUsage {
  totalKeywords: number;
  activeKeywords: number;
  keywordLimit: number;
  usagePercentage: number;
  remainingKeywords: number;
}

export class RankTrackingService {
  private supabaseService: SupabaseService;

  constructor(supabaseService: SupabaseService) {
    this.supabaseService = supabaseService;
  }

  /**
   * Create a new keyword for tracking
   */
  async createKeyword(userId: string, keywordData: {
    keyword: string;
    domain: string;
    country: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    searchEngine?: 'google' | 'bing' | 'yahoo';
    targetUrl?: string;
    tags?: string[];
  }): Promise<RankKeyword> {
    const data = {
      user_id: userId,
      keyword: keywordData.keyword.trim(),
      domain: keywordData.domain,
      country: keywordData.country,
      device: keywordData.device || 'desktop',
      search_engine: keywordData.searchEngine || 'google',
      target_url: keywordData.targetUrl,
      tags: keywordData.tags || [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: keyword, error } = await this.supabaseService.insert('indb_rank_keywords', data);
    
    if (error || !keyword) {
      throw new Error(`Failed to create keyword: ${error?.message}`);
    }

    return this.mapDatabaseKeywordToModel(keyword);
  }

  /**
   * Get keyword by ID
   */
  async getKeyword(keywordId: string, userId?: string): Promise<RankKeyword | null> {
    const filters = userId ? { id: keywordId, user_id: userId } : { id: keywordId };
    const { data, error } = await this.supabaseService.query('indb_rank_keywords', { filters });
    
    if (error || !data || data.length === 0) {
      return null;
    }

    return this.mapDatabaseKeywordToModel(data[0]);
  }

  /**
   * Get user keywords with filtering and pagination
   */
  async getUserKeywords(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      domain?: string;
      country?: string;
      device?: string;
      searchEngine?: string;
      tags?: string[];
      isActive?: boolean;
      search?: string;
    } = {}
  ): Promise<{ keywords: RankKeyword[]; total: number }> {
    const { page = 1, limit = 10, domain, country, device, searchEngine, tags, isActive, search } = options;
    const offset = (page - 1) * limit;
    
    const filters: any = { user_id: userId };
    if (domain) filters.domain = domain;
    if (country) filters.country = country;
    if (device) filters.device = device;
    if (searchEngine) filters.search_engine = searchEngine;
    if (isActive !== undefined) filters.is_active = isActive;

    let query = this.supabaseService.getClient()
      .from('indb_rank_keywords')
      .select('*', { count: 'exact' });

    // Apply basic filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply tag filtering
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Apply search
    if (search) {
      query = query.or(`keyword.ilike.%${search}%, domain.ilike.%${search}%`);
    }

    // Apply ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch keywords: ${error.message}`);
    }

    const keywords = data?.map(keyword => this.mapDatabaseKeywordToModel(keyword)) || [];
    
    return {
      keywords,
      total: count || 0,
    };
  }

  /**
   * Update keyword
   */
  async updateKeyword(
    keywordId: string,
    userId: string,
    updates: Partial<RankKeyword>
  ): Promise<RankKeyword> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.keyword) updateData.keyword = updates.keyword.trim();
    if (updates.domain) updateData.domain = updates.domain;
    if (updates.country) updateData.country = updates.country;
    if (updates.device) updateData.device = updates.device;
    if (updates.searchEngine) updateData.search_engine = updates.searchEngine;
    if (updates.targetUrl !== undefined) updateData.target_url = updates.targetUrl;
    if (updates.tags) updateData.tags = updates.tags;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await this.supabaseService.update(
      'indb_rank_keywords',
      updateData,
      { id: keywordId, user_id: userId }
    );

    if (error || !data || data.length === 0) {
      throw new Error(`Failed to update keyword: ${error?.message}`);
    }

    return this.mapDatabaseKeywordToModel(data[0]);
  }

  /**
   * Delete keywords
   */
  async deleteKeywords(keywordIds: string[], userId: string): Promise<number> {
    const { error, count } = await this.supabaseService.delete('indb_rank_keywords', {
      id: keywordIds,
      user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to delete keywords: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Add tags to keywords
   */
  async addTagsToKeywords(
    keywordIds: string[],
    userId: string,
    tags: string[]
  ): Promise<number> {
    const { data: keywords } = await this.supabaseService.query('indb_rank_keywords', {
      filters: { id: keywordIds, user_id: userId },
    });

    if (!keywords || keywords.length === 0) return 0;

    let updatedCount = 0;
    for (const keyword of keywords) {
      const existingTags = keyword.tags || [];
      const newTags = Array.from(new Set([...existingTags, ...tags]));
      
      if (newTags.length !== existingTags.length) {
        await this.supabaseService.update(
          'indb_rank_keywords',
          { tags: newTags, updated_at: new Date().toISOString() },
          { id: keyword.id }
        );
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Check ranks for keywords
   */
  async checkRanks(request: RankCheckRequest): Promise<RankCheckResult[]> {
    const results: RankCheckResult[] = [];

    for (const keywordId of request.keywordIds) {
      try {
        const keyword = await this.getKeyword(keywordId);
        if (!keyword) {
          results.push({
            keywordId,
            keyword: 'Unknown',
            domain: 'Unknown',
            position: -1,
            positionChange: 0,
            checkedAt: new Date(),
            success: false,
            error: 'Keyword not found',
          });
          continue;
        }

        // Check if we should skip if recently checked and not forcing refresh
        if (!request.forceRefresh && keyword.lastChecked) {
          const timeSinceLastCheck = Date.now() - keyword.lastChecked.getTime();
          const oneHour = 60 * 60 * 1000;
          
          if (timeSinceLastCheck < oneHour) {
            results.push({
              keywordId: keyword.id,
              keyword: keyword.keyword,
              domain: keyword.domain,
              position: keyword.currentPosition || -1,
              previousPosition: keyword.previousPosition,
              positionChange: (keyword.currentPosition || 0) - (keyword.previousPosition || 0),
              targetUrl: keyword.targetUrl,
              checkedAt: keyword.lastChecked,
              success: true,
            });
            continue;
          }
        }

        // Perform rank check using ScrapingDog API or similar service
        const rankResult = await this.performRankCheck(keyword);
        
        // Update keyword with new position
        await this.updateKeywordPosition(keyword.id, rankResult.position);
        
        // Save rank history
        await this.saveRankHistory(keyword.id, rankResult.position, rankResult.searchResults);

        results.push({
          keywordId: keyword.id,
          keyword: keyword.keyword,
          domain: keyword.domain,
          position: rankResult.position,
          previousPosition: keyword.currentPosition,
          positionChange: rankResult.position - (keyword.currentPosition || 0),
          targetUrl: keyword.targetUrl,
          actualUrl: rankResult.actualUrl,
          checkedAt: new Date(),
          success: true,
        });

        // Add delay between checks to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          keywordId,
          keyword: 'Unknown',
          domain: 'Unknown',
          position: -1,
          positionChange: 0,
          checkedAt: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get rank history for a keyword
   */
  async getRankHistory(
    keywordId: string,
    options: {
      days?: number;
      limit?: number;
    } = {}
  ): Promise<RankHistory[]> {
    const { days = 30, limit = 100 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabaseService.query('indb_rank_history', {
      filters: { keyword_id: keywordId },
      orderBy: { column: 'checked_at', ascending: false },
      limit,
    });

    if (error) {
      throw new Error(`Failed to fetch rank history: ${error.message}`);
    }

    return data?.map(history => ({
      id: history.id,
      keywordId: history.keyword_id,
      position: history.position,
      checkedAt: new Date(history.checked_at),
      searchResults: history.search_results,
    })) || [];
  }

  /**
   * Get user domains
   */
  async getUserDomains(userId: string): Promise<RankTrackingDomain[]> {
    // Get distinct domains from keywords
    const { data: keywords } = await this.supabaseService.query('indb_rank_keywords', {
      filters: { user_id: userId },
      select: 'domain',
    });

    if (!keywords) return [];

    const domainCounts = keywords.reduce((acc: any, keyword: any) => {
      acc[keyword.domain] = (acc[keyword.domain] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(domainCounts).map(([domain, count]) => ({
      id: domain,
      userId,
      domain,
      name: domain,
      isActive: true,
      keywordCount: count as number,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Get keyword usage statistics
   */
  async getKeywordUsage(userId: string): Promise<KeywordUsage> {
    const { data, count } = await this.supabaseService.query('indb_rank_keywords', {
      filters: { user_id: userId },
      select: 'id, is_active',
    });

    const totalKeywords = count || 0;
    const activeKeywords = data?.filter(k => k.is_active).length || 0;
    
    // Get user's keyword limit from their package
    const { data: userProfile } = await this.supabaseService.query('indb_user_profiles', {
      filters: { user_id: userId },
      select: 'keyword_limit',
    });

    const keywordLimit = userProfile?.[0]?.keyword_limit || 10;
    const usagePercentage = keywordLimit > 0 ? Math.round((totalKeywords / keywordLimit) * 100) : 0;
    const remainingKeywords = Math.max(0, keywordLimit - totalKeywords);

    return {
      totalKeywords,
      activeKeywords,
      keywordLimit,
      usagePercentage,
      remainingKeywords,
    };
  }

  /**
   * Get available countries for rank tracking
   */
  getAvailableCountries(): Array<{ code: string; name: string }> {
    return Object.entries(RANK_TRACKING.COUNTRIES).map(([code, name]) => ({
      code,
      name,
    }));
  }

  /**
   * Perform actual rank check using external API
   */
  private async performRankCheck(keyword: RankKeyword): Promise<{
    position: number;
    actualUrl?: string;
    searchResults?: any;
  }> {
    try {
      // This would integrate with ScrapingDog API or similar service
      // For now, return mock data
      const mockPosition = Math.floor(Math.random() * 100) + 1;
      
      return {
        position: mockPosition,
        actualUrl: `https://${keyword.domain}/page`,
        searchResults: {
          totalResults: 1000000,
          searchTime: 0.5,
        },
      };
    } catch (error) {
      throw new Error(`Rank check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update keyword position
   */
  private async updateKeywordPosition(keywordId: string, newPosition: number): Promise<void> {
    // Get current position to set as previous
    const { data: currentKeyword } = await this.supabaseService.query('indb_rank_keywords', {
      filters: { id: keywordId },
      select: 'current_position',
    });

    const previousPosition = currentKeyword?.[0]?.current_position;

    await this.supabaseService.update('indb_rank_keywords', {
      current_position: newPosition,
      previous_position: previousPosition,
      last_checked: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { id: keywordId });
  }

  /**
   * Save rank history record
   */
  private async saveRankHistory(
    keywordId: string,
    position: number,
    searchResults?: any
  ): Promise<void> {
    await this.supabaseService.insert('indb_rank_history', {
      keyword_id: keywordId,
      position,
      search_results: searchResults,
      checked_at: new Date().toISOString(),
    });
  }

  /**
   * Map database keyword to model
   */
  private mapDatabaseKeywordToModel(data: any): RankKeyword {
    return {
      id: data.id,
      userId: data.user_id,
      keyword: data.keyword,
      domain: data.domain,
      country: data.country,
      device: data.device,
      searchEngine: data.search_engine,
      targetUrl: data.target_url,
      tags: data.tags || [],
      isActive: data.is_active,
      currentPosition: data.current_position,
      previousPosition: data.previous_position,
      lastChecked: data.last_checked ? new Date(data.last_checked) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

export default RankTrackingService;