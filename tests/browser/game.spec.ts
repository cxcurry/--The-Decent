import { test, expect } from "@playwright/test";
import { questions } from "../../lib/questions";
import { TIERS } from "../../lib/types";
import type { GameView } from "../../lib/types";
const origin = "http://127.0.0.1:3000";
test("complete seven-round expedition, persistence, authoritative scores, results and navigation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /THE DESCENT/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-landing.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "START DESCENT", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
  ).toBeDisabled();
  let expectedScore = 0;
  for (let index = 1; index <= 7; index++) {
    await expect(
      page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
    ).toBeEnabled();
    const before: GameView = await (await page.request.get("/api/game")).json();
    const round = before.attempt!.rounds.at(-1)!;
    expect(round.number).toBe(index);
    const question = questions.find((q) => q.prompt === round.prompt)!;
    const tier = index % 6;
    let group = question.groups[tier];
    if (!group) group = question.groups.at(-1)!;
    const [canonical, ...aliases] = group.split("|")[0].split("~");
    const points = TIERS[question.groups.indexOf(group)].points;
    if (index === 1) {
      await page
        .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
        .fill("Definitely not a real answer");
      await page
        .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
        .press("Enter");
      await expect(
        page.getByText(/That answer isn’t in our curated bank/),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
      ).toBeEnabled();
    }
    if (index === 2) {
      await page
        .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
        .fill(aliases[0] || canonical);
      await expect(
        page.getByText("Answer saved", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
      ).toHaveValue(aliases[0] || canonical);
      const after: GameView = await (
        await page.request.get("/api/game")
      ).json();
      expect(after.attempt!.rounds.at(-1)!.deadline).toBe(round.deadline);
    }
    await page
      .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
      .fill(aliases[0] || canonical);
    await page
      .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
      .press("Enter");
    await expect(
      page.getByRole("heading", { name: canonical, exact: true }),
    ).toBeVisible();
    expectedScore += points;
    const locked: GameView = await (await page.request.get("/api/game")).json();
    expect(locked.attempt!.score).toBe(expectedScore);
    const duplicates = await Promise.all(
      [1, 2].map(() =>
        page.request.post("/api/game", {
          headers: { origin },
          data: { action: "submit", round: index, text: canonical },
        }),
      ),
    );
    for (const response of duplicates) {
      expect(response.ok()).toBe(true);
      expect((await response.json()).attempt.score).toBe(expectedScore);
    }
    await expect(page.locator(".reveal-rarity")).toHaveText(
      TIERS.find((t) => t.points === points)!.name,
    );
    if (index === 1) {
      await expect(page.locator(".live-stats strong").first()).toHaveText(
        new RegExp(`^${expectedScore}\\s*/\\s*700$`),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/${info.project.name}-reveal.png`,
        fullPage: true,
      });
    }
    if (index < 7)
      await page
        .getByRole("button", { name: "CONTINUE DESCENT", exact: true })
        .click();
    else
      await page
        .getByRole("button", { name: "VIEW EXPEDITION RESULTS" })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "You went deeper." }),
  ).toBeVisible();
  await expect(page.locator(".breakdown-row")).toHaveCount(7);
  await expect(page.locator(".result-numbers")).toContainText(
    String(expectedScore),
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-results.png`,
    fullPage: true,
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "COPY RESULTS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "RESULTS COPIED" }),
  ).toBeVisible();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain(`${expectedScore}/700`);
  const finished: GameView = await (await page.request.get("/api/game")).json();
  expect(shared).toContain(`Daily #${finished.challenge}`);
  for (const r of finished.attempt!.rounds)
    expect(shared.split("\n")).not.toContain(r.answer!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You went deeper." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "START DESCENT", exact: true }),
  ).toHaveCount(0);
  const restart = await page.request.post("/api/game", {
    headers: { origin },
    data: { action: "start" },
  });
  expect((await restart.json()).attempt.score).toBe(expectedScore);
  await page.getByRole("button", { name: "MY EXPEDITION LOG" }).click();
  await expect(
    page.getByRole("heading", { name: "Depths explored." }),
  ).toBeVisible();
  await expect(page.locator(".history-list>button")).toHaveCount(1);
  await expect(page.locator(".history-list strong")).toContainText(
    String(expectedScore),
  );
  await page.locator(".history-list>button").click();
  await expect(page.locator(".breakdown-row")).toHaveCount(7);
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "How to Play", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Six levels of discovery." }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Reduced motion" }).click();
  await expect(
    page.getByRole("switch", { name: "Reduced motion" }),
  ).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});
test("timeout evaluates the saved text, pass awards zero, and HTTP protections hold", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Server deadline behavior is identical across viewport sizes.",
  );
  test.setTimeout(60000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "START DESCENT", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
  ).toBeEnabled();
  const state: GameView = await (await page.request.get("/api/game")).json();
  const question = questions.find(
    (q) => q.prompt === state.attempt!.rounds[0].prompt,
  )!;
  const canonical = question.groups[0].split("|")[0].split("~")[0];
  await page
    .getByRole("textbox", { name: "YOUR ANSWER", exact: true })
    .fill(canonical);
  await expect(page.getByText("Answer saved", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: canonical, exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".reveal-rarity")).toHaveText("SURFACE");
  await page
    .getByRole("button", { name: "CONTINUE DESCENT", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "YOUR ANSWER", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pass this round" }).click();
  await expect(page.locator(".reveal-rarity")).toHaveText("PASSED");
  const badOrigin = await page.request.post("/api/game", {
    headers: { origin: "https://evil.example" },
    data: { action: "start" },
  });
  expect(badOrigin.status()).toBe(403);
  const malformed = await page.request.post("/api/game", {
    headers: { origin },
    data: { action: "submit", round: 0, text: 42 },
  });
  expect(malformed.status()).toBe(400);
  const view: GameView = await (await page.request.get("/api/game")).json();
  expect(view.attempt!.score).toBe(10);
  expect(view.attempt!.rounds[1].points).toBe(0);
  expect(JSON.stringify(view)).not.toContain("aliases");
  expect(view.attempt!.rounds).toHaveLength(2);
  expect(
    (await page.context().cookies()).find((c) => c.name === "core_session")
      ?.httpOnly,
  ).toBe(true);
});

test("narrow phone, tablet and desktop layouts keep controls within the viewport", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Desktop browser can resize across all target widths.",
  );
  await page.goto("/");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "START DESCENT", exact: true }),
    ).toBeVisible();
    const fits = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    expect(fits.scroll, `${width}px layout`).toBeLessThanOrEqual(fits.width);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("the expedition scene animates and reduced motion produces a static scene", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "START DESCENT", exact: true }),
  ).toBeVisible();
  const scene = page.locator(".descent-scene");
  await expect(scene).toHaveCount(1);
  const viewport = page.viewportSize()!;
  await expect
    .poll(() => scene.boundingBox())
    .toEqual({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  // The world stays attached to the viewport even when the content scrolls.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await scene.boundingBox()).toEqual({
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  async function fingerprint() {
    return scene.evaluate((node) => {
      const c = node as HTMLCanvasElement;
      const pixels = c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height).data;
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 16)
        hash = Math.imul(hash ^ pixels[i], 16777619);
      return hash;
    });
  }
  const initial = await fingerprint();
  await expect.poll(fingerprint).not.toBe(initial);
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Reduced motion" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("button", { name: "Daily Descent", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveClass(/reduce-motion/);
  await expect(scene).toBeVisible();
  const still = await fingerprint();
  // This wait tests the promised absence of animation, rather than page readiness.
  await page.waitForTimeout(450);
  expect(await fingerprint()).toBe(still);
});

test("full screen can be entered and exited without restarting the expedition", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Phone fullscreen support varies by browser; the world fills its viewport without this API.",
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "START DESCENT", exact: true })
    .click();
  const answer = page.getByRole("textbox", {
    name: "YOUR ANSWER",
    exact: true,
  });
  await expect(answer).toBeEnabled();
  await answer.fill("draft survives");
  await expect(page.getByText("Answer saved", { exact: true })).toBeVisible();
  const before: GameView = await (await page.request.get("/api/game")).json();
  await page
    .getByRole("button", { name: "Enter full screen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await expect(answer).toHaveValue("draft survives");
  const after: GameView = await (await page.request.get("/api/game")).json();
  expect(after.attempt!.rounds.at(-1)!.deadline).toBe(
    before.attempt!.rounds.at(-1)!.deadline,
  );
  expect(after.attempt!.score).toBe(before.attempt!.score);
});
