import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/branding/instagram-profile.svg');
const pngPath = resolve(__dirname, '../public/branding/instagram-profile.png');

const svgContent = readFileSync(svgPath, 'utf-8');

const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:transparent;">
${svgContent}
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: pngPath, type: 'png', omitBackground: true });
await browser.close();

console.log(`Instagram profile logo saved to: ${pngPath}`);
