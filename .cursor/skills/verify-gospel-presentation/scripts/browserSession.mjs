/**
 * Shared Playwright session helpers for verify-gospel-presentation recipes.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
export const evidenceDir =
  process.env.VERIFY_RUN_EVIDENCE ||
  path.join(process.cwd(), '.cursor/skills/verify-gospel-presentation/evidence/runs/local');

export async function loadChromium() {
  const pw = await import('playwright');
  return pw.chromium;
}

const WELCOME_DISMISS_KEY = 'gospel-presentation-first-visit-welcome-v1';

export async function newProfileBrowserPage(browser, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((welcomeKey) => {
    try {
      localStorage.setItem(welcomeKey, '1');
      localStorage.setItem('gospel-capacitor-deploy-changelog-seen-count', '999');
      localStorage.setItem('gospel-capacitor-deploy-ack-version', '999999');
    } catch {
      /* ignore */
    }
  }, WELCOME_DISMISS_KEY);
  return context.newPage();
}

export async function dismissPresentationWelcomeIfPresent(page) {
  const root = page.locator('.presentation-first-visit-welcome-root');
  if ((await root.count()) === 0) return;
  const close = page.getByRole('button', { name: /^Close$/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await root.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  }
}

/** Close stacked alert / What's new dialogs that block menu clicks. */
export async function dismissBlockingOverlays(page) {
  await dismissPresentationWelcomeIfPresent(page);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    if ((await dialog.count()) === 0) break;
    const action = dialog
      .getByRole('button', { name: /^(OK|Close|Got it|Dismiss|Not now)$/i })
      .first();
    if (await action.isVisible().catch(() => false)) {
      await action.click();
      await page.waitForTimeout(400);
    } else {
      break;
    }
  }
}

/** Wait until the interactive profile chrome is ready (not the Loading… shell). */
export async function waitForInteractiveProfileReady(page, { timeout = 180_000 } = {}) {
  await page
    .locator('[data-tour="profile-menu-button"]')
    .first()
    .waitFor({ state: 'visible', timeout });
}

export async function withProfilePage(fn, { gotoPath = '/default/', viewport = { width: 1280, height: 720 } } = {}) {
  await mkdir(evidenceDir, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await newProfileBrowserPage(browser, viewport);
    const url = new URL(gotoPath, baseUrl).href;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 });
    await waitForInteractiveProfileReady(page);
    await dismissBlockingOverlays(page);
    await fn(page, url);
  } finally {
    await browser.close();
  }
}

export async function openSlideoutMenu(page) {
  const menuBtn = page.locator('[data-tour="profile-menu-button"]').first();
  await menuBtn.waitFor({ state: 'visible', timeout: 60_000 });
  const expanded = await menuBtn.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await menuBtn.click();
  }
  await page.getByRole('button', { name: /^Table of Contents$/i }).first().waitFor({
    state: 'visible',
    timeout: 60_000,
  });
}
