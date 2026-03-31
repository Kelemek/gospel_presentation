/**
 * Shared scripture copyright blurbs for presentation footers (dark bar).
 * Wording aligned with ScriptureModal attributions.
 */
import { isAttributionVisibleForTranslation } from '@/lib/scripture-attribution-visibility'
import type { BibleTranslation } from '@/lib/bible-translations'

export function ScriptureFooterAttributionParagraphs({
  anchorClassName,
  /** `null` = show every translation (e.g. while enabled list is loading). */
  enabledTranslationCodes = null,
}: {
  anchorClassName: string
  enabledTranslationCodes?: readonly string[] | null
}) {
  const a = anchorClassName
  const vis = (code: BibleTranslation) => isAttributionVisibleForTranslation(code, enabledTranslationCodes)

  return (
    <>
      {vis('esv') && (
        <p>
          Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by
          Crossway, a publishing ministry of Good News Publishers. Used by permission.{' '}
          <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className={a}>
            www.esv.org
          </a>
        </p>
      )}
      {vis('kjv') && <p>King James Version (KJV) scripture quotations are in the public domain.</p>}
      {vis('nasb') && (
        <p>
          New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977,
          1995 by The Lockman Foundation. Used by permission.{' '}
          <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className={a}>
            www.lockman.org
          </a>
        </p>
      )}
      {vis('lsb') && (
        <p>
          Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in
          partnership with Three Sixteen Publishing Inc.{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className={a}>
            LSBible.org
          </a>
          . For Permission to Quote Information visit{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className={a}>
            www.LSBible.org
          </a>
          .
        </p>
      )}
      {vis('niv') && (
        <p>
          Scripture quotations taken from THE HOLY BIBLE, NEW INTERNATIONAL VERSION®, NIV® Copyright © 1973, 1978,
          1984, 2011 by Biblica, Inc.® Used by permission.{' '}
          <a href="https://www.biblica.com" target="_blank" rel="noopener noreferrer" className={a}>
            Biblica.com
          </a>
        </p>
      )}
      {vis('nlt') && (
        <p>
          Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996,
          2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc.{' '}
          <a href="https://www.tyndale.com" target="_blank" rel="noopener noreferrer" className={a}>
            Tyndale.com
          </a>
        </p>
      )}
      {vis('csb') && (
        <p>
          Scripture quotations taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible
          Publishers. Used by permission.{' '}
          <a href="https://csbible.com" target="_blank" rel="noopener noreferrer" className={a}>
            CSBible.com
          </a>
        </p>
      )}
    </>
  )
}
