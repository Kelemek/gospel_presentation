#!/usr/bin/env node
/** Built-in drive for features/slide-out-toc-menu.md */

import path from 'node:path';
import { baseUrl, evidenceDir, withProfilePage, openSlideoutMenu } from './browserSession.mjs';

async function main() {
  await withProfilePage(async (page) => {
    await openSlideoutMenu(page);
    const tocToggle = page.locator('[data-tour="toc-section-toggle"]').first();
    await tocToggle.click();
    await page
      .locator('[data-tour="toc-print-version"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
    const shot = path.join(evidenceDir, 'feature-slide-out-toc.png');
    await page.screenshot({ path: shot, fullPage: false });
    console.log('PASS slide-out-toc-menu', shot);
  }, { gotoPath: '/default/' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
