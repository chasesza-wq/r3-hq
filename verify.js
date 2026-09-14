const puppeteer = require("/Users/chaseszarek/claude/agency/demos/fable-5/node_modules/puppeteer-core");

const URL = "file:///Users/chaseszarek/claude/agency/website/index.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"]
  });
  const errors = [];

  async function cap(name, vp, sel, act) {
    const page = await browser.newPage();
    page.on("pageerror", e => errors.push(`[${name}] pageerror: ${e.message}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`[${name}] console: ${m.text()}`); });
    await page.setViewport(vp);
    await page.goto(URL, { waitUntil: "load", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    if (act) { await page.evaluate(act); await new Promise(r => setTimeout(r, 500)); }
    if (sel) { await page.evaluate(s => document.querySelector(s).scrollIntoView(), sel); await new Promise(r => setTimeout(r, 1200)); }
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ow > 0) errors.push(`[${name}] overflow ${ow}px`);
    await page.screenshot({ path: `/tmp/ppt/${name}.png` });
    await page.close();
    console.log(`captured ${name} (overflow ${ow}px)`);
  }

  const d = { width: 1440, height: 900 };
  const m = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const n = { width: 320, height: 700, isMobile: true, hasTouch: true };
  const t = { width: 768, height: 1024, isMobile: true, hasTouch: true };

  await cap("web_d_hero", d, null, null);
  await cap("web_d_pricing", d, "#services", null);
  await cap("web_d_pricing_rest", d, "#services", "setNiche('rest')");
  await cap("web_d_portal", d, "#portal", null);
  await cap("web_d_work", d, "#work", null);
  await cap("web_d_dark_hero", d, null, "toggleTheme()");
  await cap("web_m_hero", m, null, null);
  await cap("web_m_pricing", m, "#services", null);
  await cap("web_m_portal", m, "#portal", null);
  await cap("web_m_book", m, "#book", null);
  await cap("web_320_hero", n, null, null);
  await cap("web_320_pricing", n, "#services", null);
  await cap("web_768_portal", t, "#portal", null);

  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
  await browser.close();
})();
