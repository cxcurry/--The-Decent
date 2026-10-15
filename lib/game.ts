import { createHash, randomBytes } from "node:crypto";
import { and, eq, asc, desc } from "drizzle-orm";
import { db, sqlite } from "./db";
import {
  answerTable,
  attemptTable,
  playerTable,
  questionTable,
  roundTable,
} from "./schema";
import { dayAt, dayNumber, nextReset, setFor } from "./daily";
import { recognize } from "./recognition";
import type { GameView, Stats, RoundView, HistoryEntry } from "./types";
export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function identity(token: string | undefined, now = Date.now()) {
  const valid = token && /^[a-f0-9]{64}$/.test(token);
  const value = valid ? token : randomBytes(32).toString("hex");
  const id = createHash("sha256").update(value).digest("hex");
  db.insert(playerTable)
    .values({ id, createdAt: now })
    .onConflictDoNothing()
    .run();
  return { id, token: value, fresh: !valid };
}
function attemptFor(playerId: string, day: string) {
  return db
    .select()
    .from(attemptTable)
    .where(and(eq(attemptTable.playerId, playerId), eq(attemptTable.day, day)))
    .get();
}
function roundsFor(attemptId: number): RoundView[] {
  return db
    .select({
      number: roundTable.number,
      prompt: questionTable.prompt,
      category: questionTable.category,
      previewUntil: roundTable.previewUntil,
      deadline: roundTable.deadline,
      draft: roundTable.draft,
      resolved: roundTable.resolved,
      answer: roundTable.answer,
      submitted: roundTable.submitted,
      points: roundTable.points,
      tier: roundTable.tier,
      outcome: roundTable.outcome,
    })
    .from(roundTable)
    .innerJoin(questionTable, eq(questionTable.id, roundTable.questionId))
    .where(eq(roundTable.attemptId, attemptId))
    .orderBy(asc(roundTable.number))
    .all();
}
function beginRound(
  attemptId: number,
  day: string,
  index: number,
  now: number,
) {
  const question = db
    .select()
    .from(questionTable)
    .where(
      and(
        eq(questionTable.set, setFor(day)),
        eq(questionTable.position, index),
      ),
    )
    .get();
  if (!question) throw new GameError("Question data is unavailable.", 503);
  db.insert(roundTable)
    .values({
      attemptId,
      questionId: question.id,
      number: index + 1,
      previewUntil: now + 2000,
      deadline: now + 27000,
    })
    .run();
}
function resolveRound(
  attempt: typeof attemptTable.$inferSelect,
  round: typeof roundTable.$inferSelect,
  text: string,
  outcome: string,
) {
  if (round.resolved) return;
  const candidates = db
    .select()
    .from(answerTable)
    .where(eq(answerTable.questionId, round.questionId))
    .all();
  const accepted = outcome === "passed" ? null : recognize(text, candidates);
  db.update(roundTable)
    .set({
      resolved: true,
      submitted: text || null,
      answer: accepted?.canonical ?? null,
      points: accepted?.points ?? 0,
      tier: accepted?.tier ?? null,
      outcome: accepted ? "accepted" : outcome,
    })
    .where(and(eq(roundTable.id, round.id), eq(roundTable.resolved, false)))
    .run();
  db.update(attemptTable)
    .set({
      score: attempt.score + (accepted?.points ?? 0),
      status: attempt.current === 6 ? "complete" : "active",
    })
    .where(eq(attemptTable.id, attempt.id))
    .run();
}
export function statsFor(playerId: string, day = dayAt()): Stats {
  const completed = db
    .select({ day: attemptTable.day, score: attemptTable.score })
    .from(attemptTable)
    .where(
      and(
        eq(attemptTable.playerId, playerId),
        eq(attemptTable.status, "complete"),
      ),
    )
    .orderBy(asc(attemptTable.day))
    .all();
  let longest = 0,
    run = 0,
    previous = -Infinity;
  for (const a of completed) {
    const n = dayNumber(a.day);
    run = n === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = n;
  }
  const today = dayNumber(day),
    latest = completed.at(-1);
  const streak = latest && dayNumber(latest.day) >= today - 1 ? run : 0;
  return {
    best: Math.max(0, ...completed.map((a) => a.score)),
    average: completed.length
      ? Math.round(
          completed.reduce((sum, a) => sum + a.score, 0) / completed.length,
        )
      : 0,
    completed: completed.length,
    streak,
    longestStreak: longest,
  };
}
export type Action =
  | "state"
  | "start"
  | "submit"
  | "draft"
  | "pass"
  | "continue";
export function gameState(
  playerId: string,
  action: Action = "state",
  text = "",
  expectedRound?: number,
  now = Date.now(),
): GameView {
  return sqlite
    .transaction(() => {
      const day = dayAt(now);
      let attempt = attemptFor(playerId, day);
      let feedback: string | undefined,
        rejected = false;
      if (action === "start" && !attempt) {
        attempt = db
          .insert(attemptTable)
          .values({ playerId, day })
          .returning()
          .get();
        beginRound(attempt.id, day, 0, now);
      }
      if (attempt) {
        let round = db
          .select()
          .from(roundTable)
          .where(
            and(
              eq(roundTable.attemptId, attempt.id),
              eq(roundTable.number, attempt.current + 1),
            ),
          )
          .get()!;
        // Reconcile using the last server-saved draft, never a late answer supplied by a client.
        if (!round.resolved && now >= round.deadline) {
          resolveRound(attempt, round, round.draft, "timeout");
          attempt = attemptFor(playerId, day)!;
          round = db
            .select()
            .from(roundTable)
            .where(eq(roundTable.id, round.id))
            .get()!;
        }
        const matching = expectedRound === round.number;
        if (action !== "state" && action !== "start" && !matching)
          throw new GameError(
            "This round has moved on. Refresh your game.",
            409,
          );
        if (
          action === "continue" &&
          round.resolved &&
          attempt.status !== "complete"
        ) {
          db.update(attemptTable)
            .set({ current: attempt.current + 1 })
            .where(eq(attemptTable.id, attempt.id))
            .run();
          beginRound(attempt.id, day, attempt.current + 1, now);
        } else if (
          (action === "submit" || action === "draft" || action === "pass") &&
          !round.resolved
        ) {
          if (now < round.previewUntil)
            throw new GameError("Take a moment to read the prompt.", 409);
          if (action === "draft")
            db.update(roundTable)
              .set({ draft: text })
              .where(eq(roundTable.id, round.id))
              .run();
          if (action === "pass") resolveRound(attempt, round, "", "passed");
          if (action === "submit") {
            const candidates = db
              .select()
              .from(answerTable)
              .where(eq(answerTable.questionId, round.questionId))
              .all();
            if (recognize(text, candidates))
              resolveRound(attempt, round, text, "accepted");
            else {
              db.update(roundTable)
                .set({ draft: text })
                .where(eq(roundTable.id, round.id))
                .run();
              feedback = text.trim()
                ? "That answer isn’t in our curated bank. Try another—your timer is still running."
                : "Type an answer, or pass this round.";
              rejected = true;
            }
          }
        }
        attempt = attemptFor(playerId, day)!;
      } else if (!["state", "start"].includes(action))
        throw new GameError("Start today’s descent first.", 409);
      return {
        day,
        challenge: dayNumber(day),
        nextReset: nextReset(now),
        serverTime: now,
        attempt: attempt
          ? {
              day: attempt.day,
              status: attempt.status,
              score: attempt.score,
              current: attempt.current,
              rounds: roundsFor(attempt.id),
            }
          : null,
        stats: statsFor(playerId, day),
        feedback,
        rejected,
      };
    })
    .immediate();
}
export function historyFor(playerId: string): HistoryEntry[] {
  return db
    .select()
    .from(attemptTable)
    .where(
      and(
        eq(attemptTable.playerId, playerId),
        eq(attemptTable.status, "complete"),
      ),
    )
    .orderBy(desc(attemptTable.day))
    .all()
    .map((a) => ({ day: a.day, score: a.score, rounds: roundsFor(a.id) }));
}
