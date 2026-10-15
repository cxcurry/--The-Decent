import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { questions } from "./questions";
import { migrateEditions } from "./migrations";
import { TIERS } from "./types";
import { answerTable, questionTable } from "./schema";
// Runtime volume paths are not deployment assets to bundle.
const dbPath = resolve(
  /* turbopackIgnore: true */ process.env.DATABASE_PATH || ".local/core.sqlite",
);
mkdirSync(dirname(dbPath), { recursive: true });
const globalDB = globalThis as unknown as { coreSqlite?: Database.Database };
export const sqlite = globalDB.coreSqlite ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") globalDB.coreSqlite = sqlite;
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
sqlite.exec(`
CREATE TABLE IF NOT EXISTS seed_metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY,set_id INTEGER NOT NULL,position INTEGER NOT NULL,category TEXT NOT NULL,prompt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS answers (id INTEGER PRIMARY KEY AUTOINCREMENT,question_id TEXT NOT NULL REFERENCES questions(id),canonical TEXT NOT NULL,aliases TEXT NOT NULL,points INTEGER NOT NULL,tier TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT,player_id TEXT NOT NULL REFERENCES players(id),day TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',current INTEGER NOT NULL DEFAULT 0,score INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS rounds (id INTEGER PRIMARY KEY AUTOINCREMENT,attempt_id INTEGER NOT NULL REFERENCES attempts(id),question_id TEXT NOT NULL REFERENCES questions(id),number INTEGER NOT NULL,preview_until INTEGER NOT NULL,deadline INTEGER NOT NULL,draft TEXT NOT NULL DEFAULT '',resolved INTEGER NOT NULL DEFAULT 0,answer TEXT,submitted TEXT,points INTEGER NOT NULL DEFAULT 0,tier TEXT,outcome TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS one_round ON rounds(attempt_id,number);
CREATE INDEX IF NOT EXISTS answers_question ON answers(question_id);
`);
migrateEditions(sqlite);
export const db = drizzle(sqlite);
export function seed() {
  const version = createHash("sha256")
    .update(JSON.stringify(questions))
    .digest("hex");
  sqlite
    .transaction(() => {
      const stored = sqlite
        .prepare("SELECT value FROM seed_metadata WHERE key='question_version'")
        .get() as { value: string } | undefined;
      if (stored?.value === version) return;
      for (const question of questions) {
        db.insert(questionTable)
          .values({
            id: question.id,
            set: question.set,
            position: question.position,
            category: question.category,
            prompt: question.prompt,
          })
          .onConflictDoUpdate({
            target: questionTable.id,
            set: {
              set: question.set,
              position: question.position,
              category: question.category,
              prompt: question.prompt,
            },
          })
          .run();
        db.delete(answerTable)
          .where(eq(answerTable.questionId, question.id))
          .run();
        question.groups.forEach((group, i) =>
          group
            .split("|")
            .filter(Boolean)
            .forEach((entry) => {
              const [canonical, ...aliases] = entry.split("~").filter(Boolean);
              db.insert(answerTable)
                .values({
                  questionId: question.id,
                  canonical,
                  aliases,
                  points: TIERS[i].points,
                  tier: TIERS[i].name,
                })
                .run();
            }),
        );
      }
      sqlite
        .prepare(
          "INSERT INTO seed_metadata(key,value) VALUES ('question_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(version);
    })
    .immediate();
}
seed();
