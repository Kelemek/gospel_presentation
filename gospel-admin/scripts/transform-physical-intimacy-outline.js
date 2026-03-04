#!/usr/bin/env node
/**
 * Transform Physical Intimacy gospel_data to 3-level structure (sections > subsections > nested).
 * 1. Splits Introduction on <strong>Header:</strong> into subsections
 * 2. For subsections with <ol class="legal-style">, extracts top-level <li> items as nested subsections
 */
const fs = require('fs');
const path = require('path');

const exportPath = path.join(__dirname, '../data/physical-intimacy-export.json');
const outPath = path.join(__dirname, '../data/physical-intimacy-restructured.json');

/**
 * Strip the duplicate title from the start of content.
 * For <strong> items: removes <p><strong>Title</strong></p> or <p><strong>Title</strong> <br>...
 * For plain <p> items: removes <p>Title</p> when title was extracted from first paragraph.
 */
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
  // Plain <p>Title</p> - remove entire first paragraph
  const pMatch = liContent.match(/^<p>([^<]*)<\/p>/i);
  if (pMatch && pMatch[1].replace(/&nbsp;/g, ' ').trim() === title.trim()) {
    return liContent.replace(/^<p>[^<]*<\/p>/, '').trim() || liContent;
  }
  return liContent;
}

/**
 * Extract top-level <li> items from <ol class="legal-style"> block.
 * Uses depth tracking to handle nested lists.
 */
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
      // Only match <strong> at start of first <p> - avoid matching nested <strong> (e.g. "Warning:")
      const strongMatch = liContent.match(/^<p>\s*<strong>([^<]+)<\/strong>/i);
      let title;
      let content;
      if (strongMatch) {
        title = strongMatch[1].replace(/&nbsp;/g, ' ').trim();
        content = stripTitleFromContent(liContent, title, true);
      } else {
        // Use first <p>...</p> as title (first sentence/paragraph), not arbitrary 60 chars
        const firstPMatch = liContent.match(/^<p>([^<]*)<\/p>/i);
        title = firstPMatch
          ? firstPMatch[1].replace(/&nbsp;/g, ' ').trim() || liContent.replace(/<[^>]+>/g, '').slice(0, 80).trim()
          : liContent.replace(/<[^>]+>/g, '').slice(0, 80).trim() || 'Item';
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

function parseHtmlOutline(html) {
  if (!html || typeof html !== 'string') return [];

  const subsections = [];

  // [^<]* allows Conclusion to match (backtracks so "Conclusion" is captured, not "Conclusion: ")
  const headerPattern = /<strong>([^<]*(?:Regarding Sex|Conclusion)[^<]*):?\s*<\/strong>/gi;
  const parts = html.split(headerPattern);

  if (parts.length < 2) {
    return [{ title: 'Content', content: html, nestedSubsections: [], scriptureReferences: [], questions: [] }];
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

    // Conclusion keeps full content (incl. footnotes) at bottom - no nested extraction
    const isConclusion = header.toLowerCase().replace(/:$/, '').trim() === 'conclusion';
    const nestedItems = isConclusion ? [] : extractTopLevelListItems(content);
    // When we have nested subsections, clear parent content to avoid duplication (same as original, just split)
    const sub = {
      title: header.replace(/:$/, ''),
      content: nestedItems.length > 0 ? '' : content,
      scriptureReferences: [],
      nestedSubsections: nestedItems.length > 0
        ? nestedItems.map((n) => ({
            title: n.title,
            content: n.content,
            scriptureReferences: [],
            questions: [],
          }))
        : [],
      questions: [],
    };
    subsections.push(sub);
  }

  return subsections;
}

function transformGospelData(gospelData) {
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
      if (sub.title === 'Introduction:' || sub.title?.toLowerCase().startsWith('introduction')) {
        const parsed = parseHtmlOutline(sub.content || '');
        if (parsed.length > 1) {
          newSection.subsections.push(...parsed);
        } else {
          newSection.subsections.push({
            ...sub,
            title: sub.title.replace(/:$/, ''),
            nestedSubsections: sub.nestedSubsections || [],
          });
        }
      } else {
        newSection.subsections.push({
          ...sub,
          nestedSubsections: sub.nestedSubsections || [],
        });
      }
    }

    result.push(newSection);
  }

  return result;
}

function main() {
  if (!fs.existsSync(exportPath)) {
    console.error('Run scripts/export-physical-intimacy-profile.js first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const gospelData = data.gospel_data;

  const restructured = transformGospelData(gospelData);

  const output = {
    ...data,
    gospel_data: restructured,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log('Restructured data written to', outPath);
  restructured.forEach((s, i) => {
    const subCount = s.subsections?.length ?? 0;
    const nestedCount = s.subsections?.reduce((sum, sub) => sum + (sub.nestedSubsections?.length ?? 0), 0) ?? 0;
    console.log(`  Section ${i + 1}: ${s.title} (${subCount} subsections, ${nestedCount} nested)`);
  });
}

main();
