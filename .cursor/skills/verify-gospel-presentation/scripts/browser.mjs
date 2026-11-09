#!/usr/bin/env node
/**
 * Playwright helper for verify-gospel-presentation.
 * Invoked only via verify-gp browser.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const evidenceDir =
  process.env.VERIFY_RUN_EVIDENCE ||
  path.join(process.cwd(), '.cursor/skills/verify-gospel-presentation/evidence/runs/local');

async function loadPlaywright() {
  const pw = await import('playwright');
  return pw.chromium;
}

async function withBrowser(fn) {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await fn(page);
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--path') out.path = argv[++i];
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--role') out.role = argv[++i];
    else if (a === '--name-pattern') out.namePattern = argv[++i];
    else if (a === '--selector') out.selector = argv[++i];
    else if (a === '--first') {
      out.firstTour = argv[++i];
      out.firstAttr = argv[++i];
    } else if (a === '--contains-text') out.containsText = argv[++i];
    else if (a === '--role-assert') out.roleAssert = argv[++i];
    else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const sub = args._[0];

async function main() {
  await mkdir(evidenceDir, { recursive: true });

  if (sub === 'goto') {
    const p = args.path || '/';
    await withBrowser(async (page) => {
      const url = new URL(p, baseUrl).href;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      console.log('goto', url, 'title=', await page.title());
    });
    return;
  }

  if (sub === 'screenshot') {
    const name = args.name || 'screen.png';
    const out = path.join(evidenceDir, name);
    const p = args.path || '/copyright';
    await withBrowser(async (page) => {
      await page.goto(new URL(p, baseUrl).href, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      });
      await page.screenshot({ path: out, fullPage: true });
      console.log('screenshot', out);
    });
    return;
  }

  if (sub === 'click') {
    await withBrowser(async (page) => {
      const start = args.path ? new URL(args.path, baseUrl).href : baseUrl;
      await page.goto(start, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      if (args.selector) {
        await page.locator(args.selector).click();
      } else if (args.firstTour && args.firstAttr) {
        await page.locator(`[data-tour="${args.firstTour}"]`).first().click();
      } else if (args.role) {
        const pattern = args.namePattern || args.name;
        const locator = pattern
          ? page.getByRole(args.role, { name: new RegExp(pattern, 'i') })
          : page.getByRole(args.role);
        await locator.first().click();
      } else {
        throw new Error('click requires --role or --selector or --first data-tour');
      }
      await page.waitForTimeout(500);
      console.log('click ok');
    });
    return;
  }

  if (sub === 'assert') {
    await withBrowser(async (page) => {
      const start = args.path ? new URL(args.path, baseUrl).href : baseUrl;
      await page.goto(start, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      const role = args.roleAssert || args.role || 'dialog';
      const loc = page.getByRole(role);
      if (args.containsText) {
        await loc.filter({ hasText: args.containsText }).first().waitFor({ timeout: 30_000 });
      } else {
        await loc.first().waitFor({ timeout: 30_000 });
      }
      console.log('assert ok', role);
    });
    return;
  }

  console.error('Usage: verify-gp browser goto|screenshot|click|assert ...');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
