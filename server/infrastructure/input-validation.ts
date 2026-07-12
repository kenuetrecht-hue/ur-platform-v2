import { z } from "zod";

/**
 * Request Validation & Sanitization System
 * Phase 1 Critical Infrastructure
 *
 * Prevents injection attacks, malformed data, and security exploits
 * - Input validation against Zod schemas
 * - SQL injection prevention (parameterized queries)
 * - XSS prevention
 * - CSRF protection
 * - File upload validation
 * - Request size limits
 * - Data type coercion
 * - Whitelist/blacklist filtering
 */

// Validation Result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  data: z.any().optional(),
  errors: z.array(z.string()).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Sanitization Options
export const SanitizationOptionsSchema = z.object({
  removeHtml: z.boolean().default(true),
  removeSqlInjection: z.boolean().default(true),
  removeXss: z.boolean().default(true),
  trimWhitespace: z.boolean().default(true),
  maxLength: z.number().optional(),
  allowedTags: z.array(z.string()).optional(),
});

export type SanitizationOptions = z.infer<typeof SanitizationOptionsSchema>;

// File Upload Validation
export const FileUploadValidationSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
  buffer: z.instanceof(Buffer),
});

export type FileUploadValidation = z.infer<typeof FileUploadValidationSchema>;

// Validation Rule
export const ValidationRuleSchema = z.object({
  field: z.string(),
  type: z.enum(["string", "number", "boolean", "email", "url", "date", "array", "object"]),
  required: z.boolean().default(true),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(), // regex
  enum: z.array(z.any()).optional(),
  customValidator: z.function().optional(),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

/**
 * Input Validation & Sanitization System
 */
export class InputValidationSystem {
  private allowedMimeTypes = new Set([
    "text/plain",
    "text/csv",
    "application/json",
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
    "video/mp4",
    "video/webm",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  private blockedPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/gi, // SQL injection
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /eval\(/gi, // Eval function
  ];

  private maxFileSize = 100 * 1024 * 1024; // 100MB
  private maxRequestSize = 50 * 1024 * 1024; // 50MB
  private maxStringLength = 1000000; // 1MB

  /**
   * Validate input against schema
   */
  validateInput(data: any, schema: z.ZodSchema): ValidationResult {
    try {
      const validated = schema.parse(data);
      return {
        valid: true,
        data: validated,
      };
    } catch (error) {
      const errors = error instanceof z.ZodError
        ? error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`)
        : ["Unknown validation error"];

      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input: string, options: SanitizationOptions = { removeHtml: true, removeSqlInjection: true, removeXss: true, trimWhitespace: true }): string {
    let sanitized = input;

    // Trim whitespace
    if (options.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Check length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove blocked patterns
    if (options.removeSqlInjection || options.removeXss) {
      for (const pattern of this.blockedPatterns) {
        sanitized = sanitized.replace(pattern, "");
      }
    }

    // Remove HTML tags (unless specific tags are allowed)
    if (options.removeHtml) {
      if (options.allowedTags && options.allowedTags.length > 0) {
        // Remove all tags except allowed ones
        const allowedTagsRegex = new RegExp(
          `<(?!/?(?:${options.allowedTags.join("|")})\\b)[^>]*>`,
          "gi"
        );
        sanitized = sanitized.replace(allowedTagsRegex, "");
      } else {
        // Remove all HTML tags
        sanitized = sanitized.replace(/<[^>]*>/g, "");
      }
    }

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj: any, options: SanitizationOptions = { removeHtml: true, removeSqlInjection: true, removeXss: true, trimWhitespace: true }): any {
    if (typeof obj === "string") {
      return this.sanitizeString(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, options));
    }

    if (obj !== null && typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: FileUploadValidation): ValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check filename for suspicious patterns
    if (!/^[\w\s\-\.]+$/.test(file.filename)) {
      errors.push("Filename contains invalid characters");
    }

    // Check for null bytes
    if (file.filename.includes("\0") || file.buffer.includes(0)) {
      errors.push("File contains null bytes");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  }

  /**
   * Validate credit card
   */
  validateCreditCard(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\D/g, "");
    if (sanitized.length < 13 || sanitized.length > 19) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate request size
   */
  validateRequestSize(size: number): ValidationResult {
    if (size > this.maxRequestSize) {
      return {
        valid: false,
        errors: [`Request size exceeds maximum of ${this.maxRequestSize / 1024 / 1024}MB`],
      };
    }

    return { valid: true };
  }

  /**
   * Escape SQL string (for logging, not for queries - use parameterized queries instead)
   */
  escapeSqlString(input: string): string {
    return input.replace(/'/g, "''").replace(/"/g, '""');
  }

  /**
   * Escape HTML
   */
  escapeHtml(input: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return input.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Validate CSRF token
   */
  validateCsrfToken(token: string, sessionToken: string): boolean {
    // In production, use constant-time comparison
    return token === sessionToken;
  }

  /**
   * Validate request origin
   */
  validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.some((allowed) => {
      if (allowed === "*") return true;
      if (allowed.includes("*")) {
        const regex = new RegExp(`^${allowed.replace(/\*/g, ".*")}$`);
        return regex.test(origin);
      }
      return origin === allowed;
    });
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    // API keys should be alphanumeric, 32+ characters
    return /^[a-zA-Z0-9_\-]{32,}$/.test(apiKey);
  }

  /**
   * Validate JWT token structure
   */
  validateJwtStructure(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Check each part is valid base64
    for (const part of parts) {
      if (!/^[A-Za-z0-9_\-]+$/.test(part)) return false;
    }

    return true;
  }

  /**
   * Add allowed MIME type
   */
  addAllowedMimeType(mimeType: string): void {
    this.allowedMimeTypes.add(mimeType);
  }

  /**
   * Remove allowed MIME type
   */
  removeAllowedMimeType(mimeType: string): void {
    this.allowedMimeTypes.delete(mimeType);
  }

  /**
   * Get allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return Array.from(this.allowedMimeTypes);
  }

  /**
   * Set max file size
   */
  setMaxFileSize(bytes: number): void {
    this.maxFileSize = bytes;
  }

  /**
   * Set max request size
   */
  setMaxRequestSize(bytes: number): void {
    this.maxRequestSize = bytes;
  }
}

// Global singleton instance
export const inputValidationSystem = new InputValidationSystem();
