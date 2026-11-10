#!/usr/bin/env node
/** Built-in drive for features/kindle-default-read.md */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { baseUrl, evidenceDir, loadChromium } from './browserSession.mjs';

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const readPath = '/default/read/';

  const res = await fetch(new URL(readPath, baseUrl).href, { redirect: 'follow' });
  const body = await res.text();
  await writeFile(
    path.join(evidenceDir, 'curl-default-read.txt'),
    `HTTP ${res.status}\n${body.slice(0, 1500)}\n`,
    'utf8'
  );
  if (res.status !== 200) {
    console.error('FAIL kindle read HTTP', res.status);
    process.exit(1);
  }

  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 1200 } });
    await page.goto(new URL(readPath, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.locator('.kindle-read-root, article, main').first().waitFor({
      state: 'visible',
      timeout: 120_000,
    });
    const menuSummary = page.locator('summary').filter({ hasText: /Menu|Table of Contents/i }).first();
    const hasMenu = (await menuSummary.count()) > 0;
    if (!hasMenu) {
      console.warn('WARN kindle-default-read: no Menu/TOC summary (layout may differ)');
    }
    const shot = path.join(evidenceDir, 'feature-kindle-default-read.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('PASS kindle-default-read', shot, 'title=', await page.title());
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
