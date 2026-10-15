import type Database from "better-sqlite3";
// A new editorial edition gets a fresh daily attempt without replacing old results.
// Keep original questions and scored rounds intact for historical lookups.
export function migrateEditions(sqlite: Database.Database) {
  sqlite
    .transaction(() => {
      const columns = sqlite.prepare("PRAGMA table_info(attempts)").all() as {
        name: string;
      }[];
      if (!columns.some((c) => c.name === "edition"))
        sqlite.exec(
          "ALTER TABLE attempts ADD COLUMN edition TEXT NOT NULL DEFAULT 'original'",
        );
      sqlite.exec(
        "DROP INDEX IF EXISTS one_daily_attempt; CREATE UNIQUE INDEX IF NOT EXISTS one_daily_attempt_edition ON attempts(player_id,day,edition);",
      );
    })
    .immediate();
}
