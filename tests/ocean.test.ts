import { expect, it } from "vitest";
import { OCEAN_LAYERS, oceanColor, oceanLayer, worldY } from "../lib/ocean";
it("the entire scoring range has seven distinct depth ecosystems", () => {
  expect(new Set(OCEAN_LAYERS.map((layer) => layer.kind)).size).toBe(7);
  for (let i = 0; i < 7; i++)
    expect(oceanLayer(i * 1000).name).toBe(OCEAN_LAYERS[i].name);
  expect(oceanLayer(-100)).toBe(OCEAN_LAYERS[0]);
  expect(oceanLayer(7000)).toBe(OCEAN_LAYERS[6]);
});
it("a fixed landmark passes upward continuously as the submarine descends", () => {
  const positions = [0, 100, 300, 600, 850, 1000].map((depth) =>
    worldY(1000, depth, 850, 400),
  );
  for (let i = 1; i < positions.length; i++)
    expect(positions[i]).toBeLessThan(positions[i - 1]);
  expect(positions[0] - positions.at(-1)!).toBeGreaterThan(850);
  expect(worldY(1000, 1000, 850, 400)).toBe(400);
});
it("water lighting changes smoothly across ecosystem boundaries", () => {
  for (let boundary = 1000; boundary <= 6000; boundary += 1000) {
    const before = oceanColor(boundary - 1),
      after = oceanColor(boundary);
    for (let channel = 0; channel < 3; channel++)
      expect(Math.abs(before[channel] - after[channel])).toBeLessThanOrEqual(1);
  }
  expect(oceanColor(0)).not.toEqual(oceanColor(3500));
  expect(oceanColor(3500)).not.toEqual(oceanColor(6500));
});
