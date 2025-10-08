/**
 * Cache Service for IndexNow Studio
 * In-memory caching service for improved performance
 */

import { CACHE_KEYS, CACHE_TTL } from '@/lib/core/constants/AppConstants';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  totalKeys: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Set a value in cache with TTL
   */
  set<T = any>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get a value from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      totalKeys: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get or set cached value with function
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();
    
    // Cache the result
    this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Set multiple values at once
   */
  setMultiple<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl = CACHE_TTL.MEDIUM }) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Get multiple values at once
   */
  getMultiple<T = any>(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map(key => ({
      key,
      value: this.get<T>(key),
    }));
  }

  /**
   * Delete multiple keys at once
   */
  deleteMultiple(keys: string[]): number {
    let deletedCount = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  /**
   * Get all keys matching a pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Delete all keys matching a pattern
   */
  deleteByPattern(pattern: string): number {
    const keys = this.getKeysByPattern(pattern);
    return this.deleteMultiple(keys);
  }

  /**
   * Increment a numeric value in cache
   */
  increment(key: string, amount: number = 1, ttl: number = CACHE_TTL.MEDIUM): number {
    const current = this.get<number>(key) || 0;
    const newValue = current + amount;
    this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * Decrement a numeric value in cache
   */
  decrement(key: string, amount: number = 1, ttl: number = CACHE_TTL.MEDIUM): number {
    const current = this.get<number>(key) || 0;
    const newValue = current - amount;
    this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * Cache user profile
   */
  cacheUserProfile(userId: string, profile: any, ttl: number = CACHE_TTL.LONG): void {
    this.set(`${CACHE_KEYS.USER_PROFILE}:${userId}`, profile, ttl);
  }

  /**
   * Get cached user profile
   */
  getCachedUserProfile(userId: string): any | null {
    return this.get(`${CACHE_KEYS.USER_PROFILE}:${userId}`);
  }

  /**
   * Cache user settings
   */
  cacheUserSettings(userId: string, settings: any, ttl: number = CACHE_TTL.LONG): void {
    this.set(`${CACHE_KEYS.USER_SETTINGS}:${userId}`, settings, ttl);
  }

  /**
   * Get cached user settings
   */
  getCachedUserSettings(userId: string): any | null {
    return this.get(`${CACHE_KEYS.USER_SETTINGS}:${userId}`);
  }

  /**
   * Cache user quota
   */
  cacheUserQuota(userId: string, quota: any, ttl: number = CACHE_TTL.SHORT): void {
    this.set(`${CACHE_KEYS.USER_QUOTA}:${userId}`, quota, ttl);
  }

  /**
   * Get cached user quota
   */
  getCachedUserQuota(userId: string): any | null {
    return this.get(`${CACHE_KEYS.USER_QUOTA}:${userId}`);
  }

  /**
   * Invalidate user cache
   */
  invalidateUserCache(userId: string): void {
    this.deleteByPattern(`*:${userId}`);
  }

  /**
   * Cache service accounts
   */
  cacheServiceAccounts(userId: string, accounts: any[], ttl: number = CACHE_TTL.MEDIUM): void {
    this.set(`${CACHE_KEYS.SERVICE_ACCOUNTS}:${userId}`, accounts, ttl);
  }

  /**
   * Get cached service accounts
   */
  getCachedServiceAccounts(userId: string): any[] | null {
    return this.get(`${CACHE_KEYS.SERVICE_ACCOUNTS}:${userId}`);
  }

  /**
   * Cache packages
   */
  cachePackages(packages: any[], ttl: number = CACHE_TTL.VERY_LONG): void {
    this.set(CACHE_KEYS.PACKAGES, packages, ttl);
  }

  /**
   * Get cached packages
   */
  getCachedPackages(): any[] | null {
    return this.get(CACHE_KEYS.PACKAGES);
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private getMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation of memory usage
      size += key.length * 2; // Characters are 2 bytes in UTF-16
      size += JSON.stringify(entry.data).length * 2;
      size += 24; // Overhead for entry object
    }

    return size; // Returns bytes
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      const deletedCount = this.cleanup();
      if (deletedCount > 0) {
        console.log(`🧹 Cache cleanup: Removed ${deletedCount} expired entries`);
      }
    }, intervalMs);
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    stats: CacheStats;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];
    let isHealthy = true;

    // Check hit rate
    if (stats.hitRate < 50) {
      recommendations.push('Low cache hit rate. Consider adjusting TTL values or caching strategy.');
      isHealthy = false;
    }

    // Check memory usage (rough threshold)
    if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage. Consider implementing cache size limits.');
      isHealthy = false;
    }

    // Check number of keys
    if (stats.totalKeys > 10000) {
      recommendations.push('High number of cache entries. Consider more aggressive cleanup.');
      isHealthy = false;
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache is operating within normal parameters.');
    }

    return {
      isHealthy,
      stats,
      recommendations,
    };
  }
}

// Singleton instance
let cacheService: CacheService | null = null;

export const getCacheService = (): CacheService => {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
};

export default CacheService;