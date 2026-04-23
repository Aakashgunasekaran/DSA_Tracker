const express = require('express');
const cors    = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs   = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH  = path.join(DATA_DIR, 'progress.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Database ──────────────────────────────────────────────────────────────────
let db;
let dirty = false;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id    TEXT    NOT NULL,
      lc_num     INTEGER NOT NULL,
      diff       TEXT    NOT NULL,
      solved     INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, lc_num)
    );
  `);

  setInterval(() => {
    if (dirty) {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
      dirty = false;
    }
  }, 5000);

  console.log('Database ready  →', DB_PATH);
}

function dbRun(sql, params = []) { db.run(sql, params); dirty = true; }

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) { return dbAll(sql, params)[0] || null; }

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getOrCreateUser(req, res) {
  let userId = req.headers['x-user-id'];
  if (!userId || !/^[0-9a-f-]{36}$/.test(userId)) userId = uuidv4();
  dbRun(`INSERT OR IGNORE INTO users (id) VALUES (?)`, [userId]);
  res.setHeader('x-user-id', userId);
  return userId;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

app.get('/api/progress', (req, res) => {
  try {
    const userId = getOrCreateUser(req, res);
    const rows = dbAll(`SELECT lc_num, diff, solved FROM progress WHERE user_id = ?`, [userId]);
    const solved = {};
    for (const r of rows) if (r.solved) solved[`lc${r.lc_num}`] = r.diff;
    res.json({ userId, solved });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.post('/api/progress', (req, res) => {
  try {
    const userId = getOrCreateUser(req, res);
    const { lcNum, diff, solved } = req.body;
    if (!lcNum || typeof lcNum !== 'number') return res.status(400).json({ error: 'lcNum required' });
    if (solved) {
      dbRun(`INSERT INTO progress (user_id, lc_num, diff, solved, updated_at)
             VALUES (?, ?, ?, 1, strftime('%s','now'))
             ON CONFLICT(user_id, lc_num)
             DO UPDATE SET solved=1, diff=excluded.diff, updated_at=strftime('%s','now')`,
        [userId, lcNum, diff || 'easy']);
    } else {
      dbRun(`DELETE FROM progress WHERE user_id = ? AND lc_num = ?`, [userId, lcNum]);
    }
    res.json({ ok: true, userId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.get('/api/stats', (req, res) => {
  try {
    const userId = getOrCreateUser(req, res);
    const byDiff = dbAll(`SELECT diff, COUNT(*) as cnt FROM progress WHERE user_id = ? AND solved = 1 GROUP BY diff`, [userId]);
    const totalRow = dbGet(`SELECT COUNT(*) as cnt FROM progress WHERE user_id = ? AND solved = 1`, [userId]);
    const stats = { easy: 0, medium: 0, hard: 0, total: totalRow ? totalRow.cnt : 0 };
    for (const r of byDiff) stats[r.diff] = r.cnt;
    res.json({ userId, stats });
  } catch (err) { console.error(err); res.status(500).json({ error: 'DB error' }); }
});

app.delete('/api/progress', (req, res) => {
  try {
    const userId = getOrCreateUser(req, res);
    dbRun(`DELETE FROM progress WHERE user_id = ?`, [userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function shutdown() {
  if (db && dirty) { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); console.log('DB flushed.'); }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

initDb().then(() => {
  app.listen(PORT, () => console.log(`DSA Tracker  →  http://localhost:${PORT}`));
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
