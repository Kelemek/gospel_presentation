#!/usr/bin/env node
/** Built-in drive for features/static-copyright-page.md */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const evidenceDir =
  process.env.VERIFY_RUN_EVIDENCE ||
  path.join(process.cwd(), '.cursor/skills/verify-gospel-presentation/evidence/runs/local');

async function loadPlaywright() {
  const pw = await import('playwright');
  return pw.chromium;
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });

  const curlPath = path.join(evidenceDir, 'curl-copyright.txt');
  const res = await fetch(`${baseUrl}/copyright`, { redirect: 'follow' });
  const body = await res.text();
  await writeFile(
    curlPath,
    `HTTP ${res.status}\n${body.slice(0, 2000)}\n`,
    'utf8'
  );
  if (res.status !== 200) {
    console.error('FAIL copyright HTTP', res.status);
    process.exit(1);
  }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/copyright`, {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });
    const heading = page.getByRole('heading', { name: /copyright/i });
    await heading.first().waitFor({ timeout: 30_000 });
    const shot = path.join(evidenceDir, 'feature-static-copyright.png');
    await page.screenshot({ path: shot, fullPage: true });
    const ariaPath = path.join(evidenceDir, 'copyright-heading.txt');
    const text = await heading.first().innerText();
    await writeFile(ariaPath, text, 'utf8');
    console.log('PASS static-copyright-page', shot);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
