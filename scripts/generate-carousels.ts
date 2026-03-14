/**
 * Screenshot carousel slides to PNG using Puppeteer.
 * Requires: `npm run dev` running on port 3000.
 * Usage:  npm run generate-carousels
 *         npm run generate-carousels -- --carousel=repurposing-math
 */
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

// Import carousel data directly (tsx handles TS imports)
import { CAROUSELS } from "../src/data/carousels";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../output/carousels");

async function main() {
  // Optional filter: --carousel=id
  const filterArg = process.argv.find((a) => a.startsWith("--carousel="));
  const filterId = filterArg?.split("=")[1];

  const carousels = filterId
    ? CAROUSELS.filter((c) => c.id === filterId)
    : CAROUSELS;

  if (carousels.length === 0) {
    console.error(`No carousel found with id "${filterId}"`);
    process.exit(1);
  }

  console.log(
    `Generating ${carousels.reduce((n, c) => n + c.slides.length, 0)} slides from ${carousels.length} carousels...`,
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1400, deviceScaleFactor: 1 });

    for (const carousel of carousels) {
      const outDir = path.join(OUTPUT_DIR, carousel.id);
      await fs.mkdir(outDir, { recursive: true });

      const url = `${BASE_URL}/internal/carousels/${carousel.id}/slides`;
      console.log(`\n→ ${carousel.name} (${carousel.slides.length} slides)`);
      console.log(`  ${url}`);

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);
      // Small extra delay for rendering
      await new Promise((r) => setTimeout(r, 500));

      const slideElements = await page.$$("[data-slide-index]");
      console.log(`  Found ${slideElements.length} slide elements`);

      for (const el of slideElements) {
        const index = await el.evaluate((node) =>
          node.getAttribute("data-slide-index"),
        );
        const outPath = path.join(outDir, `slide-${index}.png`);

        await el.screenshot({
          path: outPath,
          type: "png",
        });
        console.log(`  ✓ slide-${index}.png`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone! Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
