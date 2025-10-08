/**
 * Advanced File Validator
 * Comprehensive file validation with security checks for uploads
 * 
 * Part of Enhancement #2: Strengthen Input Validation
 */

import { fileTypeFromBuffer } from 'file-type';
import { NUMERIC_LIMITS } from '../../../core/constants/ValidationRules';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    detectedType?: string;
    detectedExtension?: string;
    size: number;
    originalName: string;
  };
}

export interface FileValidationOptions {
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxSize?: number;
  minSize?: number;
  validateContent?: boolean;
  checkMagicBytes?: boolean;
  stripMetadata?: boolean;
  scanForViruses?: boolean;
}

/**
 * Advanced File Validator Service
 * Provides comprehensive file validation and security checking
 */
export class FileValidator {
  private static instance: FileValidator;

  // Allowed MIME types for different categories
  private readonly allowedMimeTypes = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    archives: [
      'application/zip',
      'application/x-tar',
      'application/gzip',
      'application/x-rar-compressed'
    ],
    json: ['application/json', 'text/json'],
    xml: ['application/xml', 'text/xml']
  };

  // Dangerous file extensions that should never be allowed
  private readonly dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.scr', '.reg'
  ];

  static getInstance(): FileValidator {
    if (!FileValidator.instance) {
      FileValidator.instance = new FileValidator();
    }
    return FileValidator.instance;
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(
    buffer: Buffer,
    originalName: string,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const opts = {
      maxSize: NUMERIC_LIMITS.FILE_SIZE.max,
      minSize: NUMERIC_LIMITS.FILE_SIZE.min,
      validateContent: true,
      checkMagicBytes: true,
      stripMetadata: false,
      scanForViruses: false,
      ...options
    };

    // Basic validation
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        errors: ['File is empty or invalid'],
        warnings: []
      };
    }

    if (!originalName || originalName.trim().length === 0) {
      errors.push('File name is required');
    }

    // Size validation
    if (buffer.length > opts.maxSize) {
      errors.push(`File size ${this.formatFileSize(buffer.length)} exceeds maximum allowed size ${this.formatFileSize(opts.maxSize)}`);
    }

    if (buffer.length < opts.minSize) {
      errors.push(`File size ${this.formatFileSize(buffer.length)} is below minimum required size ${this.formatFileSize(opts.minSize)}`);
    }

    // Extension validation
    const extension = this.getFileExtension(originalName);
    if (this.dangerousExtensions.includes(extension.toLowerCase())) {
      errors.push(`File extension ${extension} is not allowed for security reasons`);
    }

    // Magic byte validation (file signature)
    let detectedType: string | undefined;
    let detectedExtension: string | undefined;

    if (opts.checkMagicBytes) {
      try {
        const fileType = await fileTypeFromBuffer(buffer);
        if (fileType) {
          detectedType = fileType.mime;
          detectedExtension = `.${fileType.ext}`;

          // Check if detected type matches filename extension
          if (extension && detectedExtension && extension.toLowerCase() !== detectedExtension.toLowerCase()) {
            warnings.push(`File extension ${extension} doesn't match detected type ${detectedExtension}`);
          }
        } else if (opts.validateContent) {
          warnings.push('Could not detect file type from content - file may be corrupted or have unknown format');
        }
      } catch (error) {
        warnings.push(`File type detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // MIME type validation
    if (opts.allowedTypes && opts.allowedTypes.length > 0) {
      const actualType = detectedType || this.getMimeTypeFromExtension(extension);
      if (!opts.allowedTypes.includes(actualType)) {
        errors.push(`File type ${actualType} is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`);
      }
    }

    // Extension validation
    if (opts.allowedExtensions && opts.allowedExtensions.length > 0) {
      if (!opts.allowedExtensions.includes(extension.toLowerCase())) {
        errors.push(`File extension ${extension} is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`);
      }
    }

    // Content-specific validation
    if (opts.validateContent) {
      const contentValidation = await this.validateFileContent(buffer, detectedType || extension);
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);
    }

    // Metadata analysis
    const metadata = {
      detectedType,
      detectedExtension,
      size: buffer.length,
      originalName: originalName.trim()
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Validate specific file content based on type
   */
  private async validateFileContent(buffer: Buffer, typeOrExtension: string): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // JSON validation
      if (typeOrExtension.includes('json')) {
        const content = buffer.toString('utf8');
        try {
          JSON.parse(content);
        } catch {
          errors.push('Invalid JSON file format');
        }
      }

      // Image validation
      if (typeOrExtension.includes('image')) {
        const imageValidation = this.validateImageContent(buffer);
        errors.push(...imageValidation.errors);
        warnings.push(...imageValidation.warnings);
      }

      // PDF validation
      if (typeOrExtension.includes('pdf')) {
        if (!buffer.subarray(0, 4).toString('ascii').startsWith('%PDF')) {
          errors.push('Invalid PDF file format');
        }
      }

      // Text file validation
      if (typeOrExtension.includes('text') || typeOrExtension.includes('.txt')) {
        const textValidation = this.validateTextContent(buffer);
        warnings.push(...textValidation.warnings);
      }

      // Service account JSON validation
      if (typeOrExtension.includes('json')) {
        const serviceAccountValidation = this.validateServiceAccountFile(buffer);
        if (serviceAccountValidation.errors.length > 0) {
          warnings.push('File may not be a valid service account JSON');
        }
      }

    } catch (error) {
      warnings.push(`Content validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate image file content
   */
  private validateImageContent(buffer: Buffer): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for minimum image dimensions (using basic checks)
    try {
      // Basic image size validation - check if image is suspiciously small
      if (buffer.length < 100) {
        warnings.push('Image file is very small - may be corrupted');
      }

      // Check for potential malicious content in images
      const content = buffer.toString('ascii');
      const suspiciousPatterns = ['<script', 'javascript:', 'vbscript:', 'data:'];
      
      for (const pattern of suspiciousPatterns) {
        if (content.toLowerCase().includes(pattern)) {
          errors.push('Image contains suspicious embedded content');
          break;
        }
      }

    } catch (error) {
      warnings.push(`Image validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate text file content
   */
  private validateTextContent(buffer: Buffer): FileValidationResult {
    const warnings: string[] = [];

    try {
      const content = buffer.toString('utf8');
      
      // Check for suspiciously large lines
      const lines = content.split('\n');
      const longLines = lines.filter(line => line.length > 1000);
      if (longLines.length > 0) {
        warnings.push(`Text file contains ${longLines.length} very long lines - may be binary data`);
      }

      // Check for binary content in text files
      const nonPrintableChars = content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g);
      if (nonPrintableChars && nonPrintableChars.length > content.length * 0.1) {
        warnings.push('Text file contains high percentage of binary data');
      }

    } catch (error) {
      warnings.push(`Text validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: true, errors: [], warnings };
  }

  /**
   * Validate Google Service Account JSON file
   */
  private validateServiceAccountFile(buffer: Buffer): FileValidationResult {
    const errors: string[] = [];

    try {
      const content = buffer.toString('utf8');
      const parsed = JSON.parse(content);

      const requiredFields = [
        'type', 'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri'
      ];

      for (const field of requiredFields) {
        if (!parsed[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      if (parsed.type !== 'service_account') {
        errors.push('Invalid service account type');
      }

      // Validate email format
      if (parsed.client_email && !parsed.client_email.includes('@')) {
        errors.push('Invalid client email format');
      }

    } catch (error) {
      errors.push(`Service account JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Get MIME type from file extension (fallback)
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.csv': 'text/csv'
    };

    return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Format file size for human readability
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Validate multiple files
   */
  async validateFiles(
    files: Array<{ buffer: Buffer; name: string }>,
    options: FileValidationOptions = {}
  ): Promise<{
    validFiles: Array<{ buffer: Buffer; name: string; metadata: any }>;
    invalidFiles: Array<{ name: string; errors: string[]; warnings: string[] }>;
  }> {
    const validFiles: Array<{ buffer: Buffer; name: string; metadata: any }> = [];
    const invalidFiles: Array<{ name: string; errors: string[]; warnings: string[] }> = [];

    for (const file of files) {
      const result = await this.validateFile(file.buffer, file.name, options);
      
      if (result.isValid) {
        validFiles.push({
          buffer: file.buffer,
          name: file.name,
          metadata: result.metadata
        });
      } else {
        invalidFiles.push({
          name: file.name,
          errors: result.errors,
          warnings: result.warnings
        });
      }
    }

    return { validFiles, invalidFiles };
  }

  /**
   * Get allowed file types for specific contexts
   */
  getAllowedTypes(context: 'images' | 'documents' | 'archives' | 'json' | 'xml' | 'service_accounts'): string[] {
    switch (context) {
      case 'images':
        return this.allowedMimeTypes.images;
      case 'documents':
        return this.allowedMimeTypes.documents;
      case 'archives':
        return this.allowedMimeTypes.archives;
      case 'json':
        return this.allowedMimeTypes.json;
      case 'xml':
        return this.allowedMimeTypes.xml;
      case 'service_accounts':
        return ['application/json'];
      default:
        return [];
    }
  }
}

// Export singleton instance
export const fileValidator = FileValidator.getInstance();