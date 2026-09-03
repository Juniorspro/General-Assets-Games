#!/usr/bin/env node
/**
 * Playwright runner for smoke_dist.py — an EVIDENCE COLLECTOR.
 *
 * Opens a built game, captures obvious runtime failures (console/page errors,
 * blank viewport), and gathers evidence for the agent's own visual review:
 * three screenshots (initial / settled / after synthetic input), pixel-diff
 * ratios between them, and a frame-rate estimate. It deliberately avoids game
 * semantics: only crashes and blank frames FAIL the run — motion, interaction
 * and fps numbers are reported for judgment, not gated.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? fallback : value;
}

function emit(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(exitCode);
}

const url = arg("--url");
const timeoutMs = Number(arg("--timeout-ms", "30000"));
const waitMs = Number(arg("--wait-ms", "1200"));
const shotsDir = arg("--shots-dir");
const probe = arg("--probe", "1") !== "0";

if (!url) {
  emit({ status: "error", errors: ["--url is required"] }, 2);
}

// Resolution: next-to-runner node_modules (baked image) or npx-injected paths
// resolve the ESM import; createRequire honors NODE_PATH as a last resort.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    const { createRequire } = await import("node:module");
    ({ chromium } = createRequire(import.meta.url)("playwright"));
  } catch (error) {
    emit(
      {
        status: "error",
        errors: [
          `Playwright is not available: ${error instanceof Error ? error.message : String(error)}`,
        ],
      },
      1,
    );
  }
}

let browser;
try {
  // Fake camera/mic so getUserMedia-based games don't error under headless
  // automation. --no-sandbox: the runtime pod blocks the unprivileged user
  // namespaces Chromium's sandbox needs (the pod is the isolation boundary).
  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 870 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
  const shotInitial = await page.screenshot({ fullPage: false });
  await page.waitForTimeout(waitMs);
  const shotSettled = await page.screenshot({ fullPage: false });

  const visibleTargets = await page.evaluate(() => {
    const selectors = ["canvas", "video", "img", "svg", "#root", "main", "body"];
    return selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          selector,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: Number(style.opacity || "1"),
          textLength: (element.textContent || "").trim().length,
        };
      }),
    );
  });

  // Frame-rate estimate: count requestAnimationFrame callbacks over ~1.2s.
  const fpsEstimate = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let count = 0;
        const start = performance.now();
        const tick = (now) => {
          count += 1;
          if (now - start >= 1200) resolve(Math.round((count * 1000) / (now - start)));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

  // Synthetic input probe — semantics-free: tap the center, hold a direction
  // key, press Space. Whether the pixels change is REPORTED, never gated (a
  // legitimate title screen may ignore arrow keys).
  let shotProbed = null;
  if (probe) {
    await page.mouse.click(215, 435);
    await page.waitForTimeout(250);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(250);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
    shotProbed = await page.screenshot({ fullPage: false });
  }

  // Sample two screenshots on a 16-level color grid: stats for the second +
  // the ratio of sampled points whose bucket differs (0 = identical frames).
  const diffStats = async (bufA, bufB) =>
    page.evaluate(
      async ([a, b]) => {
        const load = async (dataUrl) => {
          const image = new Image();
          image.src = dataUrl;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height);
        };
        const A = await load(a);
        const B = await load(b);
        const step = 8;
        const buckets = new Map();
        let sampled = 0;
        let differing = 0;
        const key = (d, off) =>
          `${Math.round(d[off] / 16)}:${Math.round(d[off + 1] / 16)}:${Math.round(d[off + 2] / 16)}:${Math.round(d[off + 3] / 16)}`;
        const width = Math.min(A.width, B.width);
        const height = Math.min(A.height, B.height);
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            const offA = (y * A.width + x) * 4;
            const offB = (y * B.width + x) * 4;
            const kb = key(B.data, offB);
            buckets.set(kb, (buckets.get(kb) || 0) + 1);
            if (key(A.data, offA) !== kb) differing += 1;
            sampled += 1;
          }
        }
        const counts = Array.from(buckets.values()).sort((m, n) => n - m);
        return {
          width: B.width,
          height: B.height,
          sampled_pixels: sampled,
          distinct_colors: buckets.size,
          dominant_ratio: sampled ? counts[0] / sampled : 1,
          diff_ratio: sampled ? differing / sampled : 0,
        };
      },
      [
        `data:image/png;base64,${bufA.toString("base64")}`,
        `data:image/png;base64,${bufB.toString("base64")}`,
      ],
    );

  const settled = await diffStats(shotInitial, shotSettled);
  const probed = shotProbed ? await diffStats(shotSettled, shotProbed) : null;

  const shots = { initial: null, settled: null, probed: null };
  if (shotsDir) {
    mkdirSync(shotsDir, { recursive: true });
    shots.initial = join(shotsDir, "initial.png");
    writeFileSync(shots.initial, shotInitial);
    shots.settled = join(shotsDir, "settled.png");
    writeFileSync(shots.settled, shotSettled);
    if (shotProbed) {
      shots.probed = join(shotsDir, "probed.png");
      writeFileSync(shots.probed, shotProbed);
    }
  }

  const hasVisibleDom = visibleTargets.some(
    (target) =>
      target.width > 2 &&
      target.height > 2 &&
      target.display !== "none" &&
      target.visibility !== "hidden" &&
      target.opacity > 0,
  );

  const errors = [];
  if (pageErrors.length > 0) {
    errors.push(`page errors: ${pageErrors.join("; ")}`);
  }
  if (consoleErrors.length > 0) {
    errors.push(`console errors: ${consoleErrors.join("; ")}`);
  }
  if (!hasVisibleDom) {
    errors.push("no visible DOM target found");
  }
  if (settled.distinct_colors < 2 || settled.dominant_ratio > 0.995) {
    errors.push("viewport appears blank or visually uniform");
  }

  emit(
    {
      status: errors.length ? "error" : "ok",
      errors,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      visible_targets: visibleTargets,
      width: settled.width,
      height: settled.height,
      sampled_pixels: settled.sampled_pixels,
      distinct_colors: settled.distinct_colors,
      dominant_ratio: settled.dominant_ratio,
      fps_estimate: fpsEstimate,
      motion_diff_ratio: settled.diff_ratio,
      interaction_diff_ratio: probed ? probed.diff_ratio : null,
      shots,
    },
    errors.length ? 1 : 0,
  );
} catch (error) {
  emit(
    {
      status: "error",
      errors: [error instanceof Error ? error.message : String(error)],
    },
    1,
  );
} finally {
  if (browser) {
    await browser.close();
  }
}
