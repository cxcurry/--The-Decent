import type { GameView } from "./types";

// One shared score curve drives the visual and audio reward. Durations are in
// milliseconds, depths in meters, shake in CSS pixels, and volume stays bounded.
const REWARDS = [
  {
    points: 10,
    intensity: 0.16,
    duration: 1400,
    shake: 0.6,
    scatter: 35,
    volume: 0.1,
    label: "GENTLE DIVE",
  },
  {
    points: 15,
    intensity: 0.25,
    duration: 1650,
    shake: 1.2,
    scatter: 60,
    volume: 0.12,
    label: "STEADY DESCENT",
  },
  {
    points: 30,
    intensity: 0.4,
    duration: 2000,
    shake: 2.8,
    scatter: 105,
    volume: 0.15,
    label: "DEEP DIVE",
  },
  {
    points: 60,
    intensity: 0.64,
    duration: 2500,
    shake: 5.5,
    scatter: 175,
    volume: 0.2,
    label: "POWER DIVE",
  },
  {
    points: 85,
    intensity: 0.84,
    duration: 2900,
    shake: 8,
    scatter: 240,
    volume: 0.24,
    label: "ABYSSAL SURGE",
  },
  {
    points: 100,
    intensity: 1,
    duration: 3300,
    shake: 11,
    scatter: 310,
    volume: 0.28,
    label: "CORE SURGE",
  },
] as const;
export type DiveProfile = (typeof REWARDS)[number];
export type DiveEvent = {
  id: string;
  fromDepth: number;
  toDepth: number;
  startedAt: number;
  profile: DiveProfile;
  preview?: boolean;
  journey?: boolean;
};
export function diveProfile(points: number): DiveProfile | null {
  return REWARDS.find((reward) => reward.points === points) ?? null;
}

// Only a newly resolved, previously observed round can start a reward. First
// loads, refreshes of reveals, duplicate responses and edition/day changes cannot.
export function earnedDive(
  previous: GameView | null,
  next: GameView,
  startedAt: number,
): DiveEvent | null {
  const before = previous?.attempt,
    after = next.attempt;
  if (
    !before ||
    !after ||
    before.day !== after.day ||
    before.edition !== after.edition
  )
    return null;
  const oldRound = before.rounds.at(-1),
    round = after.rounds.at(-1);
  if (
    !oldRound ||
    !round ||
    oldRound.resolved ||
    !round.resolved ||
    oldRound.number !== round.number ||
    after.score - before.score !== round.points
  )
    return null;
  const profile = diveProfile(round.points);
  if (!profile) return null;
  return {
    id: `${after.day}/${after.edition}/${round.number}`,
    fromDepth: before.score * 10,
    toDepth: after.score * 10,
    startedAt,
    profile,
  };
}
export function diveDuration(dive: DiveEvent) {
  return dive.journey ? 21000 : dive.profile.duration;
}
export function diveProgress(dive: DiveEvent, now: number) {
  return Math.max(0, Math.min(1, (now - dive.startedAt) / diveDuration(dive)));
}
export function diveDepth(dive: DiveEvent, now: number) {
  const p = diveProgress(dive, now);
  const eased = dive.journey
    ? p
    : p < 0.5
      ? 4 * p * p * p
      : 1 - Math.pow(-2 * p + 2, 3) / 2;
  return dive.fromDepth + (dive.toDepth - dive.fromDepth) * eased;
}
export function diveEnvelope(progress: number) {
  if (progress <= 0 || progress >= 1) return 0;
  const rise = Math.min(1, progress / 0.18);
  const fall = Math.min(1, (1 - progress) / 0.35);
  return rise * rise * (3 - 2 * rise) * fall * fall * (3 - 2 * fall);
}
