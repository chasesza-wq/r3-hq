import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';

const svg = readFileSync(new URL('./logo-mark.svg', import.meta.url), 'utf8');
const html = `<!doctype html><html><head><style>
  html,body{margin:0;padding:0;background:transparent}
  svg{display:block}
</style></head><body>${svg}</body></html>`;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();

for (const [size, file] of [[512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html.replace('width="64" height="64"', `width="${size}" height="${size}"`));
  await page.screenshot({ path: new URL(`./${file}`, import.meta.url).pathname, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
