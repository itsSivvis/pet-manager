#!/usr/bin/env node
// Renders the PWA PNG icons from client/public/favicon.svg using Chromium.
// Run once after changing the logo: node scripts/generate-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/public');
const svg = readFileSync(path.join(pub, 'favicon.svg'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

async function render(file, size, { maskable = false, padding = 0 } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - padding * 2;
  // Maskable icons need a full-bleed background and the logo inside the safe zone.
  const markup = maskable ? svg.replace('rx="16"', 'rx="0"') : svg;
  await page.setContent(
    `<html><body style="margin:0;background:${maskable ? '#2F55C4' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">
       <div style="width:${inner}px;height:${inner}px">${markup.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
     </body></html>`,
  );
  await page.screenshot({ path: path.join(pub, file), omitBackground: !maskable });
}

await render('pwa-192.png', 192);
await render('pwa-512.png', 512);
await render('apple-touch-icon.png', 180);
await render('pwa-maskable-512.png', 512, { maskable: true, padding: 72 });
await browser.close();
console.log('icons written to client/public');
