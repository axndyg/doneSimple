// SQLite persistence layer for doneSimple
// Wire up with tauri-plugin-sql when ready.
// All functions are stubs that return empty data until wired.
//
// Schema (SQLite):
//
// CREATE TABLE IF NOT EXISTS tasks (
//   id INTEGER PRIMARY KEY,
//   description TEXT NOT NULL,
//   recurring INTEGER NOT NULL DEFAULT 0,   -- 0 = false, 1 = true
//   done INTEGER NOT NULL DEFAULT 0,
//   num_repeated INTEGER NOT NULL DEFAULT 0,
//   done_date TEXT                           -- YYYY-MM-DD or NULL
// );
//
// CREATE TABLE IF NOT EXISTS history (
//   id INTEGER PRIMARY KEY,
//   description TEXT NOT NULL,
//   date_done TEXT NOT NULL,                 -- YYYY-MM-DD
//   recurrence_count INTEGER NOT NULL DEFAULT 1
// );

export interface TaskRow {
  id: number;
  description: string;
  recurring: number;       // 0 | 1
  done: number;            // 0 | 1
  num_repeated: number;
  done_date: string | null;
}

export interface HistoryRow {
  id: number;
  description: string;
  date_done: string;
  recurrence_count: number;
}

// TODO: replace each stub body with:
// import Database from "@tauri-apps/plugin-sql";
// const db = await Database.load("sqlite:donesimple.db");

export async function loadTasks(): Promise<TaskRow[]> {
  return [];
  // return db.select<TaskRow[]>("SELECT * FROM tasks ORDER BY id ASC");
}

export async function upsertTask(task: TaskRow): Promise<void> {
  // db.execute(
  //   "INSERT OR REPLACE INTO tasks (id, description, recurring, done, num_repeated, done_date) VALUES (?,?,?,?,?,?)",
  //   [task.id, task.description, task.recurring, task.done, task.num_repeated, task.done_date]
  // );
}

export async function deleteTask(id: number): Promise<void> {
  // db.execute("DELETE FROM tasks WHERE id = ?", [id]);
}

export async function loadHistory(): Promise<HistoryRow[]> {
  return [];
  // return db.select<HistoryRow[]>("SELECT * FROM history ORDER BY id ASC");
}

export async function insertHistory(entry: HistoryRow): Promise<void> {
  // db.execute(
  //   "INSERT INTO history (id, description, date_done, recurrence_count) VALUES (?,?,?,?)",
  //   [entry.id, entry.description, entry.date_done, entry.recurrence_count]
  // );
}

export async function clearHistory(): Promise<void> {
  // db.execute("DELETE FROM history");
}
