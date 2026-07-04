/**
 * Webhook Manager
 * Manages webhook registration, delivery, and retry logic
 */

import { logger } from './logger';
import { ValidationError, WebhookError } from './errors';

/**
 * Webhook manager
 */
export class WebhookManager {
  constructor(options = {}) {
    this.webhooks = new Map();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.timeout = options.timeout || 30000; // 30 seconds
    this.stats = {
      registered: 0,
      delivered: 0,
      failed: 0,
      retried: 0,
    };
  }

  /**
   * Register webhook
   */
  registerWebhook(id, url, events = [], options = {}) {
    if (!id || !url) {
      throw new ValidationError('Webhook ID and URL are required');
    }

    this.validateUrl(url);

    const webhook = {
      id,
      url,
      events,
      active: options.active !== false,
      secret: options.secret || null,
      headers: options.headers || {},
      createdAt: new Date(),
      lastTriggeredAt: null,
      stats: {
        delivered: 0,
        failed: 0,
        retried: 0,
      },
    };

    this.webhooks.set(id, webhook);
    this.stats.registered++;

    logger.info('Webhook registered', {
      id,
      url,
      events: events.length,
    });

    return webhook;
  }

  /**
   * Unregister webhook
   */
  unregisterWebhook(id) {
    if (!this.webhooks.has(id)) {
      throw new WebhookError(`Webhook ${id} not found`);
    }

    this.webhooks.delete(id);

    logger.info('Webhook unregistered', { id });

    return true;
  }

  /**
   * Get webhook
   */
  getWebhook(id) {
    return this.webhooks.get(id);
  }

  /**
   * List webhooks
   */
  listWebhooks(filters = {}) {
    let webhooks = Array.from(this.webhooks.values());

    if (filters.active !== undefined) {
      webhooks = webhooks.filter((w) => w.active === filters.active);
    }

    if (filters.event) {
      webhooks = webhooks.filter((w) => w.events.includes(filters.event));
    }

    return webhooks;
  }

  /**
   * Deliver webhook payload
   */
  async deliverWebhook(webhookId, event, payload = {}) {
    const webhook = this.getWebhook(webhookId);

    if (!webhook) {
      throw new WebhookError(`Webhook ${webhookId} not found`);
    }

    if (!webhook.active) {
      logger.warn('Webhook is not active', { webhookId });
      return null;
    }

    if (webhook.events.length > 0 && !webhook.events.includes(event)) {
      logger.warn('Event not registered for webhook', { webhookId, event });
      return null;
    }

    const deliveryId = this.generateDeliveryId();

    try {
      const result = await this.sendWebhook(webhook, event, payload, deliveryId);
      webhook.stats.delivered++;
      webhook.lastTriggeredAt = new Date();
      this.stats.delivered++;

      logger.info('Webhook delivered', {
        webhookId,
        event,
        deliveryId,
      });

      return result;
    } catch (error) {
      logger.error('Webhook delivery failed', {
        webhookId,
        event,
        error: error.message,
      });

      return await this.retryWebhook(webhook, event, payload, deliveryId, 0);
    }
  }

  /**
   * Send webhook
   */
  async sendWebhook(webhook, event, payload, deliveryId) {
    const body = {
      id: deliveryId,
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    const signature = this.generateSignature(JSON.stringify(body), webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Delivery-ID': deliveryId,
      'X-Webhook-Event': event,
      ...webhook.headers,
    };

    if (webhook.secret) {
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      const fetch = (await import('node-fetch')).default;

      const response = await Promise.race([
        fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        ),
      ]);

      if (!response.ok) {
        throw new WebhookError(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        deliveryId,
        statusCode: response.status,
        success: true,
      };
    } catch (error) {
      throw new WebhookError('Webhook send failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Retry webhook delivery
   */
  async retryWebhook(webhook, event, payload, deliveryId, attempt) {
    if (attempt >= this.maxRetries) {
      webhook.stats.failed++;
      this.stats.failed++;

      logger.error('Webhook delivery failed after retries', {
        webhookId: webhook.id,
        deliveryId,
        attempts: attempt,
      });

      return {
        deliveryId,
        success: false,
        attempts: attempt,
      };
    }

    const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff

    logger.info('Retrying webhook delivery', {
      webhookId: webhook.id,
      deliveryId,
      attempt: attempt + 1,
      delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));

    webhook.stats.retried++;
    this.stats.retried++;

    try {
      const result = await this.sendWebhook(webhook, event, payload, deliveryId);
      webhook.stats.delivered++;
      this.stats.delivered++;
      return result;
    } catch (error) {
      return await this.retryWebhook(webhook, event, payload, deliveryId, attempt + 1);
    }
  }

  /**
   * Validate webhook URL
   */
  validateUrl(url) {
    try {
      new URL(url);
    } catch (error) {
      throw new ValidationError(`Invalid webhook URL: ${url}`);
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new ValidationError('Webhook URL must use HTTP or HTTPS');
    }
  }

  /**
   * Generate signature
   */
  generateSignature(payload, secret) {
    if (!secret) {
      return null;
    }

    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    if (!secret || !signature) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }

  /**
   * Generate delivery ID
   */
  generateDeliveryId() {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalWebhooks: this.webhooks.size,
      activeWebhooks: Array.from(this.webhooks.values()).filter((w) => w.active).length,
      registered: this.stats.registered,
      delivered: this.stats.delivered,
      failed: this.stats.failed,
      retried: this.stats.retried,
    };
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId) {
    const webhook = this.getWebhook(webhookId);
    if (!webhook) {
      throw new WebhookError(`Webhook ${webhookId} not found`);
    }

    return {
      id: webhook.id,
      url: webhook.url,
      active: webhook.active,
      ...webhook.stats,
      createdAt: webhook.createdAt,
      lastTriggeredAt: webhook.lastTriggeredAt,
    };
  }

  /**
   * Update webhook
   */
  updateWebhook(id, updates) {
    const webhook = this.getWebhook(id);

    if (!webhook) {
      throw new WebhookError(`Webhook ${id} not found`);
    }

    if (updates.url) {
      this.validateUrl(updates.url);
      webhook.url = updates.url;
    }

    if (updates.events !== undefined) {
      webhook.events = updates.events;
    }

    if (updates.active !== undefined) {
      webhook.active = updates.active;
    }

    if (updates.headers !== undefined) {
      webhook.headers = updates.headers;
    }

    if (updates.secret !== undefined) {
      webhook.secret = updates.secret;
    }

    logger.info('Webhook updated', { id });

    return webhook;
  }
}

const defaultExport = {
  WebhookManager,
};

export default defaultExport;
