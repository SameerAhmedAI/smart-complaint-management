const { Pool } = require('pg');

const sslConfig = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))
  ? false
  : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

const KEY_MAP = {
  isactive: 'isActive',
  lastlogin: 'lastLogin',
  createdat: 'createdAt',
  updatedat: 'updatedAt',
  aicategory: 'aiCategory',
  aipriority: 'aiPriority',
  aisuggesteddepartment: 'aiSuggestedDepartment',
  aisentiment: 'aiSentiment',
  aisummary: 'aiSummary',
  submittedby: 'submittedBy',
  assignedto: 'assignedTo',
  resolutionnote: 'resolutionNote',
  relatedcomplaint: 'relatedComplaint',
  isread: 'isRead',
  yearmonth: 'yearMonth',
  submittedbyname: 'submittedByName',
  submittedbyemail: 'submittedByEmail',
  assignedtoname: 'assignedToName',
  assignedtoemail: 'assignedToEmail',
  assignedtodepartment: 'assignedToDepartment',
  complainttitle: 'complaintTitle',
  complaintstatus: 'complaintStatus'
};

const camelizeKeys = (obj) => {
  if (!obj) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (typeof obj !== 'object') return obj;
  const camelized = {};
  for (const key of Object.keys(obj)) {
    const camelKey = KEY_MAP[key] || key;
    camelized[camelKey] = camelizeKeys(obj[key]);
  }
  return camelized;
};

// Wrapper around pool.query to camelize keys and support async queries
const query = async (text, params) => {
  const result = await pool.query(text, params);
  if (result.rows) {
    result.rows = camelizeKeys(result.rows);
  }
  return result;
};

const connectDB = async () => {
  try {
    // Verify database connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL database connected successfully');

    // ─── Users ───────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'user',
        department  TEXT DEFAULT '',
        isActive    BOOLEAN DEFAULT true,
        lastLogin   TIMESTAMP,
        createdAt   TIMESTAMP DEFAULT NOW(),
        updatedAt   TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Complaints ──────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id                    SERIAL PRIMARY KEY,
        title                 TEXT NOT NULL,
        description           TEXT NOT NULL,
        category              TEXT DEFAULT 'Other',
        priority              TEXT DEFAULT 'medium',
        status                TEXT DEFAULT 'pending',
        aiCategory            TEXT DEFAULT '',
        aiPriority            TEXT DEFAULT '',
        aiSuggestedDepartment TEXT DEFAULT '',
        aiSentiment           TEXT DEFAULT '',
        aiSummary             TEXT DEFAULT '',
        submittedBy           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assignedTo            INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolutionNote        TEXT DEFAULT '',
        createdAt             TIMESTAMP DEFAULT NOW(),
        updatedAt             TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Notifications ────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id                SERIAL PRIMARY KEY,
        recipient         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title             TEXT NOT NULL,
        message           TEXT NOT NULL,
        type              TEXT DEFAULT 'general',
        isRead            BOOLEAN DEFAULT false,
        relatedComplaint  INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
        createdAt         TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ PostgreSQL database tables initialized/verified');
  } catch (error) {
    console.error('❌ PostgreSQL initialization error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.db = {
  query,
  pool // expose direct pool just in case
};
