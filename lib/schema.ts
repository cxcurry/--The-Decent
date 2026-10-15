import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const questionTable = sqliteTable("questions", {
  id: text("id").primaryKey(),
  set: integer("set_id").notNull(),
  position: integer("position").notNull(),
  category: text("category").notNull(),
  prompt: text("prompt").notNull(),
});
export const answerTable = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionTable.id),
  canonical: text("canonical").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull(),
  points: integer("points").notNull(),
  tier: text("tier").notNull(),
});
export const playerTable = sqliteTable("players", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});
export const attemptTable = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: text("player_id")
      .notNull()
      .references(() => playerTable.id),
    day: text("day").notNull(),
    status: text("status")
      .$type<"active" | "complete">()
      .notNull()
      .default("active"),
    current: integer("current").notNull().default(0),
    score: integer("score").notNull().default(0),
  },
  (t) => [uniqueIndex("one_daily_attempt").on(t.playerId, t.day)],
);
export const roundTable = sqliteTable(
  "rounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attemptTable.id),
    questionId: text("question_id")
      .notNull()
      .references(() => questionTable.id),
    number: integer("number").notNull(),
    previewUntil: integer("preview_until").notNull(),
    deadline: integer("deadline").notNull(),
    draft: text("draft").notNull().default(""),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    answer: text("answer"),
    submitted: text("submitted"),
    points: integer("points").notNull().default(0),
    tier: text("tier"),
    outcome: text("outcome"),
  },
  (t) => [uniqueIndex("one_round").on(t.attemptId, t.number)],
);
