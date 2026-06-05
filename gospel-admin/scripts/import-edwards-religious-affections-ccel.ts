/**
 * Import Jonathan Edwards CCEL *Religious Affections* (`jerea`).
 */
import {
  CCEL_EDWARDS_RELIGIOUS_AFFECTIONS_XML_URL,
  parseCcelEdwardsReligiousAffectionsXml,
} from '../src/lib/edwardsBooks/ccelEdwardsReligiousAffectionsHtml'
import { EDWARDS_RELIGIOUS_AFFECTIONS_SLUG } from '../src/lib/edwardsBooks/edwardsBookSlugs'
import { runEdwardsBookCcelImport } from './lib/runEdwardsBookCcelImport'

runEdwardsBookCcelImport(process.argv.slice(2), {
  defaultUrl: CCEL_EDWARDS_RELIGIOUS_AFFECTIONS_XML_URL,
  envUrlKey: 'CCEL_EDWARDS_RELIGIOUS_AFFECTIONS_URL',
  slug: EDWARDS_RELIGIOUS_AFFECTIONS_SLUG,
  purgeFlag: '--purge-jerea',
  parse: parseCcelEdwardsReligiousAffectionsXml,
  describeParsed: (parsed) => {
    const subsectionCount = parsed.gospelData.reduce(
      (n, sec) => n + (sec.subsections?.length ?? 0),
      0
    )
    console.log(
      `Parsed ${parsed.gospelData.length} section(s), ${subsectionCount} subsection(s), ${parsed.passageKeys.length} passage key(s).`
    )
    for (const sec of parsed.gospelData) {
      console.log(`  [${sec.section}] ${sec.title} (${sec.subsections.length} subsections)`)
    }
  },
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
