import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load("sqlite:donesimple.db");
  return _db;
}

export interface TaskRow {
  id: number;
  description: string;
  recurring: number;       // 0 | 1
  done: number;            // 0 | 1
  num_repeated: number;
  done_date: string | null;
  work_dismissed: number;  // 0 | 1
  recur_days: string | null; // JSON array of day indices 0=Mon..6=Sun, null = every day
}

export interface HistoryRow {
  id: number;
  description: string;
  date_done: string;
  recurrence_count: number;
}

export interface TreeNodeRow {
  id: number;
  description: string;
  x: number;
  y: number;
  done: number;           // 0 | 1
  task_id: number | null;
}

export interface TreeLinkRow {
  id: number;
  from_id: number;
  to_id: number;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      recurring INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      num_repeated INTEGER NOT NULL DEFAULT 0,
      done_date TEXT,
      work_dismissed INTEGER NOT NULL DEFAULT 0,
      recur_days TEXT
    )
  `);
  // Add recur_days to existing databases that predate this column
  await db.execute("ALTER TABLE tasks ADD COLUMN recur_days TEXT").catch(() => {});
  await db.execute(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      date_done TEXT NOT NULL,
      recurrence_count INTEGER NOT NULL DEFAULT 1
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tree_nodes (
      id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      task_id INTEGER
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tree_links (
      id INTEGER PRIMARY KEY,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL
    )
  `);
}

export async function loadTasks(): Promise<TaskRow[]> {
  const db = await getDb();
  return db.select<TaskRow[]>("SELECT * FROM tasks ORDER BY id ASC");
}

export async function syncTasks(rows: TaskRow[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks");
  for (const t of rows) {
    await db.execute(
      "INSERT OR REPLACE INTO tasks (id, description, recurring, done, num_repeated, done_date, work_dismissed, recur_days) VALUES (?,?,?,?,?,?,?,?)",
      [t.id, t.description, t.recurring, t.done, t.num_repeated, t.done_date, t.work_dismissed, t.recur_days]
    );
  }
}

export async function loadHistory(): Promise<HistoryRow[]> {
  const db = await getDb();
  return db.select<HistoryRow[]>("SELECT * FROM history ORDER BY id ASC");
}

export async function syncHistory(rows: HistoryRow[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM history");
  for (const h of rows) {
    await db.execute(
      "INSERT OR REPLACE INTO history (id, description, date_done, recurrence_count) VALUES (?,?,?,?)",
      [h.id, h.description, h.date_done, h.recurrence_count]
    );
  }
}

export async function loadTreeNodes(): Promise<TreeNodeRow[]> {
  const db = await getDb();
  return db.select<TreeNodeRow[]>("SELECT * FROM tree_nodes ORDER BY id ASC");
}

export async function syncTreeNodes(rows: TreeNodeRow[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tree_nodes");
  for (const n of rows) {
    await db.execute(
      "INSERT OR REPLACE INTO tree_nodes (id, description, x, y, done, task_id) VALUES (?,?,?,?,?,?)",
      [n.id, n.description, n.x, n.y, n.done, n.task_id]
    );
  }
}

export async function loadTreeLinks(): Promise<TreeLinkRow[]> {
  const db = await getDb();
  return db.select<TreeLinkRow[]>("SELECT * FROM tree_links ORDER BY id ASC");
}

export async function syncTreeLinks(rows: TreeLinkRow[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tree_links");
  for (const l of rows) {
    await db.execute(
      "INSERT OR REPLACE INTO tree_links (id, from_id, to_id) VALUES (?,?,?)",
      [l.id, l.from_id, l.to_id]
    );
  }
}
