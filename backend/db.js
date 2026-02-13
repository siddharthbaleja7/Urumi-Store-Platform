const Database = require('better-sqlite3');
const db = new Database('stores.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    namespace TEXT NOT NULL UNIQUE,
    engine TEXT NOT NULL,
    status TEXT NOT NULL,
    url TEXT,
    admin_url TEXT,
    mysql_root_password TEXT,
    mysql_password TEXT,
    postgres_password TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// CRUD operations
const storeDb = {
  getAll: () => {
    return db.prepare('SELECT * FROM stores ORDER BY created_at DESC').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  },

  create: (store) => {
    const stmt = db.prepare(`
      INSERT INTO stores (id, name, namespace, engine, status, url, admin_url, mysql_root_password, mysql_password, postgres_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      store.id,
      store.name,
      store.namespace,
      store.engine,
      store.status,
      store.url,
      store.admin_url,
      store.mysql_root_password,
      store.mysql_password,
      store.postgres_password,
      store.created_at,
      store.updated_at
    );
    return store;
  },

  update: (id, updates) => {
    const store = storeDb.getById(id);
    if (!store) return null;

    const updated = { ...store, ...updates, updated_at: new Date().toISOString() };

    // Construct dynamic update query
    const keys = Object.keys(updates);
    if (keys.length === 0) return store;

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => updates[key]);

    // Add updated_at
    const stmt = db.prepare(`
      UPDATE stores 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(...values, updated.updated_at, id);

    return updated;
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM stores WHERE id = ?');
    return stmt.run(id).changes > 0;
  }
};

module.exports = storeDb;
