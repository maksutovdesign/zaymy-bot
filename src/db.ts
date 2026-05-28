import { createClient } from "@libsql/client";
import type { ConversationState, KarmaEntry, Loan, User } from "./types";

// Supports both local SQLite (file:./data.db) and Turso (libsql://...)
export const db = createClient({
  url: process.env.DATABASE_URL ?? "file:./data.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id      INTEGER UNIQUE NOT NULL,
      name       TEXT    NOT NULL DEFAULT '',
      karma      INTEGER NOT NULL DEFAULT 0,
      state      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL,
      type                TEXT    NOT NULL CHECK(type IN ('given','taken')),
      contact             TEXT    NOT NULL,
      amount              REAL    NOT NULL,
      term_days           INTEGER NOT NULL,
      interest_rate       REAL    NOT NULL DEFAULT 0,
      status              TEXT    NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active','returned','overdue','written_off')),
      due_date            TEXT    NOT NULL,
      last_penalized_date TEXT,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migrate existing databases — add column if it doesn't exist yet
  try {
    await db.execute(`ALTER TABLE loans ADD COLUMN last_penalized_date TEXT`);
  } catch {
    // Column already exists — safe to ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS karma_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      points     INTEGER NOT NULL,
      reason     TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(tgId: number, name: string): Promise<User> {
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (tg_id, name) VALUES (?, ?)`,
    args: [tgId, name],
  });
  const result = await db.execute({
    sql: `SELECT * FROM users WHERE tg_id = ?`,
    args: [tgId],
  });
  return result.rows[0] as unknown as User;
}

export async function getUser(tgId: number): Promise<User | null> {
  const result = await db.execute({
    sql: `SELECT * FROM users WHERE tg_id = ?`,
    args: [tgId],
  });
  return (result.rows[0] as unknown as User) ?? null;
}

export async function setUserName(tgId: number, name: string): Promise<void> {
  await db.execute({
    sql: `UPDATE users SET name = ? WHERE tg_id = ?`,
    args: [name, tgId],
  });
}

export async function setState(tgId: number, state: ConversationState): Promise<void> {
  await db.execute({
    sql: `UPDATE users SET state = ? WHERE tg_id = ?`,
    args: [JSON.stringify(state), tgId],
  });
}

export async function getState(tgId: number): Promise<ConversationState> {
  const user = await getUser(tgId);
  if (!user?.state) return { step: "idle" };
  try {
    return JSON.parse(user.state) as ConversationState;
  } catch {
    return { step: "idle" };
  }
}

export async function clearState(tgId: number): Promise<void> {
  await setState(tgId, { step: "idle" });
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export async function addLoan(
  userId: number,
  type: "given" | "taken",
  contact: string,
  amount: number,
  termDays: number,
  interestRate: number
): Promise<number> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + termDays);

  const result = await db.execute({
    sql: `INSERT INTO loans (user_id, type, contact, amount, term_days, interest_rate, due_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [userId, type, contact, amount, termDays, interestRate, dueDate.toISOString()],
  });
  return Number(result.lastInsertRowid);
}

export async function getActiveLoans(userId: number): Promise<Loan[]> {
  const result = await db.execute({
    sql: `SELECT * FROM loans WHERE user_id = ? AND status = 'active' ORDER BY due_date ASC`,
    args: [userId],
  });
  return result.rows as unknown as Loan[];
}

export async function getLoan(loanId: number): Promise<Loan | null> {
  const result = await db.execute({
    sql: `SELECT * FROM loans WHERE id = ?`,
    args: [loanId],
  });
  return (result.rows[0] as unknown as Loan) ?? null;
}

export async function updateLoanStatus(
  loanId: number,
  status: Loan["status"]
): Promise<void> {
  await db.execute({
    sql: `UPDATE loans SET status = ? WHERE id = ?`,
    args: [status, loanId],
  });
}

export async function getAllLoansForUser(userId: number): Promise<Loan[]> {
  const result = await db.execute({
    sql: `SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as Loan[];
}

export async function getOverdueActiveLoans(): Promise<(Loan & { tg_id: number })[]> {
  const result = await db.execute(`
    SELECT l.*, u.tg_id
    FROM loans l
    JOIN users u ON u.id = l.user_id
    WHERE l.status = 'active'
      AND l.due_date < datetime('now')
      AND (l.last_penalized_date IS NULL OR l.last_penalized_date != date('now'))
  `);
  return result.rows as unknown as (Loan & { tg_id: number })[];
}

export async function markLoanPenalizedToday(loanId: number): Promise<void> {
  await db.execute({
    sql: `UPDATE loans SET last_penalized_date = date('now') WHERE id = ?`,
    args: [loanId],
  });
}

export async function getDueTomorrowLoans(): Promise<(Loan & { tg_id: number; name: string })[]> {
  const result = await db.execute(`
    SELECT l.*, u.tg_id, u.name
    FROM loans l
    JOIN users u ON u.id = l.user_id
    WHERE l.status = 'active'
      AND date(l.due_date) = date('now', '+1 day')
  `);
  return result.rows as unknown as (Loan & { tg_id: number; name: string })[];
}

// ─── Karma ────────────────────────────────────────────────────────────────────

export async function addKarma(userId: number, points: number, reason: string): Promise<number> {
  await db.execute({
    sql: `UPDATE users SET karma = MAX(0, karma + ?) WHERE id = ?`,
    args: [points, userId],
  });
  await db.execute({
    sql: `INSERT INTO karma_history (user_id, points, reason) VALUES (?, ?, ?)`,
    args: [userId, points, reason],
  });
  const result = await db.execute({
    sql: `SELECT karma FROM users WHERE id = ?`,
    args: [userId],
  });
  return Number((result.rows[0] as any).karma);
}

export async function getKarmaHistory(userId: number, limit = 10): Promise<KarmaEntry[]> {
  const result = await db.execute({
    sql: `SELECT * FROM karma_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows as unknown as KarmaEntry[];
}
