/**
 * Event Emitter
 * Emit and listen to events
 */

import { logger } from './logger';

/**
 * Event emitter
 */
export class EventEmitter {
  constructor() {
    this.events = new Map();
    this.stats = {
      emitted: 0,
      listeners: 0,
    };
  }

  /**
   * Register event listener
   */
  on(eventName, callback, options = {}) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: this.generateListenerId(),
    };

    const listeners = this.events.get(eventName);
    listeners.push(listener);
    listeners.sort((a, b) => b.priority - a.priority);

    this.stats.listeners++;

    logger.debug('Event listener registered', {
      event: eventName,
      listenerId: listener.id,
    });

    return listener.id;
  }

  /**
   * Register one-time event listener
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Remove event listener
   */
  off(eventName, listenerId) {
    if (!this.events.has(eventName)) {
      return false;
    }

    const listeners = this.events.get(eventName);
    const index = listeners.findIndex(l => l.id === listenerId);

    if (index === -1) {
      return false;
    }

    listeners.splice(index, 1);
    this.stats.listeners--;

    if (listeners.length === 0) {
      this.events.delete(eventName);
    }

    logger.debug('Event listener removed', {
      event: eventName,
      listenerId,
    });

    return true;
  }

  /**
   * Emit event
   */
  async emit(eventName, data = null) {
    if (!this.events.has(eventName)) {
      logger.debug('No listeners for event', { event: eventName });
      return null;
    }

    const listeners = this.events.get(eventName);
    this.stats.emitted++;

    logger.debug('Emitting event', {
      event: eventName,
      listeners: listeners.length,
    });

    const results = [];

    for (const listener of listeners) {
      try {
        const result = await Promise.resolve(listener.callback(data));
        results.push(result);

        if (listener.once) {
          this.off(eventName, listener.id);
        }
      } catch (error) {
        logger.error('Event listener error', {
          event: eventName,
          listenerId: listener.id,
          error: error.message,
        });

        results.push({ error: error.message });
      }
    }

    return results;
  }

  /**
   * Remove all listeners for event
   */
  removeAllListeners(eventName = null) {
    if (eventName) {
      if (this.events.has(eventName)) {
        const count = this.events.get(eventName).length;
        this.events.delete(eventName);
        this.stats.listeners -= count;

        logger.debug('All listeners removed for event', {
          event: eventName,
          count,
        });
      }
    } else {
      const count = this.stats.listeners;
      this.events.clear();
      this.stats.listeners = 0;

      logger.debug('All event listeners removed', { count });
    }
  }

  /**
   * Get listener count
   */
  listenerCount(eventName) {
    if (!this.events.has(eventName)) {
      return 0;
    }

    return this.events.get(eventName).length;
  }

  /**
   * Get all events
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get listeners for event
   */
  listeners(eventName) {
    if (!this.events.has(eventName)) {
      return [];
    }

    return this.events.get(eventName).map(l => ({
      id: l.id,
      priority: l.priority,
      once: l.once,
    }));
  }

  /**
   * Generate listener ID
   */
  generateListenerId() {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalEvents: this.events.size,
      totalListeners: this.stats.listeners,
      emitted: this.stats.emitted,
      eventDetails: Array.from(this.events.entries()).map(([name, listeners]) => ({
        name,
        listenerCount: listeners.length,
      })),
    };
  }
}

/**
 * Global event emitter instance
 */
export const globalEventEmitter = new EventEmitter();

export default {
  EventEmitter,
  globalEventEmitter,
};
