/**
 * Keep in sync with src/lib/backup/reimportableCorpusProfileSlug.ts and
 * supabase/functions/*/index.ts (inlined isReimportableCorpusProfileSlug — Dashboard deploy is index-only)
 */

const SPURGEON_SERMON = /^sg\d+$/i
const MORNEVE = /^me\d{4}$/i
const CALVIN = /^cv([a-z0-9]+)$/i
const HENRY = /^mh([a-z0-9]+)$/i
const EDWARDS = /^je\d+$/i
const LUTHER_GALATIANS = /^lgal$/i
const DEPRECATED_LUTHER = /^luthergal$/i

function isReimportableCorpusProfileSlug(slug) {
  const s = String(slug).trim()
  return (
    SPURGEON_SERMON.test(s) ||
    MORNEVE.test(s) ||
    CALVIN.test(s) ||
    HENRY.test(s) ||
    EDWARDS.test(s) ||
    LUTHER_GALATIANS.test(s) ||
    DEPRECATED_LUTHER.test(s)
  )
}

module.exports = { isReimportableCorpusProfileSlug }
