/**
 * Import Jonathan Edwards CCEL *Treatise on Grace* (`jetog`).
 */
import {
  CCEL_EDWARDS_TREATISE_ON_GRACE_XML_URL,
  parseCcelEdwardsTreatiseOnGraceXml,
} from '../src/lib/edwardsBooks/ccelEdwardsTreatiseOnGraceHtml'
import { EDWARDS_TREATISE_ON_GRACE_SLUG } from '../src/lib/edwardsBooks/edwardsBookSlugs'
import { runEdwardsBookCcelImport } from './lib/runEdwardsBookCcelImport'

runEdwardsBookCcelImport(process.argv.slice(2), {
  defaultUrl: CCEL_EDWARDS_TREATISE_ON_GRACE_XML_URL,
  envUrlKey: 'CCEL_EDWARDS_TREATISE_ON_GRACE_URL',
  slug: EDWARDS_TREATISE_ON_GRACE_SLUG,
  purgeFlag: '--purge-jetog',
  parse: parseCcelEdwardsTreatiseOnGraceXml,
  describeParsed: (parsed) => {
    const subs = parsed.gospelData[0]?.subsections ?? []
    console.log(
      `Parsed ${parsed.gospelData.length} section(s), ${subs.length} subsection(s), ${parsed.passageKeys.length} passage key(s).`
    )
    for (const sub of subs) {
      console.log(`  ${sub.title}`)
    }
  },
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
