#!/usr/bin/env node
/** Built-in drive for features/resource-scroll-to-top.md */

import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  baseUrl,
  evidenceDir,
  loadChromium,
  waitForInteractiveProfileReady,
  newProfileBrowserPage,
  dismissBlockingOverlays,
} from './browserSession.mjs';

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newProfileBrowserPage(browser);
    await page.goto(new URL('/aogr/', baseUrl).href, {
      waitUntil: 'networkidle',
      timeout: 180_000,
    });
    await waitForInteractiveProfileReady(page);
    await dismissBlockingOverlays(page);
    const scrollTarget = await page.evaluate(() =>
      Math.max(2000, window.innerHeight * 1.25, document.documentElement.scrollHeight * 0.4)
    );
    await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
    await page.waitForTimeout(600);
    const backToTop = page.locator('[data-resource-reader-scroll-top]');
    await backToTop.waitFor({ state: 'visible', timeout: 45_000 });
    const beforeShot = path.join(evidenceDir, 'resource-scroll-to-top-visible.png');
    await page.screenshot({ path: beforeShot });
    await backToTop.click();
    await page.waitForFunction(() => window.scrollY < 80, undefined, { timeout: 15_000 });
    const scrollY = await page.evaluate(() => window.scrollY);
    const afterShot = path.join(evidenceDir, 'feature-resource-scroll-to-top.png');
    await page.screenshot({ path: afterShot });
    console.log('PASS resource-scroll-to-top', afterShot, 'scrollY=', scrollY);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
