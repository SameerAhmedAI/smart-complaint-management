const Database = require('better-sqlite3');
const path = require('path');

// ─── Open / create the SQLite file ───────────────────────────────────────────
const db = new Database(path.join(__dirname, '../database.db'));

// Performance & integrity pragmas
db.pragma('journal_mode = WAL');   // concurrent reads + faster writes
db.pragma('foreign_keys = ON');    // enforce FK constraints

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  -- ── Users ───────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user',
    department  TEXT    DEFAULT '',
    isActive    INTEGER DEFAULT 1,
    lastLogin   TEXT,
    createdAt   TEXT    DEFAULT (datetime('now')),
    updatedAt   TEXT    DEFAULT (datetime('now'))
  );

  -- ── Complaints ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS complaints (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    title                 TEXT    NOT NULL,
    description           TEXT    NOT NULL,
    category              TEXT    DEFAULT 'Other',
    priority              TEXT    DEFAULT 'medium',
    status                TEXT    DEFAULT 'pending',
    aiCategory            TEXT    DEFAULT '',
    aiPriority            TEXT    DEFAULT '',
    aiSuggestedDepartment TEXT    DEFAULT '',
    aiSentiment           TEXT    DEFAULT '',
    aiSummary             TEXT    DEFAULT '',
    submittedBy           INTEGER NOT NULL,
    assignedTo            INTEGER,
    resolutionNote        TEXT    DEFAULT '',
    createdAt             TEXT    DEFAULT (datetime('now')),
    updatedAt             TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (submittedBy) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedTo)  REFERENCES users(id) ON DELETE SET NULL
  );

  -- ── Notifications ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient         INTEGER NOT NULL,
    title             TEXT    NOT NULL,
    message           TEXT    NOT NULL,
    type              TEXT    DEFAULT 'general',
    isRead            INTEGER DEFAULT 0,
    relatedComplaint  INTEGER,
    createdAt         TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (recipient)        REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (relatedComplaint) REFERENCES complaints(id) ON DELETE SET NULL
  );
`);

console.log('✅ SQLite database ready: database.db');

// ─── Async wrapper — keeps server.js (connectDB().then(...)) compatible ───────
const connectDB = async () => {};

// Export the function as default AND expose db as a property on it
// Usage in controllers: const db = require('../config/db').db;
module.exports = connectDB;
module.exports.db = db;
