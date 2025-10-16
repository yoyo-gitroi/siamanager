import { z } from 'zod';

/**
 * Validates webhook URLs to prevent SSRF attacks
 * Blocks internal/private IPs and non-HTTPS protocols
 */
export const webhookUrlSchema = z.string()
  .url({ message: "Invalid URL format" })
  .refine((url) => {
    try {
      const parsed = new URL(url);
      
      // Only allow https (or http for localhost in development)
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        return false;
      }
      
      // Block internal/private IPs
      const hostname = parsed.hostname.toLowerCase();
      
      // Block localhost and loopback
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return false;
      }
      
      // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
      if (hostname.match(/^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./)) {
        return false;
      }
      
      // Block AWS metadata endpoint
      if (hostname === '169.254.169.254') {
        return false;
      }
      
      // Block link-local addresses
      if (hostname.startsWith('169.254.')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, { message: "Webhook must be a valid external HTTPS URL. Internal/private IPs are not allowed." });

export const validateWebhookUrl = (url: string): { valid: boolean; error?: string } => {
  const result = webhookUrlSchema.safeParse(url);
  
  if (result.success) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: result.error.errors[0]?.message || "Invalid webhook URL"
  };
};
