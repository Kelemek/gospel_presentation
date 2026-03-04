#!/usr/bin/env node
/**
 * Extract footnote/citation blocks from nested subsection content into
 * dedicated nested subsections titled "References".
 *
 * Footnote pattern: trailing <ol> with flat <li><p>Citation.</p></li> items
 * (no nested <ol>), typically author/title/page format.
 *
 * Usage: node scripts/extract-footnotes-to-sections.js [slug1 slug2 ...]
 * If no slugs given, processes all "A Biblical Perspective" profiles.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const backupsDir = path.join(__dirname, '../data/backups');

/** Check if an <ol> block looks like footnotes (flat citation list, not legal outline). */
function looksLikeFootnoteOl(olHtml) {
  if (!olHtml || olHtml.length < 20) return false;
  // Citation ol typically has NO nested <ol> inside it
  if (/<ol[^>]*>[\s\S]*<ol/i.test(olHtml)) return false;
  // Has li with p - flat structure
  const liMatches = olHtml.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
  if (!liMatches || liMatches.length < 2) return false;
  // Citation items often end with page numbers like ", 123." or ", 23-24."
  const citationLike = liMatches.filter(
    (li) => /,\s*\d+[\d-]*\.?\s*<\/p>/.test(li) || /\(\d{4}\)[\s\S]*\.\s*<\/p>/.test(li)
  );
  return citationLike.length >= Math.min(2, liMatches.length);
}

/** Find and extract the last top-level <ol>...</ol> that looks like footnotes. */
function extractFootnoteBlock(html) {
  if (!html || typeof html !== 'string') return { main: html, footnotes: null };
  let lastFootnoteBlock = null;
  let lastFootnoteStart = -1;
  let lastFootnoteEnd = -1;
  let depth = 0;
  let olStart = -1;
  let i = 0;

  while (i < html.length) {
    const rest = html.slice(i);
    if (rest.startsWith('<ol')) {
      if (depth === 0) olStart = i;
      depth++;
      i += 3;
    } else if (rest.startsWith('</ol>')) {
      depth--;
      if (depth === 0 && olStart >= 0) {
        const olEnd = i + 5;
        const olBlock = html.slice(olStart, olEnd);
        if (looksLikeFootnoteOl(olBlock)) {
          lastFootnoteBlock = olBlock;
          lastFootnoteStart = olStart;
          lastFootnoteEnd = olEnd;
        }
      }
      olStart = -1;
      i += 5;
    } else {
      i++;
    }
  }

  if (!lastFootnoteBlock || lastFootnoteStart < 0) return { main: html, footnotes: null };

  let before = html.slice(0, lastFootnoteStart).trim().replace(/<p>\s*<\/p>\s*$/, '');
  const after = html.slice(lastFootnoteEnd).trim();
  const main = (before + (after ? '\n' + after : '')).trim();
  return { main, footnotes: lastFootnoteBlock };
}

function processNestedContent(nested) {
  const { main, footnotes } = extractFootnoteBlock(nested.content || '');
  if (!footnotes) return { nested: { ...nested }, footnoteBlock: null };
  return {
    nested: { ...nested, content: main || '' },
    footnoteBlock: footnotes,
  };
}

function processSubsection(sub) {
  const nestedSubsections = sub.nestedSubsections || [];
  const newNested = [];
  let footnoteSubsection = null;

  for (let i = 0; i < nestedSubsections.length; i++) {
    const { nested, footnoteBlock } = processNestedContent(nestedSubsections[i]);
    const hasContent = nested.content && nested.content.replace(/<[^>]+>/g, '').replace(/\s/g, '').length > 0;
    if (hasContent || nested.title) {
      newNested.push(nested);
    }
    if (footnoteBlock) {
      footnoteSubsection = {
        title: 'References',
        content: footnoteBlock,
        scriptureReferences: [],
        questions: [],
      };
    }
  }

  if (footnoteSubsection) {
    newNested.push(footnoteSubsection);
  }

  return { ...sub, nestedSubsections: newNested };
}

function processGospelData(gospelData) {
  if (!Array.isArray(gospelData)) return gospelData;
  return gospelData.map((section) => ({
    ...section,
    subsections: (section.subsections || []).map(processSubsection),
  }));
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('slug, title')
      .ilike('title', '%A Biblical Perspective%');
    slugs = (profiles || []).map((p) => p.slug);
    console.log('Found', slugs.length, 'profiles:', slugs.join(', '));
  }

  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

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

    const before = JSON.stringify(profile.gospel_data);
    const transformed = processGospelData(profile.gospel_data);
    const after = JSON.stringify(transformed);

    if (before === after) {
      console.log(profile.title, '- no footnotes to extract');
      continue;
    }

    const backupPath = path.join(backupsDir, `backup-${slug}-${dateStr}-before-footnotes.json`);
    fs.writeFileSync(backupPath, JSON.stringify(profile, null, 2));
    console.log('Backed up to', backupPath);

    await supabase
      .from('profiles')
      .update({
        gospel_data: transformed,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    console.log(profile.title, '- extracted footnotes into References sections');
  }
  console.log('\nDone.');
}

main().catch(console.error);
