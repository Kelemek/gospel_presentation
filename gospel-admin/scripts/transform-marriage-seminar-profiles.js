#!/usr/bin/env node
/**
 * Transform gospel profile gospel_data to 3-level structure for TOC.
 * - For subsections with ol class="legal-style": extracts top-level <li> as nested subsections
 * - Preserves footnotes (trailing <ol> without legal-style) by appending to last nested item
 * - Same logic as Physical Intimacy: strip duplicate titles, clear parent content when nested
 *
 * Usage: node scripts/transform-marriage-seminar-profiles.js [slug1 slug2 ...]
 * If no slugs given, fetches all profiles with "A Biblical Perspective" in the title.
 * Backups are in data/backups/. Rollback migrations in sql/migrations/.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const backupsDir = path.join(__dirname, '../data/backups');
const migrationsDir = path.join(__dirname, '../sql/migrations');

function stripTitleFromContent(liContent, title, fromStrong = true) {
  if (!title || !liContent) return liContent;
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (fromStrong) {
    let stripped = liContent.replace(
      new RegExp(`^<p>\\s*<strong>\\s*${escaped}\\s*</strong>\\s*</p>`, 'i'),
      ''
    );
    if (stripped === liContent) {
      stripped = liContent.replace(
        new RegExp(`^<p>\\s*<strong>\\s*${escaped}\\s*</strong>\\s*(?:<br\\s*/?>\\s*)?`, 'i'),
        '<p>'
      );
    }
    stripped = stripped.replace(/^<p>\s*<\/p>/, '').trim();
    return stripped || liContent;
  }
  const pMatch = liContent.match(/^<p>([^<]*)<\/p>/i);
  if (pMatch && pMatch[1].replace(/&nbsp;/g, ' ').trim() === title.trim()) {
    return liContent.replace(/^<p>[^<]*<\/p>/, '').trim() || liContent;
  }
  return liContent;
}

/** Derive a clean title when there is no <strong> - prefer first sentence, else word-boundary truncation. */
function deriveTitleFromPlainText(plainText) {
  if (!plainText || typeof plainText !== 'string') return 'Item';
  const stripped = plainText.replace(/&nbsp;/g, ' ').trim();
  if (!stripped) return 'Item';
  // Prefer first sentence (text up to ". " or ".\"") to avoid scripture refs and truncation in titles
  const firstSentence = stripped.match(/^[^.]+\.\s?/);
  if (firstSentence && firstSentence[0].trim().length >= 15) {
    return firstSentence[0].trim();
  }
  // Fallback: truncate at word boundary (last space before 80 chars)
  if (stripped.length <= 80) return stripped;
  const truncated = stripped.slice(0, 80);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim() || 'Item';
}

function extractTopLevelListItems(html) {
  const nested = [];
  const olStart = html.indexOf('class="legal-style"');
  if (olStart === -1 && html.indexOf("class='legal-style'") === -1) return nested;
  const tagStart = html.lastIndexOf('<ol', olStart);
  if (tagStart === -1) return nested;
  const innerStart = html.indexOf('>', tagStart) + 1;
  let depth = 1;
  let end = innerStart;
  for (let i = innerStart; i < html.length && depth > 0; i++) {
    if (html.slice(i).startsWith('<ol')) { depth++; i += 2; }
    else if (html.slice(i).startsWith('</ol>')) { depth--; if (depth === 0) { end = i; break; } i += 4; }
  }
  const inner = depth === 0 ? html.slice(innerStart, end) : '';
  let liDepth = 0;
  let start = -1;
  let inLi = false;
  let i = 0;

  while (i < inner.length) {
    const rest = inner.slice(i);
    if (rest.startsWith('<ol')) {
      liDepth++;
      i += 3;
    } else if (rest.startsWith('</ol>')) {
      liDepth--;
      if (liDepth < 0) break;
      i += 5;
    } else if (liDepth === 0 && rest.startsWith('<li>')) {
      inLi = true;
      start = i + 4;
      i += 4;
    } else if (liDepth === 0 && inLi && rest.startsWith('</li>')) {
      const liContent = inner.slice(start, i);
      const strongMatch = liContent.match(/^<p>\s*<strong>([^<]+)<\/strong>/i);
      let title;
      let content;
      if (strongMatch) {
        title = strongMatch[1].replace(/&nbsp;/g, ' ').trim();
        content = stripTitleFromContent(liContent, title, true);
      } else {
        const firstPMatch = liContent.match(/^<p>([^<]*)<\/p>/i);
        const plainText = liContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        title = firstPMatch && firstPMatch[1].replace(/&nbsp;/g, ' ').trim()
          ? firstPMatch[1].replace(/&nbsp;/g, ' ').trim()
          : deriveTitleFromPlainText(plainText);
        content = stripTitleFromContent(liContent, title, false);
      }
      nested.push({ title, content });
      inLi = false;
      i += 5;
    } else {
      i++;
    }
  }

  return nested;
}

/** Extract content after the first ol.legal-style closes (footnotes). */
function getTrailingAfterLegalStyleOl(html) {
  const olStart = html.indexOf('class="legal-style"');
  if (olStart === -1) return '';
  const tagStart = html.lastIndexOf('<ol', olStart);
  if (tagStart === -1) return '';
  const innerStart = html.indexOf('>', tagStart) + 1;
  let depth = 1;
  let end = innerStart;
  for (let i = innerStart; i < html.length && depth > 0; i++) {
    if (html.slice(i).startsWith('<ol')) { depth++; i += 2; }
    else if (html.slice(i).startsWith('</ol>')) { depth--; if (depth === 0) { end = i + 5; break; } i += 4; }
  }
  if (depth !== 0) return '';
  const trailing = html.slice(end).trim();
  return trailing;
}

function transformSubsectionWithNested(sub) {
  const content = sub.content || '';
  const nestedItems = extractTopLevelListItems(content);
  if (nestedItems.length === 0) return sub;

  const trailing = getTrailingAfterLegalStyleOl(content);
  // Keep footnotes/trailing in subsection content (not in a nested item) so they render at bottom, not in TOC
  const trailingContent = trailing || '';

  return {
    ...sub,
    content: trailingContent,
    scriptureReferences: sub.scriptureReferences || [],
    nestedSubsections: nestedItems.map((n) => ({
      title: n.title,
      content: n.content,
      scriptureReferences: [],
      questions: [],
    })),
    questions: sub.questions || [],
  };
}

function transformGospelDataSimple(gospelData) {
  if (!Array.isArray(gospelData)) return gospelData;
  const result = [];
  for (const section of gospelData) {
    const newSection = {
      ...section,
      subsections: (section.subsections || []).map((sub) => {
        const hasLegalStyle = (sub.content || '').includes('class="legal-style"') || (sub.content || '').includes("class='legal-style'");
        const hasQuestions = (sub.questions || []).length > 0;
        if (hasLegalStyle && !hasQuestions) {
          return transformSubsectionWithNested(sub);
        }
        return { ...sub, nestedSubsections: sub.nestedSubsections || [] };
      }),
    };
    result.push(newSection);
  }
  return result;
}

/**
 * Generic parse for single-subsection content with embedded <strong>Header:</strong>.
 * Splits only on main section headers: Introduction, Conclusion, Biblical X, Common Questions, etc.
 * Skips sub-headings like "Warning:", "Word of Caution:" (min 20 chars or match known patterns).
 */
function parseHtmlOutlineGeneric(html) {
  const subsections = [];
  const headerPattern = /<strong>([^<]*(?:Introduction|Conclusion|Biblical Principles|Biblical Directives|Common Questions|Biblical Perspective|Regarding [^<]+)[^<]*):\s*<\/strong>/gi;
  const parts = html.split(headerPattern);

  if (parts.length < 2) {
    return null;
  }

  const introContent = parts[0].trim();
  if (introContent) {
    subsections.push({
      title: 'Introduction',
      content: introContent,
      scriptureReferences: [],
      nestedSubsections: [],
      questions: [],
    });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim();
    let content = parts[i + 1]?.trim() || '';
    if (!header) continue;
    const key = header.toLowerCase().replace(/:$/, '').trim();
    const isConclusion = key === 'conclusion' || key === 'footnotes' || key.startsWith('conclusion');
    const nestedItems = isConclusion ? [] : extractTopLevelListItems(content);
    subsections.push({
      title: header.replace(/:$/, ''),
      content: nestedItems.length > 0 ? '' : content,
      scriptureReferences: [],
      nestedSubsections: nestedItems.length > 0
        ? nestedItems.map((n) => ({ title: n.title, content: n.content, scriptureReferences: [], questions: [] }))
        : [],
      questions: [],
    });
  }
  return subsections.length > 0 ? subsections : null;
}

function transformGospelDataWithOutline(gospelData) {
  if (!Array.isArray(gospelData)) return gospelData;
  const result = [];
  for (let i = 0; i < gospelData.length; i++) {
    const section = gospelData[i];
    const newSection = {
      section: String(section.section ?? i + 1),
      title: section.title,
      linkUrl: section.linkUrl,
      linkDescription: section.linkDescription,
      subsections: [],
    };
    for (const sub of section.subsections || []) {
      const content = sub.content || '';
      const hasOutlineHeaders = /<strong>[^<]{9,}?:\s*<\/strong>/i.test(content);
      const isIntro = !sub.title || sub.title === 'Introduction:' || (typeof sub.title === 'string' && sub.title.toLowerCase().startsWith('introduction')) || sub.title === '<p></p>';
      if ((isIntro || hasOutlineHeaders) && content.includes('<strong>')) {
        const parsed = parseHtmlOutlineGeneric(content);
        if (parsed && parsed.length > 1) {
          newSection.subsections.push(...parsed);
          continue;
        }
      }
      const normalizedSub = {
        ...sub,
        title: (sub.title || '').replace(/:$/, '').replace(/^<p><\/p>$/, 'Introduction'),
        nestedSubsections: sub.nestedSubsections || [],
      };
      newSection.subsections.push(transformSubsectionWithNested(normalizedSub));
    }
    result.push(newSection);
  }
  return result;
}

function needsOutlineTransform(gospelData) {
  const first = gospelData?.[0];
  const subs = first?.subsections || [];
  if (subs.length !== 1) return false;
  const content = subs[0]?.content || '';
  return content.includes('<strong>') && /<strong>[^<]{9,}?:\s*<\/strong>/i.test(content);
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
      .select('slug')
      .ilike('title', '%A Biblical Perspective%');
    slugs = (profiles || []).map((p) => p.slug);
    console.log('Found', slugs.length, 'profiles with "A Biblical Perspective":', slugs.join(', '));
  }

  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });

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

    const backupPath = path.join(backupsDir, `backup-${slug}-${dateStr}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(profile, null, 2));
    console.log('Backed up', profile.title, 'to', backupPath);

    const gospelData = profile.gospel_data;
    const needsOutline = needsOutlineTransform(gospelData);
    const transformed = needsOutline ? transformGospelDataWithOutline(gospelData) : transformGospelDataSimple(gospelData);

    const rollbackSql = `-- Rollback: ${profile.title} (${slug})
UPDATE public.profiles
SET gospel_data = '${JSON.stringify(gospelData).replace(/'/g, "''")}'::jsonb, updated_at = NOW()
WHERE slug = '${slug.replace(/'/g, "''")}';
`;

    const rollbackFile = path.join(migrationsDir, `${dateStr}_${slug.replace(/[^a-z0-9]/gi, '_')}_rollback.sql`);
    fs.writeFileSync(rollbackFile, rollbackSql);
    console.log('  Rollback migration:', rollbackFile);

    await supabase.from('profiles').update({
      gospel_data: transformed,
      updated_at: new Date().toISOString(),
    }).eq('slug', slug);

    const nestedCount = transformed.reduce((s, sec) =>
      s + (sec.subsections || []).reduce((t, sub) => t + (sub.nestedSubsections?.length || 0), 0), 0);
    console.log('  Transformed:', profile.title, `(${transformed[0]?.subsections?.length || 0} subsections, ${nestedCount} nested)`);
  }

  console.log('\nDone.');
}

main().catch(console.error);
