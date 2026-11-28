// Accessibility smoke test: `npm run build && npx next start -p 3100`, then `node scripts/a11y-check.cjs`.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

(async () => {

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PAGES = ["/", "/shop", "/shop/FF-LV7DRS", "/shop/FF-VLVKMN", "/about", "/visit", "/contact",
  "/admin", "/admin/items", "/admin/items/new", "/admin/sell-by-photo", "/admin/activity", "/admin/labels", "/admin/square"];

const browser = await chromium.launch();
let failed = 0;
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const problems = violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
    if (sw > width) problems.push(`horizontal scroll: ${sw}px`);
    if (problems.length) { failed++; console.log(`✗ ${width}px ${path}\n  ${problems.join("\n  ")}`); }
    else console.log(`✓ ${width}px ${path}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
})();
