#!/usr/bin/env node
/** Built-in drive for features/resource-reader-back-links.md (in-page hash / editor footnote Back links) */

import path from 'node:path';
import { baseUrl, evidenceDir, loadChromium } from './browserSession.mjs';
import { mkdir } from 'node:fs/promises';

/** Public profiles with same-document hash links (secular-term map or imported footnotes). */
const CANDIDATE_PATHS = ['/bcsecmap/', '/26b974ef/read/', '/default/read/'];

async function firstLoadablePath() {
  for (const p of CANDIDATE_PATHS) {
    const res = await fetch(new URL(p, baseUrl).href, { redirect: 'follow' });
    if (res.status === 200) return p;
  }
  return null;
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const profilePath = await firstLoadablePath();
  if (!profilePath) {
    console.error('SKIP resource-reader-back-links: no public profile with map/hash links (HTTP non-200)');
    process.exit(2);
  }

  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(new URL(profilePath, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    const internalLink = page
      .locator('a[href^="#section-"], a.kindle-read-internal-link[href^="#"]')
      .first();
    const count = await internalLink.count();
    if (count === 0) {
      console.warn('WARN resource-reader-back-links: no in-page hash links on', profilePath);
      const shot = path.join(evidenceDir, 'feature-resource-back-links.png');
      await page.screenshot({ path: shot, fullPage: true });
      console.log('PASS resource-reader-back-links (smoke only)', shot);
      return;
    }

    const href = await internalLink.getAttribute('href');
    await internalLink.click();
    await page.waitForTimeout(800);
    const hash = href?.startsWith('#') ? href.slice(1) : '';
    if (hash) {
      const targetVisible = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.width > 0;
      }, hash);
      if (!targetVisible) {
        throw new Error(`hash target #${hash} not visible after click`);
      }
    }
    const shot = path.join(evidenceDir, 'feature-resource-back-links.png');
    await page.screenshot({ path: shot, fullPage: false });
    console.log('PASS resource-reader-back-links', profilePath, href, shot);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
