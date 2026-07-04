/**
 * Query Helpers
 * Utilities for building and executing database queries safely
 */

import { logger } from './logger';
import { ValidationError, DatabaseError } from './errors';

/**
 * Query builder for safe SQL construction
 */
export class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.select = ['*'];
    this.where = [];
    this.joins = [];
    this.orderBy = [];
    this.limit = null;
    this.offset = null;
    this.params = [];
    this.paramIndex = 0;
  }

  /**
   * Set select columns
   */
  columns(...cols) {
    this.select = cols.length > 0 ? cols : ['*'];
    return this;
  }

  /**
   * Add where clause
   */
  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    const paramPlaceholder = `$${++this.paramIndex}`;
    this.where.push(`${this.escapeColumn(column)} ${operator} ${paramPlaceholder}`);
    this.params.push(value);

    return this;
  }

  /**
   * Add AND where clause
   */
  andWhere(column, operator, value) {
    return this.where(column, operator, value);
  }

  /**
   * Add OR where clause
   */
  orWhere(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    const paramPlaceholder = `$${++this.paramIndex}`;
    const whereClause = `${this.escapeColumn(column)} ${operator} ${paramPlaceholder}`;

    if (this.where.length > 0) {
      // Wrap previous conditions in parentheses if needed
      const lastCondition = this.where.pop();
      this.where.push(`(${lastCondition} OR ${whereClause})`);
    } else {
      this.where.push(whereClause);
    }

    this.params.push(value);
    return this;
  }

  /**
   * Add IN clause
   */
  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new ValidationError('whereIn requires non-empty array');
    }

    const placeholders = values.map(() => `$${++this.paramIndex}`).join(',');
    this.where.push(`${this.escapeColumn(column)} IN (${placeholders})`);
    this.params.push(...values);

    return this;
  }

  /**
   * Add BETWEEN clause
   */
  whereBetween(column, min, max) {
    const minPlaceholder = `$${++this.paramIndex}`;
    const maxPlaceholder = `$${++this.paramIndex}`;

    this.where.push(`${this.escapeColumn(column)} BETWEEN ${minPlaceholder} AND ${maxPlaceholder}`);

    this.params.push(min, max);
    return this;
  }

  /**
   * Add join clause
   */
  join(table, on, type = 'INNER') {
    this.joins.push({
      table,
      on,
      type,
    });
    return this;
  }

  /**
   * Add order by
   */
  orderBy(column, direction = 'ASC') {
    const validDirections = ['ASC', 'DESC'];
    if (!validDirections.includes(direction.toUpperCase())) {
      throw new ValidationError('Invalid order direction');
    }

    this.orderBy.push(`${this.escapeColumn(column)} ${direction.toUpperCase()}`);
    return this;
  }

  /**
   * Set limit
   */
  limit(limit) {
    if (typeof limit !== 'number' || limit < 0) {
      throw new ValidationError('Limit must be a positive number');
    }

    this.limit = limit;
    return this;
  }

  /**
   * Set offset
   */
  offset(offset) {
    if (typeof offset !== 'number' || offset < 0) {
      throw new ValidationError('Offset must be a positive number');
    }

    this.offset = offset;
    return this;
  }

  /**
   * Build SELECT query
   */
  buildSelect() {
    let query = `SELECT ${this.select.join(', ')} FROM ${this.escapeColumn(this.table)}`;

    // Add joins
    for (const { table, on, type } of this.joins) {
      query += ` ${type} JOIN ${this.escapeColumn(table)} ON ${on}`;
    }

    // Add where clauses
    if (this.where.length > 0) {
      query += ` WHERE ${this.where.join(' AND ')}`;
    }

    // Add order by
    if (this.orderBy.length > 0) {
      query += ` ORDER BY ${this.orderBy.join(', ')}`;
    }

    // Add limit and offset
    if (this.limit !== null) {
      query += ` LIMIT ${this.limit}`;
    }

    if (this.offset !== null) {
      query += ` OFFSET ${this.offset}`;
    }

    return query;
  }

  /**
   * Execute query
   */
  async execute(connection) {
    const query = this.buildSelect();

    logger.debug('Executing query', {
      query,
      params: this.params,
    });

    try {
      return await connection.query(query, this.params);
    } catch (error) {
      throw new DatabaseError('Query execution failed', {
        query,
        originalError: error.message,
      });
    }
  }

  /**
   * Escape column/table names
   */
  escapeColumn(column) {
    if (column.includes('(') || column.includes(')') || column.includes(' ')) {
      return column; // Allow function calls and aliases
    }
    return `"${column.replace(/"/g, '""')}"`;
  }
}

/**
 * Insert query builder
 */
export class InsertBuilder {
  constructor(table) {
    this.table = table;
    this.data = {};
    this.params = [];
    this.paramIndex = 0;
  }

  /**
   * Set values
   */
  values(data) {
    if (typeof data !== 'object') {
      throw new ValidationError('Values must be an object');
    }

    this.data = data;
    return this;
  }

  /**
   * Build INSERT query
   */
  build() {
    const columns = Object.keys(this.data);
    if (columns.length === 0) {
      throw new ValidationError('No columns specified for insert');
    }

    const values = columns.map(() => `$${++this.paramIndex}`);
    this.params = columns.map((col) => this.data[col]);

    const columnList = columns.map((col) => `"${col}"`).join(', ');
    const valueList = values.join(', ');

    return `INSERT INTO "${this.table}" (${columnList}) VALUES (${valueList})`;
  }

  /**
   * Execute insert
   */
  async execute(connection) {
    const query = this.build();

    logger.debug('Executing insert', {
      table: this.table,
      columns: Object.keys(this.data),
    });

    try {
      return await connection.query(query, this.params);
    } catch (error) {
      throw new DatabaseError('Insert failed', {
        table: this.table,
        originalError: error.message,
      });
    }
  }
}

/**
 * Update query builder
 */
export class UpdateBuilder {
  constructor(table) {
    this.table = table;
    this.updates = {};
    this.where = [];
    this.params = [];
    this.paramIndex = 0;
  }

  /**
   * Set columns to update
   */
  set(data) {
    if (typeof data !== 'object') {
      throw new ValidationError('Set data must be an object');
    }

    this.updates = data;
    return this;
  }

  /**
   * Add where clause
   */
  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    const paramPlaceholder = `$${++this.paramIndex}`;
    this.where.push(`"${column}" ${operator} ${paramPlaceholder}`);
    this.params.push(value);

    return this;
  }

  /**
   * Build UPDATE query
   */
  build() {
    const updates = Object.keys(this.updates).map((col) => `"${col}" = $${++this.paramIndex}`);

    if (updates.length === 0) {
      throw new ValidationError('No columns specified for update');
    }

    if (this.where.length === 0) {
      throw new ValidationError('Update requires WHERE clause');
    }

    let query = `UPDATE "${this.table}" SET ${updates.join(', ')}`;

    this.params = [...Object.values(this.updates), ...this.params];

    query += ` WHERE ${this.where.join(' AND ')}`;

    return query;
  }

  /**
   * Execute update
   */
  async execute(connection) {
    const query = this.build();

    logger.debug('Executing update', {
      table: this.table,
    });

    try {
      return await connection.query(query, this.params);
    } catch (error) {
      throw new DatabaseError('Update failed', {
        table: this.table,
        originalError: error.message,
      });
    }
  }
}

/**
 * Delete query builder
 */
export class DeleteBuilder {
  constructor(table) {
    this.table = table;
    this.where = [];
    this.params = [];
    this.paramIndex = 0;
  }

  /**
   * Add where clause
   */
  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    const paramPlaceholder = `$${++this.paramIndex}`;
    this.where.push(`"${column}" ${operator} ${paramPlaceholder}`);
    this.params.push(value);

    return this;
  }

  /**
   * Build DELETE query
   */
  build() {
    if (this.where.length === 0) {
      throw new ValidationError('Delete requires WHERE clause');
    }

    let query = `DELETE FROM "${this.table}"`;
    query += ` WHERE ${this.where.join(' AND ')}`;

    return query;
  }

  /**
   * Execute delete
   */
  async execute(connection) {
    const query = this.build();

    logger.debug('Executing delete', {
      table: this.table,
    });

    try {
      return await connection.query(query, this.params);
    } catch (error) {
      throw new DatabaseError('Delete failed', {
        table: this.table,
        originalError: error.message,
      });
    }
  }
}

export default {
  QueryBuilder,
  InsertBuilder,
  UpdateBuilder,
  DeleteBuilder,
};
