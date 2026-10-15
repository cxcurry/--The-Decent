import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { diveProfile } from "../../lib/dive";
import { questions } from "../../lib/questions";
import type { GameView } from "../../lib/types";

// Exercise the actual sound generator with Chromium's OfflineAudioContext.
const soundCode = ts.transpileModule(
  readFileSync("lib/dive-audio.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  },
).outputText;
test("rare pulls render longer and stronger sound waveforms", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "The same audio graph is used on both layouts.",
  );
  const metrics = await page.evaluate(
    async ({ code, profiles }) => {
      const exports: Record<string, Function> = {};
      new Function("exports", code)(exports);
      const measurements = [];
      for (const profile of profiles) {
        const audio = new OfflineAudioContext(1, 4 * 24000, 24000);
        exports.scheduleDiveSound(audio, profile);
        const samples = (await audio.startRendering()).getChannelData(0);
        let energy = 0,
          peak = 0,
          last = 0;
        for (let i = 0; i < samples.length; i++) {
          const value = Math.abs(samples[i]);
          energy += value * value;
          peak = Math.max(peak, value);
          if (value > 0.0005) last = i / audio.sampleRate;
        }
        measurements.push({
          rms: Math.sqrt(energy / samples.length),
          peak,
          last,
        });
      }
      return measurements;
    },
    { code: soundCode, profiles: [diveProfile(10)!, diveProfile(100)!] },
  );
  expect(metrics[0].rms).toBeGreaterThan(0.001);
  expect(metrics[1].rms).toBeGreaterThan(metrics[0].rms * 1.8);
  expect(metrics[1].last).toBeGreaterThan(metrics[0].last + 1);
  expect(metrics[1].peak).toBeLessThan(0.6);
});

test("accepted answers trigger one scaled dive; mute and reduced motion are respected", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // Observe real audio nodes rather than replacing the browser sound engine.
    const original = AudioContext.prototype.createOscillator;
    (window as unknown as { soundStarts: number }).soundStarts = 0;
    AudioContext.prototype.createOscillator = function () {
      const node = original.call(this),
        start = node.start.bind(node);
      node.start = (...args: Parameters<typeof node.start>) => {
        (window as unknown as { soundStarts: number }).soundStarts++;
        return start(...args);
      };
      return node;
    };
  });
  await page.goto("/");
  const count = () =>
    page.evaluate(
      () => (window as unknown as { soundStarts: number }).soundStarts,
    );
  expect(await count()).toBe(0);
  await page
    .getByRole("button", { name: "Enable dive sound", exact: true })
    .click();
  await page
    .getByRole("button", { name: "START DESCENT", exact: true })
    .click();
  const answer = page.getByRole("textbox", {
    name: "YOUR ANSWER",
    exact: true,
  });
  await expect(answer).toBeEnabled();
  let before: GameView = await (await page.request.get("/api/game")).json();
  let question = questions.find(
    (q) => q.prompt === before.attempt!.rounds.at(-1)!.prompt,
  )!;
  await answer.fill(question.groups[5].split("|")[0].split("~")[0]);
  await answer.press("Enter");
  const transition = page.locator(".dive-transition");
  await expect(transition).toHaveAttribute("data-points", "100");
  await expect(transition).toHaveAttribute("data-reward", "CORE SURGE");
  await expect(
    page.getByRole("button", { name: "CONTINUE DESCENT", exact: true }),
  ).toBeDisabled();
  await expect.poll(count).toBeGreaterThan(2);
  const sounded = await count();
  // Refocusing causes a GET refresh; an already-scored answer must not replay.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(transition).toHaveCount(0, { timeout: 5000 });
  expect(await count()).toBe(sounded);
  await page.reload();
  await expect(page.locator(".reveal-rarity")).toHaveText("CORE°");
  await expect(transition).toHaveCount(0);
  expect(await count()).toBe(0);
  await page
    .getByRole("button", { name: "Mute dive sound", exact: true })
    .click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Reduced motion" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("button", { name: "Daily Descent", exact: true })
    .click();
  await page
    .getByRole("button", { name: "CONTINUE DESCENT", exact: true })
    .click();
  await expect(answer).toBeEnabled();
  before = await (await page.request.get("/api/game")).json();
  question = questions.find(
    (q) => q.prompt === before.attempt!.rounds.at(-1)!.prompt,
  )!;
  await answer.fill(question.groups[0].split("|")[0].split("~")[0]);
  await answer.press("Enter");
  await expect(transition).toHaveAttribute("data-points", "10");
  await expect(transition).toHaveClass(/dive-calm/);
  await expect(transition).toHaveCount(0, { timeout: 2000 });
  expect(await count()).toBe(0);
  await page
    .getByRole("button", { name: "CONTINUE DESCENT", exact: true })
    .click();
  await expect(answer).toBeEnabled();
  await page.getByRole("button", { name: "Pass this round" }).click();
  await expect(page.locator(".reveal-rarity")).toHaveText("PASSED");
  await expect(transition).toHaveCount(0);
  expect(await count()).toBe(0);
  expect(errors).toEqual([]);
});

test("settings previews do not start a daily attempt and are unavailable during a timed round", async ({
  page,
}, info) => {
  await page.goto("/");
  const settings = async () => {
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
  };
  const daily = async () => {
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("button", { name: "Daily Descent", exact: true })
      .click();
  };
  await settings();
  await page
    .getByRole("button", { name: "Preview 100-point dive", exact: true })
    .click();
  const preview = page.locator('.dive-transition[data-preview="true"]');
  await expect(preview).toHaveAttribute("data-points", "100");
  await expect(preview).toHaveCount(0, { timeout: 5000 });
  const empty: GameView = await (await page.request.get("/api/game")).json();
  expect(empty.attempt).toBeNull();
  expect(empty.stats.completed).toBe(0);
  await daily();
  await page
    .getByRole("button", { name: "START DESCENT", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
  ).toBeEnabled();
  const active: GameView = await (await page.request.get("/api/game")).json();
  await settings();
  for (const points of [10, 15, 30, 60, 85, 100])
    await expect(
      page.getByRole("button", {
        name: `Preview ${points}-point dive`,
        exact: true,
      }),
    ).toBeDisabled();
  await expect(
    page.getByText("Finish your current round before previewing."),
  ).toBeVisible();
  const stillActive: GameView = await (
    await page.request.get("/api/game")
  ).json();
  expect(stillActive.attempt).toEqual(active.attempt);
});

test("the full journey passes distinct scenery and can be stopped without affecting daily play", async ({
  page,
}, info) => {
  await page.goto("/");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /PREVIEW FULL JOURNEY/ }).click();
  const transition = page.locator('.dive-transition[data-journey="true"]');
  await expect(transition).toBeVisible();
  await expect(page.locator(".dive-biome b")).toHaveText("Sunlit reef");
  if (info.project.name === "desktop") {
    const names = [
      "Twilight forest",
      "Luminous gardens",
      "The sunken city",
      "Hydrothermal fields",
      "Crystal chasm",
      "The core sanctuary",
    ];
    for (const name of names)
      await expect(page.locator(".dive-biome b")).toHaveText(name, {
        timeout: 6000,
      });
    await expect(transition).toHaveCount(0, { timeout: 6000 });
  } else {
    await page
      .getByRole("button", { name: "END PREVIEW", exact: true })
      .click();
    await expect(transition).toHaveCount(0);
  }
  const game: GameView = await (await page.request.get("/api/game")).json();
  expect(game.attempt).toBeNull();
  expect(game.stats.completed).toBe(0);
  await expect(
    page.getByRole("heading", { name: "Your atmosphere." }),
  ).toBeVisible();
});
