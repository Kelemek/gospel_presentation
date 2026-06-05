/**
 * Import Jonathan Edwards CCEL *Freedom of the Will* (`jefow`).
 */
import {
  CCEL_EDWARDS_FREEDOM_OF_WILL_XML_URL,
  parseCcelEdwardsFreedomOfWillXml,
} from '../src/lib/edwardsBooks/ccelEdwardsFreedomOfWillHtml'
import { EDWARDS_FREEDOM_OF_WILL_SLUG } from '../src/lib/edwardsBooks/edwardsBookSlugs'
import { runEdwardsBookCcelImport } from './lib/runEdwardsBookCcelImport'

runEdwardsBookCcelImport(process.argv.slice(2), {
  defaultUrl: CCEL_EDWARDS_FREEDOM_OF_WILL_XML_URL,
  envUrlKey: 'CCEL_EDWARDS_FREEDOM_OF_WILL_URL',
  slug: EDWARDS_FREEDOM_OF_WILL_SLUG,
  purgeFlag: '--purge-jefow',
  parse: parseCcelEdwardsFreedomOfWillXml,
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
