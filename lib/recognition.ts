export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/#/g, " sharp ")
    .replace(/&/g, " and ")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export type Candidate = {
  canonical: string;
  aliases: string[];
  points: number;
  tier: string;
};
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return prev[b.length];
}
export function recognize(
  text: string,
  candidates: Candidate[],
): Candidate | null {
  const input = normalize(text);
  if (!input) return null;
  const keys = (c: Candidate) => [c.canonical, ...c.aliases].map(normalize);
  const exact = candidates.find((c) => keys(c).includes(input));
  if (exact) return exact;
  // At most one edit, at least 5 letters; unique canonical match only.
  // No fuzzy expansion of short abbreviations or numeric answers.
  if (input.length < 5 || /\d/.test(input)) return null;
  const matches = candidates.filter((c) =>
    keys(c).some(
      (k) =>
        k.length >= 5 &&
        Math.abs(k.length - input.length) <= 1 &&
        editDistance(input, k) === 1,
    ),
  );
  return matches.length === 1 ? matches[0] : null;
}
