import { beforeEach, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { dayAt, nextReset, setFor } from "../lib/daily";
import {
  normalize,
  recognize,
  editDistance,
  type Candidate,
} from "../lib/recognition";
import { questions } from "../lib/questions";
import { TIERS, zoneFor } from "../lib/types";
import { db, sqlite } from "../lib/db";
import { answerTable } from "../lib/schema";
import { eq } from "drizzle-orm";
import { gameState, identity, historyFor, statsFor } from "../lib/game";
const NOW = Date.parse("2026-10-14T16:00:00Z");
let player: string;
beforeEach(() => {
  if (resolve(sqlite.name) !== resolve(".local/unit-test.sqlite"))
    throw new Error(
      "Refusing to reset a database outside the isolated unit-test path.",
    );
  sqlite.exec("DELETE FROM rounds;DELETE FROM attempts;DELETE FROM players;");
  player = identity(undefined, NOW).id;
});
function candidates(questionId: string) {
  return db
    .select()
    .from(answerTable)
    .where(eq(answerTable.questionId, questionId))
    .all();
}
function currentQuestion(state: ReturnType<typeof gameState>) {
  return questions.find(
    (q) => q.prompt === state.attempt!.rounds.at(-1)!.prompt,
  )!;
}
describe("answer recognition", () => {
  const answers: Candidate[] = [
    {
      canonical: "São Tomé and Príncipe",
      aliases: ["Sao Tome"],
      points: 100,
      tier: "CORE°",
    },
    { canonical: "Nigeria", aliases: [], points: 10, tier: "SURFACE" },
    { canonical: "Niger", aliases: [], points: 85, tier: "ABYSSAL" },
  ];
  it("normalizes case, accents, punctuation, whitespace and ampersands", () => {
    expect(normalize("  SÃO   TOMÉ & PRÍNCIPE! ")).toBe(
      "sao tome and principe",
    );
    expect(recognize("são tomé & príncipe", answers)?.points).toBe(100);
  });
  it("recognizes aliases with identical canonical scores", () => {
    expect(recognize("Sao Tome", answers)).toEqual(answers[0]);
  });
  it("corrects one unambiguous typo, never an unrelated answer", () => {
    expect(recognize("Nigria", answers)?.canonical).toBe("Nigeria");
    expect(recognize("Atlantis", answers)).toBeNull();
    expect(recognize("Nig", answers)).toBeNull();
  });
  it("rejects an ambiguous near-match", () => {
    const two = [
      { ...answers[1], canonical: "cater" },
      { ...answers[2], canonical: "caper" },
    ];
    expect(recognize("caver", two)).toBeNull();
  });
  it("computes edit distance", () =>
    expect(editDistance("kitten", "sitting")).toBe(3));
});
describe("curated data", () => {
  it("has seven complete daily sets and 49 original multi-answer questions", () => {
    expect(questions).toHaveLength(49);
    expect(new Set(questions.map((q) => q.prompt)).size).toBe(49);
    for (let set = 0; set < 7; set++) {
      expect(questions.filter((q) => q.set === set)).toHaveLength(7);
    }
    for (const q of questions) {
      expect(candidates(q.id).length).toBeGreaterThanOrEqual(4);
      expect(
        new Set(candidates(q.id).map((a) => a.points)).size,
      ).toBeGreaterThanOrEqual(4);
      expect(Math.max(...candidates(q.id).map((a) => a.points))).toBe(100);
    }
  });
  it("has no conflicting normalized aliases and only supported scores", () => {
    for (const q of questions) {
      const seen = new Map<string, string>();
      for (const a of candidates(q.id)) {
        expect(
          TIERS.some((t) => t.points === a.points && t.name === a.tier),
        ).toBe(true);
        for (const v of [a.canonical, ...a.aliases]) {
          const n = normalize(v);
          expect(n.length).toBeGreaterThan(0);
          expect(seen.has(n) ? seen.get(n) : a.canonical, `${q.id}: ${n}`).toBe(
            a.canonical,
          );
          seen.set(n, a.canonical);
        }
      }
    }
  });
  it("does not accept out-of-scope factual examples", () => {
    expect(recognize("Iron", candidates("q38"))).toBeNull();
    expect(recognize("Van Gogh", candidates("q21"))).toBeNull();
    expect(recognize("Frans Hals", candidates("q21"))).toBeNull();
    expect(candidates("q01")).toHaveLength(54);
    expect(recognize("Lincoln", candidates("q26"))).toBeNull();
    expect(recognize("Linda Buck", candidates("q19"))).toBeNull();
  });
});
describe("New York daily scheduling", () => {
  it("changes at New York midnight, not UTC midnight", () => {
    expect(dayAt(Date.parse("2026-10-15T03:59:59Z"))).toBe("2026-10-14");
    expect(dayAt(Date.parse("2026-10-15T04:00:00Z"))).toBe("2026-10-15");
  });
  it("handles the 23-hour spring-forward day", () => {
    const t = Date.parse("2026-03-08T05:00:00Z");
    expect(nextReset(t)).toBe(Date.parse("2026-03-09T04:00:00Z"));
    expect(nextReset(t) - t).toBe(23 * 3600000);
  });
  it("handles the 25-hour fall-back day", () => {
    const t = Date.parse("2026-11-01T04:00:00Z");
    expect(nextReset(t)).toBe(Date.parse("2026-11-02T05:00:00Z"));
    expect(nextReset(t) - t).toBe(25 * 3600000);
  });
  it("rotates all seven sets deterministically", () => {
    expect(setFor("2026-01-01")).toBe(setFor("2026-01-08"));
    expect(
      new Set(Array.from({ length: 7 }, (_, i) => setFor(`2026-01-0${i + 1}`)))
        .size,
    ).toBe(7);
  });
});
describe("server-authoritative daily engine", () => {
  it("creates a secure opaque identity and reuses its cookie", () => {
    const a = identity(undefined, NOW);
    expect(a.token).toMatch(/^[a-f0-9]{64}$/);
    expect(a.id).not.toBe(a.token);
    expect(identity(a.token).id).toBe(a.id);
  });
  it("gives the same prompts to all players and exposes only the current question", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    const b = gameState(
      identity(undefined, NOW).id,
      "start",
      "",
      undefined,
      NOW,
    );
    expect(a.attempt!.rounds).toHaveLength(1);
    expect(a.attempt!.rounds[0].prompt).toBe(b.attempt!.rounds[0].prompt);
    expect(JSON.stringify(a)).not.toContain("aliases");
  });
  it("enforces the two-second reading preview", () => {
    gameState(player, "start", "", undefined, NOW);
    expect(() => gameState(player, "submit", "test", 1, NOW + 1999)).toThrow(
      "read the prompt",
    );
  });
  it("keeps the original deadline after refresh and rejected guesses", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    const deadline = a.attempt!.rounds[0].deadline;
    const b = gameState(player, "submit", "not a real answer", 1, NOW + 3000);
    expect(b.rejected).toBe(true);
    expect(b.attempt!.rounds[0].resolved).toBe(false);
    expect(
      gameState(player, "state", "", undefined, NOW + 4000).attempt!.rounds[0]
        .deadline,
    ).toBe(deadline);
  });
  it("locks accepted answers and prevents duplicate scoring", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    const answer = candidates(currentQuestion(a).id)[0];
    const b = gameState(player, "submit", answer.canonical, 1, NOW + 3000);
    const c = gameState(player, "submit", answer.canonical, 1, NOW + 3100);
    expect(b.attempt!.score).toBe(answer.points);
    expect(c.attempt!.score).toBe(answer.points);
  });
  it("auto-evaluates the saved draft at expiry and ignores a late replacement", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    const answers = candidates(currentQuestion(a).id);
    gameState(player, "draft", answers[0].canonical, 1, NOW + 5000);
    const b = gameState(
      player,
      "submit",
      answers.at(-1)!.canonical,
      1,
      NOW + 27001,
    );
    expect(b.attempt!.rounds[0].answer).toBe(answers[0].canonical);
    expect(b.attempt!.score).toBe(answers[0].points);
  });
  it("awards zero for an expired empty draft, and reveal time never advances a round", () => {
    gameState(player, "start", "", undefined, NOW);
    const b = gameState(player, "state", "", undefined, NOW + 30000);
    expect(b.attempt!.rounds[0].outcome).toBe("timeout");
    expect(b.attempt!.score).toBe(0);
    expect(
      gameState(player, "state", "", undefined, NOW + 300000).attempt!.rounds,
    ).toHaveLength(1);
  });
  it("passes for zero even with a valid draft", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    gameState(
      player,
      "draft",
      candidates(currentQuestion(a).id)[0].canonical,
      1,
      NOW + 2500,
    );
    const b = gameState(player, "pass", "", 1, NOW + 3000);
    expect(b.attempt!.score).toBe(0);
    expect(b.attempt!.rounds[0].outcome).toBe("passed");
  });
  it("prevents a stale continue request from skipping or starting another round", () => {
    gameState(player, "start", "", undefined, NOW);
    gameState(player, "pass", "", 1, NOW + 3000);
    gameState(player, "continue", "", 1, NOW + 4000);
    expect(() => gameState(player, "continue", "", 1, NOW + 4100)).toThrow(
      "moved on",
    );
    expect(
      gameState(player, "state", "", undefined, NOW + 4200).attempt!.rounds,
    ).toHaveLength(2);
  });
  it("finishes all seven rounds, saves history and forbids daily replay", () => {
    let state = gameState(player, "start", "", undefined, NOW);
    let time = NOW,
      total = 0;
    for (let i = 1; i <= 7; i++) {
      const answer = candidates(currentQuestion(state).id).at(-1)!;
      time += 3000;
      state = gameState(player, "submit", answer.canonical, i, time);
      total += answer.points;
      expect(state.attempt!.score).toBe(total);
      if (i < 7) {
        time += 1000;
        state = gameState(player, "continue", "", i, time);
      }
    }
    expect(state.attempt!.status).toBe("complete");
    expect(state.attempt!.rounds).toHaveLength(7);
    expect(
      gameState(player, "start", "", undefined, time + 1000).attempt,
    ).toEqual(state.attempt);
    expect(historyFor(player)[0].score).toBe(total);
    expect(statsFor(player, "2026-10-14").completed).toBe(1);
    expect(total).toBeLessThanOrEqual(700);
  });
  it("unlocks the next day without changing the saved previous-day attempt", () => {
    const a = gameState(player, "start", "", undefined, NOW);
    const tomorrow = nextReset(NOW);
    const b = gameState(player, "start", "", undefined, tomorrow + 1000);
    expect(a.day).not.toBe(b.day);
    expect(a.attempt!.rounds[0].prompt).not.toBe(b.attempt!.rounds[0].prompt);
    expect(b.attempt!.score).toBe(0);
  });
  it("supports a 700-point game on every set and computes longest/current streaks", () => {
    function perfectDay(time: number) {
      let state = gameState(player, "start", "", undefined, time);
      for (let index = 1; index <= 7; index++) {
        time += 3000;
        const answer = candidates(currentQuestion(state).id).find(
          (a) => a.points === 100,
        )!;
        state = gameState(player, "submit", answer.canonical, index, time);
        if (index < 7) {
          time += 1000;
          state = gameState(player, "continue", "", index, time);
        }
      }
      expect(state.attempt!.score).toBe(700);
    }
    for (let day = 1; day <= 7; day++)
      perfectDay(Date.parse(`2026-01-0${day}T17:00:00Z`));
    expect(historyFor(player)).toHaveLength(7);
    expect(statsFor(player, "2026-01-07")).toMatchObject({
      streak: 7,
      longestStreak: 7,
      average: 700,
      best: 700,
    });
    expect(statsFor(player, "2026-01-08").streak).toBe(7);
    expect(statsFor(player, "2026-01-09").streak).toBe(0);
    perfectDay(Date.parse("2026-01-09T17:00:00Z"));
    expect(statsFor(player, "2026-01-09")).toMatchObject({
      streak: 1,
      longestStreak: 7,
      completed: 8,
    });
  });
  it("maps score to the correct environment zones", () => {
    expect(zoneFor(0)).toBe("THE SURFACE");
    expect(zoneFor(100)).toBe("THE VEIL");
    expect(zoneFor(700)).toBe("THE CORE");
  });
});
