/**
 * Event Queue
 * Queue events with retry mechanism and persistence
 */

import { logger } from './logger';

/**
 * Event queue
 */
export class EventQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.concurrency = options.concurrency || 1;
    this.activeJobs = 0;
    this.stats = {
      enqueued: 0,
      processed: 0,
      failed: 0,
      retried: 0,
    };
  }

  /**
   * Enqueue event
   */
  enqueue(event, handler, options = {}) {
    if (!event || !handler) {
      throw new Error('Event and handler are required');
    }

    const job = {
      id: this.generateJobId(),
      event,
      handler,
      priority: options.priority || 0,
      attempts: 0,
      maxRetries: options.maxRetries || this.maxRetries,
      retryDelay: options.retryDelay || this.retryDelay,
      createdAt: new Date(),
      status: 'pending',
      error: null,
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.stats.enqueued++;

    logger.debug('Event enqueued', {
      jobId: job.id,
      event: job.event,
      queueSize: this.queue.length,
    });

    this.process();

    return job.id;
  }

  /**
   * Process queue
   */
  async process() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.concurrency) {
      const job = this.queue.shift();

      try {
        this.activeJobs++;
        job.status = 'processing';

        await this.executeJob(job);

        job.status = 'completed';
        this.stats.processed++;

        logger.debug('Job completed', {
          jobId: job.id,
          event: job.event,
        });
      } catch (error) {
        logger.error('Job execution failed', {
          jobId: job.id,
          event: job.event,
          error: error.message,
        });

        if (job.attempts < job.maxRetries) {
          job.attempts++;
          job.status = 'pending';
          job.error = error.message;

          this.stats.retried++;

          const delay = job.retryDelay * Math.pow(2, job.attempts - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));

          this.queue.push(job);
          this.queue.sort((a, b) => b.priority - a.priority);

          logger.info('Job retry scheduled', {
            jobId: job.id,
            event: job.event,
            attempt: job.attempts,
            nextDelay: delay,
          });
        } else {
          job.status = 'failed';
          this.stats.failed++;

          logger.error('Job failed after retries', {
            jobId: job.id,
            event: job.event,
            attempts: job.attempts,
          });
        }
      } finally {
        this.activeJobs--;
      }
    }

    this.processing = false;

    if (this.queue.length > 0) {
      setImmediate(() => this.process());
    }
  }

  /**
   * Execute job
   */
  async executeJob(job) {
    return new Promise((resolve, reject) => {
      Promise.resolve(job.handler()).then(resolve).catch(reject);
    });
  }

  /**
   * Get job
   */
  getJob(jobId) {
    return this.queue.find((job) => job.id === jobId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId) {
    const index = this.queue.findIndex((job) => job.id === jobId);

    if (index === -1) {
      return false;
    }

    const job = this.queue[index];
    job.status = 'cancelled';

    this.queue.splice(index, 1);

    logger.info('Job cancelled', {
      jobId,
      event: job.event,
    });

    return true;
  }

  /**
   * Clear queue
   */
  clear() {
    const size = this.queue.length;
    this.queue = [];

    logger.info('Queue cleared', { size });

    return size;
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get queue
   */
  getQueue() {
    return this.queue.map((job) => ({
      id: job.id,
      event: job.event,
      priority: job.priority,
      status: job.status,
      attempts: job.attempts,
      maxRetries: job.maxRetries,
      createdAt: job.createdAt,
      error: job.error,
    }));
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      activeJobs: this.activeJobs,
      concurrency: this.concurrency,
      enqueued: this.stats.enqueued,
      processed: this.stats.processed,
      failed: this.stats.failed,
      retried: this.stats.retried,
      successRate:
        this.stats.enqueued > 0
          ? ((this.stats.processed / this.stats.enqueued) * 100).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Generate job ID
   */
  generateJobId() {
    return `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Wait for queue to be empty
   */
  async waitUntilEmpty() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.queue.length === 0 && this.activeJobs === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Get job history (completed and failed jobs)
   */
  getHistory() {
    return {
      processed: this.stats.processed,
      failed: this.stats.failed,
      retried: this.stats.retried,
      enqueued: this.stats.enqueued,
    };
  }
}

/**
 * Global event queue instance
 */
export const globalEventQueue = new EventQueue();

export default {
  EventQueue,
  globalEventQueue,
};
