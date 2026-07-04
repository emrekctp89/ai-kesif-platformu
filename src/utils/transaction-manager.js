/**
 * Transaction Manager
 * Handles database transactions with proper error handling and rollback
 */

import { logger } from './logger';
import { DatabaseError } from './errors';

/**
 * Transaction class
 */
export class Transaction {
  constructor(connection, name = 'transaction') {
    this.connection = connection;
    this.name = name;
    this.isActive = false;
    this.isSavepoint = false;
    this.queries = [];
    this.startTime = null;
  }

  /**
   * Begin transaction
   */
  async begin(isSavepoint = false) {
    try {
      this.isSavepoint = isSavepoint;

      if (isSavepoint) {
        await this.connection.query(`SAVEPOINT ${this.name}`);
        logger.debug(`Savepoint '${this.name}' created`);
      } else {
        await this.connection.query('BEGIN');
        logger.debug(`Transaction '${this.name}' started`);
      }

      this.isActive = true;
      this.startTime = Date.now();
    } catch (error) {
      throw new DatabaseError('Failed to begin transaction', {
        transactionName: this.name,
        originalError: error.message,
      });
    }
  }

  /**
   * Execute query in transaction
   */
  async query(sql, params = []) {
    if (!this.isActive) {
      throw new DatabaseError('Transaction is not active');
    }

    try {
      const result = await this.connection.query(sql, params);
      this.queries.push({ sql, params, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.error('Query failed in transaction', {
        transactionName: this.name,
        query: sql,
        error: error.message,
      });
      throw new DatabaseError('Query failed in transaction', {
        transactionName: this.name,
        originalError: error.message,
      });
    }
  }

  /**
   * Commit transaction
   */
  async commit() {
    if (!this.isActive) {
      throw new DatabaseError('Transaction is not active');
    }

    try {
      if (this.isSavepoint) {
        await this.connection.query(`RELEASE SAVEPOINT ${this.name}`);
        logger.debug(`Savepoint '${this.name}' released`);
      } else {
        await this.connection.query('COMMIT');
        logger.debug(`Transaction '${this.name}' committed`, {
          duration: Date.now() - this.startTime,
          queries: this.queries.length,
        });
      }

      this.isActive = false;
    } catch (error) {
      throw new DatabaseError('Failed to commit transaction', {
        transactionName: this.name,
        originalError: error.message,
      });
    }
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    if (!this.isActive) {
      return;
    }

    try {
      if (this.isSavepoint) {
        await this.connection.query(`ROLLBACK TO SAVEPOINT ${this.name}`);
        logger.debug(`Savepoint '${this.name}' rolled back`);
      } else {
        await this.connection.query('ROLLBACK');
        logger.warn(`Transaction '${this.name}' rolled back`, {
          duration: Date.now() - this.startTime,
          queries: this.queries.length,
        });
      }

      this.isActive = false;
    } catch (error) {
      logger.error('Failed to rollback transaction', {
        transactionName: this.name,
        error: error.message,
      });

      this.isActive = false;
      throw new DatabaseError('Failed to rollback transaction', {
        transactionName: this.name,
        originalError: error.message,
      });
    }
  }

  /**
   * Get transaction state
   */
  getState() {
    return {
      name: this.name,
      isActive: this.isActive,
      isSavepoint: this.isSavepoint,
      duration: this.isActive ? Date.now() - this.startTime : null,
      queriesExecuted: this.queries.length,
    };
  }
}

/**
 * Transaction manager
 */
export class TransactionManager {
  constructor(database) {
    this.database = database;
    this.activeTransactions = new Map();
    this.transactionId = 0;
  }

  /**
   * Begin transaction
   */
  async begin(name = null) {
    const transactionName = name || `txn_${++this.transactionId}`;
    const connection = await this.database.getConnection();

    try {
      const transaction = new Transaction(connection, transactionName);
      await transaction.begin();

      this.activeTransactions.set(transactionName, transaction);

      logger.info('Transaction started', {
        transactionName,
      });

      return transaction;
    } catch (error) {
      await this.database.releaseConnection(connection);
      throw error;
    }
  }

  /**
   * Execute function in transaction
   */
  async run(fn, name = null) {
    const transaction = await this.begin(name);

    try {
      const result = await fn(transaction);
      await transaction.commit();

      this.activeTransactions.delete(transaction.name);
      await this.database.releaseConnection(transaction.connection);

      return result;
    } catch (error) {
      await transaction.rollback();
      this.activeTransactions.delete(transaction.name);
      await this.database.releaseConnection(transaction.connection);

      throw error;
    }
  }

  /**
   * Create savepoint
   */
  async createSavepoint(parentTransaction, name = null) {
    const savepointName = name || `sp_${++this.transactionId}`;

    try {
      const savepoint = new Transaction(parentTransaction.connection, savepointName);
      await savepoint.begin(true);

      this.activeTransactions.set(savepointName, savepoint);

      logger.debug('Savepoint created', {
        savepointName,
        parentTransaction: parentTransaction.name,
      });

      return savepoint;
    } catch (error) {
      throw new DatabaseError('Failed to create savepoint', {
        savepointName,
        originalError: error.message,
      });
    }
  }

  /**
   * Get active transactions
   */
  getActiveTransactions() {
    const transactions = [];

    for (const [name, transaction] of this.activeTransactions) {
      if (transaction.isActive) {
        transactions.push(transaction.getState());
      }
    }

    return transactions;
  }

  /**
   * Get transaction stats
   */
  getStats() {
    const active = Array.from(this.activeTransactions.values()).filter((t) => t.isActive);

    return {
      totalActive: active.length,
      totalTransactions: this.transactionId,
      transactions: active.map((t) => t.getState()),
    };
  }

  /**
   * Cleanup inactive transactions
   */
  cleanup() {
    const inactiveTransactions = [];

    for (const [name, transaction] of this.activeTransactions) {
      if (!transaction.isActive) {
        inactiveTransactions.push(name);
        this.activeTransactions.delete(name);
      }
    }

    if (inactiveTransactions.length > 0) {
      logger.debug('Cleaned up inactive transactions', {
        count: inactiveTransactions.length,
      });
    }

    return inactiveTransactions.length;
  }
}

/**
 * Retry transaction helper
 */
export async function retryTransaction(database, fn, maxRetries = 3, name = null) {
  const transactionManager = new TransactionManager(database);
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transactionManager.run(fn, name);
    } catch (error) {
      lastError = error;

      // Don't retry validation or constraint errors
      if (
        error.message.includes('UNIQUE') ||
        error.message.includes('FOREIGN KEY') ||
        error.message.includes('CHECK')
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 100;
        logger.warn(`Transaction failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries,
          error: error.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export default {
  Transaction,
  TransactionManager,
  retryTransaction,
};
