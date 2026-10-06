#!/usr/bin/env node
// Takes screenshots of the core pages for every theme and viewport.
//
// Prerequisites: a running Pet Manager (BASE_URL, default http://localhost:3000)
// with demo data (`npm run db:seed`). On a fresh instance the script creates a
// throwaway admin account with a random password; otherwise pass
// SCREENSHOT_EMAIL / SCREENSHOT_PASSWORD.
//
//   node scripts/screenshots.mjs            -> docs/screenshots/<theme>/<viewport>-<page>.png
//   THEMES=playful PAGES=dashboard node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/screenshots');
const LANG = process.env.LANG_CODE || 'en';
const THEMES = (process.env.THEMES || 'neutral-light,neutral-dark,playful,meadow').split(',');
const TIMEZONE = process.env.SCREENSHOT_TZ || 'Europe/Berlin'; // should match the server's TZ
const VIEWPORTS = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
const ONLY_PAGES = process.env.PAGES?.split(',');

async function api(pathname, body, token) {
  const res = await fetch(`${BASE_URL}/api${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function getToken() {
  const status = await api('/auth/status');
  if (status.setupRequired) {
    const password = randomBytes(18).toString('base64url');
    const res = await api('/auth/register', {
      email: 'demo@example.com',
      password,
      display_name: 'Alex',
      locale: LANG,
    });
    return res.token;
  }
  const { SCREENSHOT_EMAIL: email, SCREENSHOT_PASSWORD: password } = process.env;
  if (!email || !password)
    throw new Error('Instance already set up: set SCREENSHOT_EMAIL and SCREENSHOT_PASSWORD');
  return (await api('/auth/login', { email, password })).token;
}

const token = await getToken();
const pets = await api('/pets', null, token);
const find = (name) => pets.find((p) => p.name === name) ?? pets[0];
const dog = find('Biscuit');
const cat = find('Mochi');
const illnesses = cat ? await api(`/pets/${cat.id}/illnesses`, null, token) : [];

const PAGES = [
  { name: 'login', path: '/login', loggedOut: true },
  { name: 'dashboard', path: '/' },
  { name: 'pets', path: '/pets' },
  { name: 'pet-overview', path: `/pets/${dog?.id}` },
  { name: 'pet-medications', path: `/pets/${dog?.id}/medications` },
  { name: 'pet-health', path: `/pets/${dog?.id}/health` },
  { name: 'illness', path: `/pets/${cat?.id}/illnesses/${illnesses[0]?.id}` },
  { name: 'settings', path: '/settings' },
  { name: 'admin', path: '/admin' },
].filter((p) => !ONLY_PAGES || ONLY_PAGES.includes(p.name));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let count = 0;
for (const theme of THEMES) {
  await mkdir(path.join(OUT, theme), { recursive: true });
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      ...viewport,
      locale: LANG === 'de' ? 'de-DE' : 'en-US',
      timezoneId: TIMEZONE,
      reducedMotion: 'reduce',
    });
    for (const page of PAGES) {
      const tab = await context.newPage();
      await tab.addInitScript(
        ({ theme, token, lang, loggedOut }) => {
          localStorage.setItem('pm.theme', theme);
          localStorage.setItem('pm.lang', lang);
          if (loggedOut) localStorage.removeItem('pm.token');
          else localStorage.setItem('pm.token', token);
        },
        { theme, token, lang: LANG, loggedOut: Boolean(page.loggedOut) },
      );
      await tab.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle' });
      await tab.waitForTimeout(400); // fonts & charts
      // Capture artifact fix: let the fixed, docked drawer grow with the page so
      // it spans the whole full-page screenshot (no effect on the real app).
      await tab.addStyleTag({
        content:
          'nav:has(> .MuiDrawer-docked){position:relative}.MuiDrawer-docked .MuiDrawer-paper{position:absolute;top:0;bottom:0;height:auto}',
      });
      await tab.screenshot({
        path: path.join(OUT, theme, `${vpName}-${page.name}.png`),
        fullPage: true,
      });
      await tab.close();
      count++;
    }
    await context.close();
  }
}
await browser.close();
console.log(`${count} screenshots written to ${path.relative(process.cwd(), OUT)}`);
