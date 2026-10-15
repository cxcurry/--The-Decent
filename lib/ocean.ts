// This is a stylized expedition, with stable geography measured in game meters.
// Every terrain point keeps its world depth; increasing camera depth moves that
// same point upward rather than generating another copy of the surroundings.
export const OCEAN_LAYERS = [
  {
    depth: 0,
    name: "Sunlit reef",
    detail: "Sunbeams · coral · schooling fish",
    color: [12, 97, 115],
    accent: "91,237,208",
    kind: "reef",
  },
  {
    depth: 1000,
    name: "Twilight forest",
    detail: "Kelp canopies · blue canyons",
    color: [9, 48, 85],
    accent: "90,200,241",
    kind: "kelp",
  },
  {
    depth: 2000,
    name: "Luminous gardens",
    detail: "Jellyfish · living blue light",
    color: [16, 28, 66],
    accent: "111,168,255",
    kind: "jellies",
  },
  {
    depth: 3000,
    name: "The sunken city",
    detail: "Broken arches · forgotten monuments",
    color: [10, 35, 50],
    accent: "94,223,209",
    kind: "ruins",
  },
  {
    depth: 4000,
    name: "Hydrothermal fields",
    detail: "Basalt chimneys · rising thermal plumes",
    color: [28, 24, 36],
    accent: "255,165,98",
    kind: "vents",
  },
  {
    depth: 5000,
    name: "Crystal chasm",
    detail: "Violet spires · luminous mineral seams",
    color: [31, 19, 57],
    accent: "186,139,255",
    kind: "crystals",
  },
  {
    depth: 6000,
    name: "The core sanctuary",
    detail: "Golden currents · the final frontier",
    color: [36, 29, 29],
    accent: "255,218,139",
    kind: "core",
  },
] as const;
export function oceanLayer(depth: number) {
  return OCEAN_LAYERS[Math.min(6, Math.max(0, Math.floor(depth / 1000)))];
}
export function oceanColor(depth: number): [number, number, number] {
  const d = Math.max(0, Math.min(7000, depth));
  const index = Math.min(6, Math.floor(d / 1000));
  const next = Math.min(6, index + 1);
  const blend = Math.max(0, Math.min(1, (d - index * 1000 - 780) / 220));
  return OCEAN_LAYERS[index].color.map((value, i) =>
    Math.round(value + (OCEAN_LAYERS[next].color[i] - value) * blend),
  ) as [number, number, number];
}
export function worldY(
  featureDepth: number,
  cameraDepth: number,
  viewportHeight: number,
  origin: number,
  parallax = 1,
) {
  return (
    origin + (((featureDepth - cameraDepth) * viewportHeight) / 850) * parallax
  );
}
export function terrainEdge(
  index: number,
  side: number,
  width: number,
  layer: number,
) {
  const wave =
    Math.sin(index * 0.68 + side * 1.7) * 0.035 +
    Math.sin(index * 1.81 + layer) * 0.017;
  return (
    width *
    (side < 0 ? 0.35 + layer * 0.045 + wave : 1.025 - layer * 0.033 + wave)
  );
}
