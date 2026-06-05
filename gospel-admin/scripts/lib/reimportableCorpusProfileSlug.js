/**
 * Keep in sync with src/lib/backup/reimportableCorpusProfileSlug.ts and
 * supabase/functions backup-to-storage and restore-profile-from-backup index.ts
 * (inlined isReimportableCorpusProfileSlug — Dashboard deploy is index-only)
 */

const SPURGEON_SERMON = /^sg\d+$/i
const MORNEVE = /^me\d{4}$/i
const CALVIN = /^cv([a-z0-9]+)$/i
const HENRY = /^mh([a-z0-9]+)$/i
const EDWARDS = /^je\d+$/i
const LUTHER_GALATIANS = /^lgal$/i
const LUTHER_BONDAGE = /^ltbw$/i
const DEPRECATED_LUTHER = /^luthergal$/i
const PILGRIM = /^ppgr$/i
const ALL_OF_GRACE = /^aogr$/i
const REFORMED_PASTOR = /^bxrp$/i
const RYLE_HOLINESS = /^jryh$/i
const BERKHOF_ST = /^lbst$/i
const EDWARDS_BOOK = /^je(fow|rea|tog)$/i
const WATSON_BOOK = /^tw(cm|bt|bd|dc|lp|tc)$/i

function isReimportableCorpusProfileSlug(slug) {
  const s = String(slug).trim()
  return (
    SPURGEON_SERMON.test(s) ||
    MORNEVE.test(s) ||
    CALVIN.test(s) ||
    HENRY.test(s) ||
    EDWARDS.test(s) ||
    LUTHER_GALATIANS.test(s) ||
    LUTHER_BONDAGE.test(s) ||
    DEPRECATED_LUTHER.test(s) ||
    PILGRIM.test(s) ||
    ALL_OF_GRACE.test(s) ||
    REFORMED_PASTOR.test(s) ||
    RYLE_HOLINESS.test(s) ||
    BERKHOF_ST.test(s) ||
    EDWARDS_BOOK.test(s) ||
    WATSON_BOOK.test(s)
  )
}

module.exports = { isReimportableCorpusProfileSlug }
