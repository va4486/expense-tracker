import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'expense-tracker.db'));

// Initialize database tables
export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      security_answer_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('essential', 'non-essential')),
      parent_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Daily limits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      limit_amount REAL NOT NULL,
      date DATE NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create default categories for new users
  console.log('Database initialized successfully');
}

// User operations
export function createUser(username: string, pin: string, securityAnswer?: string) {
  const hashedPin = hashSync(pin, 10);
  const hashedAnswer = securityAnswer ? hashSync(securityAnswer.toLowerCase().trim(), 10) : null;
  const stmt = db.prepare('INSERT INTO users (username, pin_hash, security_answer_hash) VALUES (?, ?, ?)');
  const result = stmt.run(username, hashedPin, hashedAnswer);
  return result.lastInsertRowid;
}

export function resetUserPin(username: string, newPin: string) {
  const hashedPin = hashSync(newPin, 10);
  const stmt = db.prepare('UPDATE users SET pin_hash = ? WHERE username = ?');
  const result = stmt.run(hashedPin, username);
  return result.changes > 0;
}

export function verifySecurityAnswer(username: string, answer: string): boolean {
  const user: any = getUserByUsername(username);
  if (!user || !user.security_answer_hash) {
    return false;
  }
  const { compareSync } = require('bcryptjs');
  return compareSync(answer.toLowerCase().trim(), user.security_answer_hash);
}

export function getUserByUsername(username: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

export function getUserById(id: number) {
  const stmt = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?');
  return stmt.get(id);
}

// Category operations
export function createCategory(userId: number, name: string, type: string, parentId: number | null = null) {
  const stmt = db.prepare('INSERT INTO categories (user_id, name, type, parent_id) VALUES (?, ?, ?, ?)');
  const result = stmt.run(userId, name, type, parentId);
  return result.lastInsertRowid;
}

export function getCategories(userId: number) {
  const stmt = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name');
  return stmt.all(userId);
}

export function getCategoryById(id: number) {
  const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
  return stmt.get(id);
}

// Expense operations
export function createExpense(userId: number, amount: number, categoryId: number, description: string = '') {
  const stmt = db.prepare('INSERT INTO expenses (user_id, amount, category_id, description) VALUES (?, ?, ?, ?)');
  const result = stmt.run(userId, amount, categoryId, description);
  return result.lastInsertRowid;
}

export function getExpenses(userId: number, startDate?: string, endDate?: string) {
  let query = `
    SELECT e.*, c.name as category_name, c.type as category_type
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = ?
  `;
  const params: any[] = [userId];

  if (startDate) {
    query += ' AND date(e.timestamp) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date(e.timestamp) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY e.timestamp DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

export function deleteExpense(id: number, userId: number) {
  const stmt = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
  return stmt.run(id, userId);
}

// Daily limit operations
export function setDailyLimit(userId: number, limitAmount: number, date: string) {
  const stmt = db.prepare(`
    INSERT INTO daily_limits (user_id, limit_amount, date) 
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET limit_amount = excluded.limit_amount
  `);
  return stmt.run(userId, limitAmount, date);
}

export function getDailyLimit(userId: number, date: string) {
  const stmt = db.prepare('SELECT * FROM daily_limits WHERE user_id = ? AND date = ?');
  return stmt.get(userId, date);
}

export function getDailyExpenses(userId: number, date: string) {
  const stmt = db.prepare(`
    SELECT SUM(amount) as total
    FROM expenses
    WHERE user_id = ? AND date(timestamp) = ?
  `);
  return stmt.get(userId, date);
}

// Statistics operations
export function getExpenseStats(userId: number, startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
  let dateFormat = '%Y-%m-%d';
  if (groupBy === 'week') {
    dateFormat = '%Y-W%W';
  } else if (groupBy === 'month') {
    dateFormat = '%Y-%m';
  }

  const stmt = db.prepare(`
    SELECT 
      strftime('${dateFormat}', timestamp) as period,
      c.type as category_type,
      c.name as category_name,
      SUM(amount) as total_amount,
      COUNT(*) as transaction_count
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = ? AND date(e.timestamp) BETWEEN ? AND ?
    GROUP BY period, c.type, c.name
    ORDER BY period, c.type, total_amount DESC
  `);

  return stmt.all(userId, startDate, endDate);
}

// Initialize database on import
initDatabase();

export default db;
