#!/usr/bin/env node
/**
 * Fix truncated/bad nested subsection titles in Marriage (and similar) profiles.
 * Derives clean titles from content (first sentence) when current title looks wrong.
 *
 * Usage: node scripts/fix-marriage-nested-titles.js [slug1 slug2 ...]
 * Default: marriagechapter1
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SCRIPTURE_PATTERN = /(?:Genesis|Exodus|Matthew|Romans|Ephesians|1 Corinthians|2 Corinthians|Proverbs|Leviticus|Hebrews|Psalms?|Malachi|1 Timothy)\s+\d+(?::\d+)?/i;

function decodeHtmlEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function deriveTitleFromContent(content) {
  if (!content || typeof content !== 'string') return null;
  let plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  plain = decodeHtmlEntities(plain);
  if (!plain) return null;
  // Prefer text before first scripture ref - avoids scripture refs in titles
  const beforeScripture = plain.match(/^(.+?)\s+(?:Genesis|Exodus|Matthew|Romans|Ephesians|1 Corinthians|2 Corinthians|Proverbs|Leviticus|Hebrews|Psalms?|Malachi|1 Timothy)\s+\d+(?::\d+)?/i);
  if (beforeScripture) {
    const candidate = decodeHtmlEntities(beforeScripture[1].trim());
    if (candidate.length >= 15 && candidate.length <= 120) return candidate;
  }
  // Skip leading "I." or "II." roman numerals, then take first sentence
  const afterRoman = plain.replace(/^[IVX]+\.\s*/i, '').trim() || plain;
  const firstSentence = (afterRoman.match(/^[^.]+\.\s?/) || [])[0]?.trim();
  if (firstSentence && !SCRIPTURE_PATTERN.test(firstSentence) && firstSentence.length >= 15) {
    const out = firstSentence.length <= 120 ? firstSentence : firstSentence.slice(0, 120).replace(/\s+\S*$/, '');
    if (out.length >= 15) return out;
  }
  return null;
}

function titleLooksBad(title) {
  if (!title || title.length < 10) return false;
  // Truncated: ends with space + 1-2 letter fragment (e.g. "the m", "wi")
  if (title.length > 50 && /\s[a-z]{1,2}$/.test(title)) return true;
  // Truncated: long title ends with common phrase starters (e.g. "office with", "that the w")
  if (title.length > 65 && /\s(with|in|to|and|for|the|a|an)\s*$/.test(title)) return true;
  // Has scripture ref in title
  if (SCRIPTURE_PATTERN.test(title)) return true;
  // Ends with ellipsis/truncation pattern
  if (/\.\s*\.\s*\.?\s*$/.test(title) && title.length > 50) return true;
  // Contains HTML entities (e.g. &amp;)
  if (/&amp;|&nbsp;|&quot;|&#\d+;/.test(title)) return true;
  return false;
}

function fixNestedTitles(gospelData) {
  if (!Array.isArray(gospelData)) return gospelData;
  let fixedCount = 0;
  const result = gospelData.map((section) => {
    const subsections = (section.subsections || []).map((sub) => {
      const nested = (sub.nestedSubsections || []).map((n) => {
        if (!titleLooksBad(n.title)) return n;
        if (n.content) {
          const better = deriveTitleFromContent(n.content);
          if (better) {
            fixedCount++;
            return { ...n, title: better };
          }
        }
        // Fallback: if only issue is HTML entities, decode the title
        if (/&amp;|&nbsp;|&quot;|&#\d+;/.test(n.title)) {
          const decoded = decodeHtmlEntities(n.title);
          if (decoded !== n.title) {
            fixedCount++;
            return { ...n, title: decoded };
          }
        }
        return n;
      });
      return { ...sub, nestedSubsections: nested };
    });
    return { ...section, subsections };
  });
  return { data: result, fixedCount };
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ['marriagechapter1'];

  for (const slug of slugs) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !profile) {
      console.error('Profile not found:', slug, error?.message || '');
      continue;
    }

    const { data: newData, fixedCount } = fixNestedTitles(profile.gospel_data);
    if (fixedCount === 0) {
      console.log(profile.title, '- no titles needed fixing');
      continue;
    }

    await supabase
      .from('profiles')
      .update({
        gospel_data: newData,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    console.log(profile.title, '- fixed', fixedCount, 'nested title(s)');
  }
  console.log('Done.');
}

main().catch(console.error);
