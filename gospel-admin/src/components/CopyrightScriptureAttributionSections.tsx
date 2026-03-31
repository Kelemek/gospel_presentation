'use client'

import { isAttributionVisibleForTranslation } from '@/lib/scripture-attribution-visibility'
import type { BibleTranslation } from '@/lib/bible-translations'

const CARD =
  'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-lg p-6'

const link =
  'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors'

type Props = {
  /** `null` = show every translation (e.g. while `/api/translations/enabled` is loading). */
  enabledTranslationCodes: readonly string[] | null
}

function show(code: BibleTranslation, enabled: readonly string[] | null) {
  return isAttributionVisibleForTranslation(code, enabled)
}

export function CopyrightScriptureAttributionSections({ enabledTranslationCodes }: Props) {
  return (
    <div className="space-y-6">
      {show('esv', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">English Standard Version (ESV)</h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations are from the <strong>ESV® Bible</strong> (The Holy Bible, English Standard
            Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All
            rights reserved. The ESV text may not be quoted in any publication made available to the public by a
            Creative Commons license. The ESV may not be translated into any other language.
          </p>
          <p className="text-slate-700 dark:text-slate-200 mt-4 leading-relaxed text-base md:text-lg">
            Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book
            of the ESV Bible.
          </p>
          <p className="text-slate-700 dark:text-slate-200 mt-4 leading-relaxed text-base md:text-lg">
            <strong className="text-slate-800 dark:text-slate-100">ESV API:</strong>{' '}
            <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className={link}>
              www.esv.org
            </a>
          </p>
        </div>
      )}

      {show('kjv', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">King James Version (KJV)</h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations from the King James Version (KJV) are in the public domain.
          </p>
        </div>
      )}

      {show('nasb', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            New American Standard Bible (NASB)
          </h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations taken from the <strong>New American Standard Bible®</strong> (NASB), Copyright ©
            1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by
            permission.{' '}
            <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className={link}>
              www.lockman.org
            </a>
          </p>
        </div>
      )}

      {show('lsb', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Legacy Standard Bible (LSB)</h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in
            partnership with Three Sixteen Publishing Inc.{' '}
            <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className={link}>
              LSBible.org
            </a>
          </p>
          <p className="text-slate-700 dark:text-slate-200 mt-4 leading-relaxed text-base md:text-lg">
            For Permission to Quote Information visit{' '}
            <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className={link}>
              www.LSBible.org
            </a>
          </p>
        </div>
      )}

      {show('niv', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            New International Version (NIV)
          </h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations taken from THE HOLY BIBLE, NEW INTERNATIONAL VERSION®, NIV® Copyright © 1973, 1978,
            1984, 2011 by Biblica, Inc.® Used by permission.{' '}
            <a href="https://www.biblica.com" target="_blank" rel="noopener noreferrer" className={link}>
              Biblica.com
            </a>
          </p>
          <p className="text-slate-700 dark:text-slate-200 mt-4 leading-relaxed text-base md:text-lg">
            <strong className="text-slate-800 dark:text-slate-100">API:</strong> Text may be retrieved via{' '}
            <a href="https://rest.api.bible" target="_blank" rel="noopener noreferrer" className={link}>
              API.Bible
            </a>{' '}
            under their terms; this application caches responses subject to provider guidance.
          </p>
        </div>
      )}

      {show('nlt', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            New Living Translation (NLT)
          </h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996,
            2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc.{' '}
            <a href="https://www.tyndale.com" target="_blank" rel="noopener noreferrer" className={link}>
              Tyndale.com
            </a>
          </p>
        </div>
      )}

      {show('csb', enabledTranslationCodes) && (
        <div className={CARD}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            Christian Standard Bible (CSB)
          </h3>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base md:text-lg">
            Scripture quotations taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible
            Publishers. Used by permission.{' '}
            <a href="https://csbible.com" target="_blank" rel="noopener noreferrer" className={link}>
              CSBible.com
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
