#!/usr/bin/env node
/**
 * Playwright helper for verify-gospel-presentation.
 * Invoked only via verify-gp browser.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { baseUrl, evidenceDir, loadChromium } from './browserSession.mjs';

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

async function withBrowser(fn, { path: gotoPath } = {}) {
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT });
    if (gotoPath != null) {
      await page.goto(new URL(gotoPath, baseUrl).href, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
    }
    await fn(page);
  } finally {
    await browser.close();
  }
}

function roleLocator(page, role, namePattern) {
  if (namePattern) {
    const isRegex = namePattern.startsWith('/') && namePattern.endsWith('/');
    const pattern = isRegex
      ? new RegExp(namePattern.slice(1, -1), 'i')
      : new RegExp(namePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return page.getByRole(role, { name: pattern });
  }
  return page.getByRole(role);
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
    else if (a === '--y') out.scrollY = Number(argv[++i]);
    else if (a === '--timeout') out.timeout = Number(argv[++i]);
    else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const sub = args._[0];
const waitTimeout = args.timeout || 60_000;

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
    await withBrowser(
      async (page) => {
        await page.goto(new URL(p, baseUrl).href, {
          waitUntil: 'networkidle',
          timeout: 120_000,
        });
        await page.screenshot({ path: out, fullPage: true });
        console.log('screenshot', out);
      },
      {}
    );
    return;
  }

  if (sub === 'wait-for') {
    const p = args.path || '/default/';
    await withBrowser(
      async (page) => {
        const pattern = args.namePattern || args.name;
        if (args.selector) {
          await page.locator(args.selector).first().waitFor({ state: 'visible', timeout: waitTimeout });
        } else if (args.role) {
          await roleLocator(page, args.role, pattern).first().waitFor({
            state: 'visible',
            timeout: waitTimeout,
          });
        } else {
          throw new Error('wait-for requires --role or --selector');
        }
        console.log('wait-for ok');
      },
      { path: p }
    );
    return;
  }

  if (sub === 'scroll') {
    const p = args.path || '/default/';
    const y = args.scrollY ?? 1200;
    await withBrowser(
      async (page) => {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(300);
        const pos = await page.evaluate(() => window.scrollY);
        console.log('scroll y=', pos);
      },
      { path: p }
    );
    return;
  }

  if (sub === 'click') {
    const p = args.path || '/default/';
    await withBrowser(
      async (page) => {
        if (args.selector) {
          await page.locator(args.selector).first().click({ timeout: waitTimeout });
        } else if (args.firstTour && args.firstAttr) {
          await page.locator(`[data-tour="${args.firstTour}"]`).first().click({ timeout: waitTimeout });
        } else if (args.role) {
          const pattern = args.namePattern || args.name;
          await roleLocator(page, args.role, pattern).first().click({ timeout: waitTimeout });
        } else {
          throw new Error('click requires --role or --selector or --first data-tour');
        }
        await page.waitForTimeout(500);
        console.log('click ok');
      },
      { path: p }
    );
    return;
  }

  if (sub === 'assert') {
    const p = args.path || '/default/';
    await withBrowser(
      async (page) => {
        const role = args.roleAssert || args.role || 'dialog';
        const pattern = args.namePattern || args.name;
        const loc = roleLocator(page, role, pattern);
        if (args.containsText) {
          await loc.filter({ hasText: args.containsText }).first().waitFor({
            state: 'visible',
            timeout: waitTimeout,
          });
        } else {
          await loc.first().waitFor({ state: 'visible', timeout: waitTimeout });
        }
        console.log('assert ok', role, pattern || '');
      },
      { path: p }
    );
    return;
  }

  console.error('Usage: verify-gp browser goto|screenshot|click|assert|wait-for|scroll ...');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
