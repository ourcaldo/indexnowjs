/**
 * Encryption Key Manager
 * Manages encryption keys for response encryption with rotation support
 * 
 * Part of Enhancement #6: API Security Middleware
 */

import crypto from 'crypto';

export interface EncryptionKeyInfo {
  keyId: string;
  key: Buffer;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'revoked';
}

export interface KeyRotationConfig {
  rotationIntervalMs: number;
  keyRetentionMs: number;
  autoRotate: boolean;
}

/**
 * Encryption Key Manager
 * Handles creation, rotation, and management of encryption keys
 */
export class EncryptionKeyManager {
  private static instance: EncryptionKeyManager;
  private keys: Map<string, EncryptionKeyInfo> = new Map();
  private currentKeyId: string | null = null;
  private rotationConfig: KeyRotationConfig;

  private constructor() {
    this.rotationConfig = {
      rotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
      keyRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoRotate: false // Auto-rotation disabled for development behavior
    };

    // Initialize with a default key
    this.initializeDefaultKey();
    
    // Start auto-rotation if enabled
    if (this.rotationConfig.autoRotate) {
      this.startAutoRotation();
    }
  }

  static getInstance(): EncryptionKeyManager {
    if (!EncryptionKeyManager.instance) {
      EncryptionKeyManager.instance = new EncryptionKeyManager();
    }
    return EncryptionKeyManager.instance;
  }

  /**
   * Get current active encryption key
   */
  async getCurrentKey(): Promise<EncryptionKeyInfo> {
    if (!this.currentKeyId) {
      await this.createNewKey();
    }

    const key = this.keys.get(this.currentKeyId!);
    if (!key || key.status !== 'active' || this.isKeyExpired(key)) {
      await this.rotateKey();
      return this.keys.get(this.currentKeyId!)!;
    }

    return key;
  }

  /**
   * Get specific key by ID (for decryption)
   */
  async getKey(keyId: string): Promise<EncryptionKeyInfo | null> {
    const key = this.keys.get(keyId);
    
    // Return key even if expired (needed for decryption)
    if (key && key.status !== 'revoked') {
      return key;
    }

    return null;
  }

  /**
   * Create a new encryption key
   */
  async createNewKey(): Promise<EncryptionKeyInfo> {
    const keyId = this.generateKeyId();
    const key = crypto.randomBytes(32); // 256-bit key
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.rotationConfig.rotationIntervalMs);

    const keyInfo: EncryptionKeyInfo = {
      keyId,
      key,
      algorithm: 'aes-256-gcm',
      createdAt: now,
      expiresAt,
      status: 'active'
    };

    this.keys.set(keyId, keyInfo);
    this.currentKeyId = keyId;

    console.log(`Created new encryption key: ${keyId}`);
    return keyInfo;
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<EncryptionKeyInfo> {
    // Mark current key as expired
    if (this.currentKeyId) {
      const currentKey = this.keys.get(this.currentKeyId);
      if (currentKey) {
        currentKey.status = 'expired';
        this.keys.set(this.currentKeyId, currentKey);
      }
    }

    // Create new key
    const newKey = await this.createNewKey();
    
    // Clean up old keys
    await this.cleanupExpiredKeys();

    console.log(`Rotated encryption key from ${this.currentKeyId} to ${newKey.keyId}`);
    return newKey;
  }

  /**
   * Revoke a specific key
   */
  async revokeKey(keyId: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) {
      return false;
    }

    key.status = 'revoked';
    this.keys.set(keyId, key);

    // If this was the current key, rotate to a new one
    if (this.currentKeyId === keyId) {
      await this.rotateKey();
    }

    console.log(`Revoked encryption key: ${keyId}`);
    return true;
  }

  /**
   * Get all keys (for management purposes)
   */
  getAllKeys(): EncryptionKeyInfo[] {
    return Array.from(this.keys.values());
  }

  /**
   * Get key statistics
   */
  getKeyStats(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    revokedKeys: number;
    currentKeyAge: number;
  } {
    const keys = this.getAllKeys();
    const currentKey = this.currentKeyId ? this.keys.get(this.currentKeyId) : null;

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      expiredKeys: keys.filter(k => k.status === 'expired').length,
      revokedKeys: keys.filter(k => k.status === 'revoked').length,
      currentKeyAge: currentKey ? Date.now() - currentKey.createdAt.getTime() : 0
    };
  }

  /**
   * Initialize default key on startup
   */
  private async initializeDefaultKey(): Promise<void> {
    // Check if we have a stored master key
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (masterKey && masterKey.length === 64) {
      // Use deterministic key generation from master key
      const keyId = 'master-001';
      const key = Buffer.from(masterKey, 'hex');
      const now = new Date();
      
      const keyInfo: EncryptionKeyInfo = {
        keyId,
        key,
        algorithm: 'aes-256-gcm',
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.rotationConfig.rotationIntervalMs),
        status: 'active'
      };

      this.keys.set(keyId, keyInfo);
      this.currentKeyId = keyId;
      
      console.log('Initialized encryption with master key');
    } else {
      // Create a new random key
      await this.createNewKey();
      console.log('Initialized encryption with new random key');
    }
  }

  /**
   * Check if key is expired
   */
  private isKeyExpired(key: EncryptionKeyInfo): boolean {
    return Date.now() > key.expiresAt.getTime();
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  /**
   * Clean up expired keys beyond retention period
   */
  private async cleanupExpiredKeys(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [keyId, key] of this.keys.entries()) {
      const keyAge = now - key.createdAt.getTime();
      
      // Delete revoked keys older than retention period
      if (key.status === 'revoked' && keyAge > this.rotationConfig.keyRetentionMs) {
        keysToDelete.push(keyId);
      }
      
      // Delete expired keys older than retention period
      if (key.status === 'expired' && keyAge > this.rotationConfig.keyRetentionMs) {
        keysToDelete.push(keyId);
      }
    }

    keysToDelete.forEach(keyId => {
      this.keys.delete(keyId);
      console.log(`Cleaned up expired key: ${keyId}`);
    });
  }

  /**
   * Start automatic key rotation
   */
  private startAutoRotation(): void {
    setInterval(async () => {
      try {
        const currentKey = await this.getCurrentKey();
        
        if (this.isKeyExpired(currentKey)) {
          await this.rotateKey();
        }
      } catch (error) {
        console.error('Auto key rotation failed:', error);
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('Started automatic key rotation');
  }

  /**
   * Export key information (for backup/migration)
   */
  exportKeyInfo(): { keyId: string; createdAt: string; status: string }[] {
    return Array.from(this.keys.values()).map(key => ({
      keyId: key.keyId,
      createdAt: key.createdAt.toISOString(),
      status: key.status
    }));
  }

  /**
   * Update rotation configuration
   */
  updateRotationConfig(config: Partial<KeyRotationConfig>): void {
    this.rotationConfig = { ...this.rotationConfig, ...config };
    console.log('Updated key rotation config:', this.rotationConfig);
  }
}

// Export singleton instance
export const keyManager = EncryptionKeyManager.getInstance();