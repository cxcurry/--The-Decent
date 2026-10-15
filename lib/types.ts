export const TIERS = [
  { name: "SURFACE", points: 10, color: "#8796ac" },
  { name: "RECOGNIZED", points: 15, color: "#a8d7ff" },
  { name: "DEEP THINKER", points: 30, color: "#77bbff" },
  { name: "RARE FIND", points: 60, color: "#4ea5ff" },
  { name: "ABYSSAL", points: 85, color: "#7d92ff" },
  { name: "CORE°", points: 100, color: "#f5f7fb" },
] as const;
export const ZONES = [
  "THE SURFACE",
  "THE VEIL",
  "THE VOID",
  "THE ABYSS",
  "THE UNKNOWN",
  "THE SINGULARITY",
  "THE CORE",
];
export function zoneFor(score: number) {
  return ZONES[Math.min(6, Math.floor(score / 100))];
}
export type RoundView = {
  number: number;
  prompt: string;
  category: string;
  previewUntil: number;
  deadline: number;
  draft: string;
  resolved: boolean;
  answer: string | null;
  submitted: string | null;
  points: number;
  tier: string | null;
  outcome: string | null;
};
export type AttemptView = {
  day: string;
  status: "active" | "complete";
  score: number;
  current: number;
  rounds: RoundView[];
};
export type Stats = {
  best: number;
  average: number;
  completed: number;
  streak: number;
  longestStreak: number;
};
export type GameView = {
  day: string;
  challenge: number;
  nextReset: number;
  serverTime: number;
  attempt: AttemptView | null;
  stats: Stats;
  feedback?: string;
  rejected?: boolean;
};
export type HistoryEntry = { day: string; score: number; rounds: RoundView[] };
