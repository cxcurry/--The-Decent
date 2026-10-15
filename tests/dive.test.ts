import { describe, expect, it } from "vitest";
import {
  diveDepth,
  diveEnvelope,
  diveProfile,
  diveProgress,
  earnedDive,
} from "../lib/dive";
import type { GameView } from "../lib/types";
function view(score: number, resolved: boolean, points = 0): GameView {
  return {
    day: "2026-10-15",
    challenge: 288,
    nextReset: 100000,
    serverTime: 1,
    stats: { best: 0, average: 0, completed: 0, streak: 0, longestStreak: 0 },
    attempt: {
      day: "2026-10-15",
      edition: "everyday-v2",
      status: "active",
      current: 2,
      score,
      rounds: [
        {
          number: 2,
          prompt: "Name any country.",
          category: "Geography",
          previewUntil: 0,
          deadline: 10000,
          draft: "India",
          resolved,
          answer: resolved ? "India" : null,
          submitted: null,
          points,
          tier: null,
          outcome: null,
        },
      ],
    },
  };
}
describe("point-scaled dive rewards", () => {
  it("scales duration, movement, wildlife response and sound across all six tiers", () => {
    const profiles = [10, 15, 30, 60, 85, 100].map((n) => diveProfile(n)!);
    for (let i = 1; i < profiles.length; i++)
      for (const key of [
        "intensity",
        "duration",
        "shake",
        "scatter",
        "volume",
      ] as const)
        expect(profiles[i][key]).toBeGreaterThan(profiles[i - 1][key]);
    expect(profiles.at(-1)!.duration).toBeLessThanOrEqual(3500);
    expect(profiles.at(-1)!.volume).toBeLessThanOrEqual(0.3);
    for (const points of [0, -10, 1, 700, NaN])
      expect(diveProfile(points)).toBeNull();
  });
  it("awards only the newly accepted round, at the actual earned depth", () => {
    const dive = earnedDive(view(60, false), view(160, true, 100), 500)!;
    expect(dive.fromDepth).toBe(600);
    expect(dive.toDepth).toBe(1600);
    expect(dive.profile.points).toBe(100);
    expect(
      earnedDive(view(160, true, 100), view(160, true, 100), 501),
    ).toBeNull();
  });
  it("does not replay on page load, a pass, an invalid answer or a different round/day/edition", () => {
    expect(earnedDive(null, view(160, true, 100), 0)).toBeNull();
    expect(earnedDive(view(60, false), view(60, true, 0), 0)).toBeNull();
    expect(earnedDive(view(60, false), view(60, false), 0)).toBeNull();
    for (const mutate of [
      (v: GameView) => (v.attempt!.day = "2026-10-16"),
      (v: GameView) => (v.attempt!.edition = "other"),
      (v: GameView) => (v.attempt!.rounds[0].number = 3),
    ]) {
      const next = view(160, true, 100);
      mutate(next);
      expect(earnedDive(view(60, false), next, 0)).toBeNull();
    }
    expect(earnedDive(view(60, false), view(150, true, 100), 0)).toBeNull();
  });
  it("travels continuously between the real depths and settles exactly at the destination", () => {
    const dive = earnedDive(view(60, false), view(160, true, 100), 500)!;
    let previous = dive.fromDepth;
    for (let time = 500; time <= 3800; time += 100) {
      const depth = diveDepth(dive, time);
      expect(depth).toBeGreaterThanOrEqual(previous);
      expect(depth).toBeLessThanOrEqual(1600);
      previous = depth;
    }
    expect(diveDepth(dive, 0)).toBe(600);
    expect(diveDepth(dive, 10000)).toBe(1600);
    expect(diveProgress(dive, 10000)).toBe(1);
    expect(diveEnvelope(0)).toBe(0);
    expect(diveEnvelope(1)).toBe(0);
    expect(diveEnvelope(0.4)).toBe(1);
  });
});
