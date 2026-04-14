# Features & Functionality

Guide to core features and their implementation.

## Questions & Answers

Users can answer reflection questions added to profiles by editors:
- Questions added per subsection
- Answers stored in database (logged in) or sessionStorage (anonymous)
- Users can track answers across sessions
- Counselors can view aggregated responses

**Storage**: `user_answers` table (RLS protected)

## COMA Method

COMA = **C**ircumstances, **O**bedience, **M**otives, **A**pplication

The COMA template provides a structured framework for reflection:
- Pre-configured in `coma_templates` table
- Available to all users (RLS allows public read)
- Displayed in modal during profile usage
- Customizable by admins

**Status**: RLS policies fixed - now visible to all users including counselees

### Four Rules of Communication

When the exact phrase "Four Rules of Communication" (F, R, C capitalized) appears in profile content (titles, subsection content, or questions), it is rendered as a pill-style button. Clicking it opens a modal that lists the four rule headers only: Rule One - Be Honest; Rule Two - Keep Current; Rule Three – Attack the Problem, Not the Person; Rule Four – Act, Don't React. The modal content is static (no API). Same pattern as the COMA link: implemented in `TextWithComaButtons` and `FourRulesModal.tsx` in `gospel-admin/src/components/`.

## Scripture Modal

When users click a scripture reference, a modal displays the full text with these features:

- **Translation selector**: Choose from enabled translations (ESV and optionally KJV, NASB, LSB, NIV, NLT, CSB via API.Bible when configured and enabled in admin). Options are ordered by admin **display_order** in `translation_settings`, including the **Bible Translation** control in the table-of-contents menu (`TableOfContents.tsx`).
- **Compare feature**: A second dropdown (default "Compare") lets users select another translation to view side-by-side
  - Compare translation appears on the left, main translation on the right
  - Each column shows scripture text plus the appropriate attribution
  - Works for both verse view and chapter context
  - Compare options exclude the current main translation
- **Verse view**: Single verse or verse range
- **Chapter Context**: Expands to show full chapter with highlighted verse(s)
- **Attribution**: Footer displays copyright/attribution per translation; when comparing, attributions appear in each column
- **Header title**: On narrow widths, the modal title truncates the **book name** (ellipsis) and keeps **chapter:verse** visible; full reference is in `title` and `aria-label` (so assistive tech and tests see the complete string)
- **Memorize**: **Memorize** (`data-tour="scripture-modal-memorize"`) sits in the reader toolbar row with **Verse** and **Chapter Context** and saves the passage to the local memorization list when text has loaded; disabled while loading, on error, if already saved, or if there is no text. See **Verse memorization** below.

**Implementation**: `ScriptureModal.tsx` — compare state, fetch logic, and side-by-side grid layout in one component. Reference splitting for the header uses `gospel-admin/src/lib/splitScriptureReferenceForHeader.ts`.

## Scripture Highlighting & Progress

Users can:
- Mark favorite scriptures
- Clear progress from highlighted verses
- Pin/unpin verses for quick access
- Track last viewed scripture

**Features**:
- Pin-click to clear progress
- Progress persisted per user/profile
- Integrated with profile navigation
- **Anonymous visitors**: last-viewed verse is stored in the browser (`localStorage` per profile slug). Logged-in users on non-default profiles can also sync progress to the server.
- The last verse updates when you open a reference from the page **or** move to another verse inside the scripture modal (e.g. prev/next). The yellow highlight and pin use **section/subsection anchors** tied to scripture *cards* (pill lists). The pill you clicked is remembered while the modal stays on that verse. **Modal prev/next** walks the profile’s ordered list of scripture cards (each card is a step even when the reference text repeats), so the pin follows the **same subsection** as the card you navigated to—not always the first duplicate on the page. With **favorite** verses only, prev/next still uses each favorite once (first matching card if a favorite appears in multiple places). If a verse exists only as inline text (not on a card), progress may still use a generic anchor and match every pill with that reference.

## Profile Features

### Templates & Cloning
- Create reusable profile templates
- Clone templates to start new profiles
- Share templates across counselors
- Template access controlled via RLS

### Resources dropdown (public templates)
- The main page sidebar shows a Resources menu with public templates.
- Admins can create categories and assign templates to them (Admin → Settings → Resources dropdown order).
- Categories expand on click to show their templates; top-level items and categories can be reordered by drag-and-drop.

### Backup & Restore
- Export profiles to JSON
- Import profiles from backup
- Disaster recovery
- Data portability

### Descriptions & Metadata
- Profile descriptions support user assignments format: "For: username1, username2"
- Counselee access tracked in descriptions
- Helps with quick user identification

### Content editor (admin)
- Admins edit presentation structure at **`/admin/profiles/[slug]/content`** ([`ContentEditPageClient.tsx`](gospel-admin/src/app/admin/profiles/[slug]/content/ContentEditPageClient.tsx)).
- **Reorder sections**: Each top-level section header includes **Up** and **Down** to swap position with the adjacent section. After any move (and after insert/delete), section numbers in stored data are renumbered in order (`"1"`, `"2"`, …) so TOC anchors stay consistent.
- **Insert sections**: **+ Add Section** under each section card adds a new section **immediately after** that one (not only at the end). If `gospelData` is empty, a single **+ Add Section** control is shown to create the first section; there is no second duplicate control at the bottom once sections exist.

## Print
- Print Version (Table of Contents) produces a condensed, letter-sized layout; non-essential UI is hidden.
- **Output is always dark text on white**, regardless of app theme (light/dark). This avoids unreadable white-on-black when printing from the Android app in dark mode.
- **Tutorial**: On profile pages, **Help** → **Tutorials** → **Print version** runs a short driver.js tour (opens **Menu**, then highlights **Print Version**).

## Text size (presentation site)

- On **`[slug]`** gospel profile pages, the slide-out **Table of Contents** drawer lists **Resources**, **Text size**, **Print** / **Bible Translation**, **Memorize** (below **Bible Translation**), section links, then profile summary; **Login** / **Dashboard** appear last at the bottom (`SidebarAuthNav.tsx`). **Login** is hidden on **Capacitor** native builds (same as before).
- **Closing the drawer**: **Mobile** uses a transparent full-viewport layer (`z-40`) under the drawer so tapping outside closes it. **Desktop** closes when the pointer **leaves** the slide-out panel **or** when you **click** the main content area below the header (`ProfileContent` attaches the dismiss handler to the flex-growing content column so “click away” works after guided tours and matches reader expectations).
- In the sidebar below **Resources**, a **Text size** dropdown matches the Resources styling and offers **Normal**, **Larger**, and **Largest**.
- The choice is saved in `localStorage` (`gospel-profile-text-size`) and scales root font size on the main site via `TextSizeContext`, `ApplyTextSize`, and `html.text-size-*` classes in `globals.css`.
- **`/admin` routes are excluded**: text scaling is not applied on admin pages so the admin UI stays at default size.

## Verse memorization (presentation profile pages)

- **Add from scripture modal**: When the **Scripture** modal is open (`ScriptureModal.tsx`), **Memorize** beside **Verse** / **Chapter Context** saves the current passage (reference + plain text + selected translation) to **`localStorage`** (`gospel-memorization-verses` via `verseMemorizationStorage.ts`). HTML and verse markers like `[16]` are stripped before storage. Duplicates (same reference + translation) are rejected; success uses the standard alert modal.
- **Menu list**: In the slide-out **Menu**, **Memorize** (`MemorizeDropdown.tsx`, **below Bible Translation**) expands to show saved verses grouped by **Learning** / **Practicing** / **Mastered** (`getMasterLevel`: fewer than 3 completed sessions → Learning; 3–8 → Practicing; 9+ → Mastered). Each row can **Practice** or **Remove** (confirm modal).
- **Practice session** (`MemorizationPracticeSession.tsx`): The **saved reference** is shown **at the end of the verse line** and is part of what you memorize. **Tokens** are built in `memorizationPracticeUtils.ts`: verse **words** use first-letter blanks; the **reference** adds **word** tokens (e.g. book name), **one blank per digit**, and **colon / dash / other punctuation** shown in place but **never** typed. Starts with the full line (verse + reference), then **Start practice** begins five rounds with an increasing share of **typable** tokens hidden (20% … 100%). Which tokens are blanked is randomized **per practice run**; **Repeat this round** / **Next round** keep the same blanks for that run. For **word** blanks, type the **first letter** (case-insensitive); for **digit** blanks, type that **digit**; the hidden input uses **`inputMode="numeric"`** when the current blank is a digit so mobile keyboards emphasize numbers. A nearly invisible **text field** stays in the DOM from intro through practice; **Start practice**, **Repeat this round**, and **Next round** use **`flushSync` + `focus()`** in the same tap handler so **iOS Safari and Capacitor WebView** treat focus as user-initiated and show the **system keyboard**. The practice panel adds **bottom padding** from **`window.visualViewport`** when the keyboard shrinks the visible area. The **active blank** is **`scrollIntoView`**’d toward the **vertical center** of the practice scroll column whenever the current blank or round changes; a second pass uses **`window.visualViewport`** to **nudge** the column with **`scrollTo({ behavior: 'smooth' })`** (instant when **prefers-reduced-motion**) so the blank stays **inside the visible band** with extra clearance above the soft keyboard (tunable `MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX` plus **bottom padding** from the viewport inset). The scroll runs again (debounced) when the keyboard **resizes** the viewport. **Hint** is in the **modal header** (next to **Close**) during practice so it stays visible when you scroll the verse; the button uses **capture-phase** `touchstart` / `pointerdown` (`passive: false` on touch) so a tap does not **blur** the field when the keyboard is up; on the **verse** area, **`touchstart` + `preventDefault`** (`passive: false`) runs **only** when the hidden field is already focused (keyboard up) so a tap does **not** dismiss the keyboard; starting a scroll **on the verse** while focused is not possible (scroll from the instruction / round row above the verse, or dismiss the keyboard first). **Mouse/pen** use **pointerdown** capture. When the field is **not** focused, **touch** can scroll the panel, and a **tap** (no meaningful **touchmove** past ~12px) calls **`focus()` synchronously on `touchend`** so **iOS** restores the keyboard. After releasing **Hint**, the field is **refocused** so the soft keyboard stays up or returns. Three wrong letters in a row for the same blank auto-reveal that word. **Hint**: hold the **Hint** button to temporarily peek at still-hidden words in order (italic blue styling): the **first** blank appears immediately, then **one more blank every second** while you keep holding; release to hide them again—keyboard input is ignored while the hint is held. After rounds 1–4 complete, **Repeat this round** and **Next round** appear in a **footer** at the bottom of the same modal while the verse stays on screen, with a **random affirmation** above the buttons (`memorizationEncouragementMessages.ts`: treasuring God’s Word in the heart, perseverance). After **round 5**, a **random congratulation** message is shown (same module) before **Done**; completing round 5 records a practice session (wrong attempts, correct keystrokes) and updates stats in localStorage. **Escape** closes the overlay; body scroll is locked while the session is open.
- **Tutorial** (**Help** → **Verse memorization**): Opens a scripture card, saves with **Memorize** in the reader (toast OK uses `data-tour="alert-modal-ok"`), closes the reader, opens **Menu** → **Memorize**, explains the list, opens **Practice** for a short preview (intro + round 1), closes the session, then removes that verse with confirm (`tryStartMemorizeTourAfterNavigation` on `/default` when starting from another profile).

## Promotional page (`/info`)

- Public route **`/info`** summarizes the product for churches: site name, short feature list (including that the **marriage seminar** is by **Dr. Randy Westerberg**), and **three QR codes** (website, [App Store](https://apps.apple.com/us/app/the-gospel-presentation/id6759943826), [Google Play](https://play.google.com/store/apps/details?id=org.cpchurch.gospelpresentation)).
- **Narrow / small viewports** (below Tailwind **`xl`**): the promo card keeps a **~5.5in** max width but **no fixed height**—content defines height and the **page scrolls** for responsiveness. **QR codes** are **~96px** on screen (three across).
- **Wide layout** (viewport **`xl` / ≥1280px** width): the card is a **16:9** frame (centered, width capped by **~1920px**, **96vw**, and viewport height). **`main`** uses a **single full-height grid row** on a **5-column** grid: the **left four columns** are one flex column (hero, then **App Features** beside **Included Content**, **`2fr` / `1fr`** inside that region); the **right column** (~**20%** of the card) holds the **QR** stack. **Included Content** lists **Gospel**, **Marriage**, and **Biblical Counseling** in **subsection cards** with **readable** type and padding that stretches to **fill the height without scrolling**; in the **`xl`** aside, the **three QRs stack in a column** using a `grid-rows-3` layout so each block gets exactly one third of the height; the QR container scales to **fill that height using `aspect-square`** for maximum size and visual impact; labels are large (**2xl–3xl**) and beautifully spaced so it looks excellent on a TV screen; narrow portrait still uses **~100px** blocks, three across; at **`2xl` / ≥1536px** the **Included** heading, **subsection titles**, and **list items** use **larger type** (and slightly looser list spacing) for **TV / very wide** viewports; the **heading + cards** block is **vertically centered** in the column; the **hero** uses **moderate `xl` padding** so the two-column block has enough height; **App Features** card **fills the row height**; the bullet list uses **larger type** and **`justify-between`** spacing so items **use the vertical space**; the list region **scrolls** if the row is too short. The **QR column** matches the **full card height**. (Uses width only, not `orientation: landscape`.) URLs are centralized in `gospel-admin/src/lib/info-page-links.ts`; QR rendering in `InfoQrBlock` (`qrcode.react`).
- Footer navigation now includes **App Info & QR Codes** links from both presentation footers and the Copyright page.

## Bookmarks (presentation profile pages)

- **Help & tutorials**: To the **left of the bookmark** icon, a **help (question mark)** control opens a **Tutorials** menu (scrollable when the list is taller than the panel). **driver.js** tour popovers cap **max-width** / **max-height** with **`env(safe-area-inset-*)`** so tutorial cards fit the usable region; they are **not** given unconditional safe-area **margins** (those shift fixed positioning after driver.js lays out and can cover spotlights on notched devices). When insets are non-zero and the popover rect would overlap a safe inset band, **`applyProfileHelpTourPopoverSafeAreaNudge`** (`profileHelpTours.ts`) applies a **conditional `translate`** after layout and after **`refresh()`**. **Full walkthrough** runs every tour **from bookmarks through Marriage seminar resources** in menu order (`runFullProfileHelpTutorial`). The **Scripture reader** segment **navigates** to **`/default`** when you are on another profile so the tour matches the public gospel outline; **sessionStorage** resumes driver.js on `/default` via `tryStartScriptureReaderTourAfterNavigation`. The **last** segment **navigates** to the shared marriage profile; **sessionStorage** resumes driver.js on the destination page with the same captive-step behavior until **Done**. When that segment finishes, a **thank-you** popover (**Thanks for watching** / **May God bless your study of His Word**; **Continue**) sends the reader back to the **profile `[slug]` where the walkthrough started** (`sessionStorage` `gospel-full-walkthrough-start-slug-v1`, set at walkthrough start). Cancelling the chain (**×**) clears that key without that return navigation. Each full-walkthrough segment begins with a short **announcement** step (title + summary, then **Next**). **Overlay** taps do not dismiss during chained segments (avoids accidental exit); the popover **×** cancels the **entire** full walkthrough from that point (with cleanup: bookmarks panel, theme snapshot, marriage resume key, etc.). **Escape** is disabled only while a segment is **mid-chain** (so it does not skip to the next segment); on the **last** segment, **Escape** can dismiss like **×**. When any tour segment ends, the slide-out **Menu** is closed if it was open (the next segment reopens it when needed). Guided tours (driver.js) include **Using bookmarks** (opens the panel, scrolls to the **second subsection** in the page when present—e.g. point B—or otherwise the second list item, then adds a bookmark for the tour and removes that same row with automatic confirm; closes the panel when the tour ends via a dedicated close signal), **Light and dark mode** (**Next** flips the theme once; **Done** (or closing the tour) restores the prior saved light/dark choice, or removes the storage key so the site follows the device setting again if the reader had not picked one), **Resources menu** (header **Menu** first with drawer closed; **Next** opens Resources; then list overview; then **one step per subsection**—each consecutive run of top-level links and each **category** folder is highlighted once with a single explanation listing what is inside; category folders auto-expand on highlight; caps: 8 top-level blocks, 6 categories; `data-resource-templates-block`, `data-resource-category-id`, `data-resource-template-slug` on `TableOfContents`), **Table of contents** (**Menu** → highlights blue section/subsection links; `data-tour="toc-section-links"` on `TableOfContents`; `runTableOfContentsFeatureTour`), **Text size** (**Menu** → **Text size** toggle → panel with Normal / Larger / Largest; `data-tour="toc-text-size-toggle"` / `text-size-panel` on `TableOfContents`), **Print version** (**Menu** → `data-tour="toc-print-version"` **Print Version** button; explains print/PDF layout and dark-on-white output), **Bible translation** (**Menu** → `data-tour="toc-bible-translation"` wrapper around the **Bible Translation** label and dropdown under Print; tutorial popover lists every enabled name from `/api/translations/enabled`, matching the dropdown), **Scripture reader** (from another slug, opens **`/default`** first, then opens first `data-tour="scripture-card"`; walks `ScriptureModal`—presentation context, passage text, **Compare** when available, **Chapter context**, **Verse** back to single passage, **Next** / **Previous** arrows, close, pinned card `data-scripture-last-viewed`, pin spotlight `data-tour="scripture-progress-unpin"` on `GospelSection` (explained only—the tour does not unpin); then **Menu** → bottom-of-drawer **Reading progress** `data-tour="toc-reading-progress"` and **Reset Progress** `toc-reset-progress` on `ProfileContent`, with **Next/Done** automating the reset click), **Verse memorization** (like scripture reader, may open **`/default`** first; first `data-tour="scripture-card"` → `scripture-modal-memorize` → close reader → **Menu** → **Memorize** / list → **Practice** preview via `data-memorize-verse-practice` → `memorize-start-practice` / round 1 → close `memorize-practice-close` → list again / remove via `data-memorize-verse-id`; `tryStartMemorizeTourAfterNavigation`; `alert-modal-ok` for the save toast), **Quick verse preview** (standalone: **desktop** **hover**; **mobile / native app** **press-and-hold** for paragraph references; **CSS-animated HTML** in the popover—a **link-style pointer hand** (Bootstrap Icons `hand-index-fill` silhouette, same idea as `cursor: pointer` on links) brings the **fingertip** to the **center** of a mock blue button; the preview card **overlaps** the chip top (like `ScriptureHoverModal`), then (after a short beat) **fades in**; touch devices also get a **chip squish** on press—`runScriptureHoverPreviewFeatureTour`, styles in `globals.css` under `.scripture-hover-preview-tour-demo`), and **Marriage seminar resources** (last menu item: **Menu** → **Resources** → optional Marriage **category** step when the lesson is foldered; **Next** opens shared template **Marriage: A Biblical Perspective**, slug `marriagechapter1`, when listed; **sessionStorage** resumes driver.js on the destination page via `tryStartMarriageSeminarTourAfterNavigation` in `ProfilePageClient`; spotlights `data-tour="profile-section-external-link"` on `GospelSection`, the **second** `data-tour="scripture-card"` in `main` (the first often matches the recording link; if only one card exists, that one is used), then the **Homework** heading, the first `data-tour="profile-question-block"` and `data-tour="profile-save-answer"` inside that section on `GospelSection`); see `ProfileHelpMenu` and `profileHelpTours.ts`.
- **First visit welcome**: The first time someone opens a gospel **profile** page in this browser (`ProfileContent`), a **Welcome** dialog offers **Start full walkthrough** or **Close**. Dismissal is stored in **`localStorage`** (`gospel-presentation-first-visit-welcome-v1` via `presentationWelcomeStorage.ts`). **Close**, clicking the dimmed backdrop, or **Escape** closes the dialog and briefly highlights the **Help** (`?`) control (`PresentationFirstVisitWelcome`). **Start full walkthrough** saves the same flag and runs `runFullProfileHelpTutorial`. The overlay is a **`fixed inset-0`** layer with the **semi-transparent background on that node** (so the whole viewport stays dimmed), then a **`min-h-dvh` grid** centers the card; safe-area padding and optional body scroll inside the card help **Safari / iOS** and larger text sizes.
- **Header control**: On `[slug]` profile views, a **bookmark** icon sits between the help control and the **theme** toggle. The bookmark, help, and theme controls match the **Menu** button: **light mode** uses soft **slate-200 / hover slate-300** with **slate-800** icons and label; **dark mode** uses **slate-600 / hover slate-700** with white icons. The dropdown panel (styling aligned with the TOC text-size controls) opens **directly under the icon**. On viewports **below the `md` breakpoint** (~768px), the panel is **horizontally centered** on the screen; on wider screens the panel’s **right edge aligns to the icon** so it opens **leftward**. Position updates on scroll/resize while open. While open, a **dimmed full-viewport backdrop** (fades in) is rendered via a **portal to `document.body`** so it covers the whole page (the sticky header’s `backdrop-blur` would otherwise clip `position: fixed` children to the header); tap/click outside closes it on all breakpoints.
- **Add**: **+ Add bookmark** saves the current resource (`profile` title and slug) and the best-matching **table-of-contents anchor** (same `section-*` ids as the TOC) plus a short location label. Data is stored only in **`localStorage`** (`gospel-profile-bookmarks`); duplicate slug + anchor is ignored (“Already saved”).
- **Open**: Tapping a bookmark scrolls to that anchor on the current page, or **`router.push`/`#hash`** to another saved resource; deep links scroll after load via the same offset logic as TOC links ([`scrollToTocAnchor`](gospel-admin/src/lib/scrollToTocAnchor.ts)).
- **Remove**: Each row has a remove control; confirmation uses the same app confirm modal as other actions.

## Native app (Capacitor)

The app is wrapped for iOS and Android via Capacitor (WebView loads the deployed site).

- **Tutorial navigation**: Scripture-reader tour jumps to `/default` and the full-walkthrough **thank-you** return to the stored profile slug use **`router.push`** on native (`CapacitorProfileHelpTourNavigation` in `layout.tsx` registers with `scriptureReaderTourNavigation.assign` in `profileHelpTours.ts`) so those moves stay in the WebView instead of opening the system browser.

- **Splash screen (iOS)**: On launch, the iOS app shows a centered app icon on a solid background (Launch Screen) and keeps it visible until the web app has loaded. This avoids a black screen between the system launch screen and the first painted content. Implemented with `@capacitor/splash-screen` (`launchAutoHide: false`) and `SplashScreenController` calling `SplashScreen.hide()` once the app is ready; the launch screen is defined in `ios/App/App/Base.lproj/LaunchScreen.storyboard` and uses the `LaunchIcon` image set (same graphic as the app icon). Changing the launch screen or splash behavior requires a **native rebuild** (e.g. `npx cap sync` then build in Xcode).

## Related Documentation
- Questions: [QUESTIONS_FEATURE.md](QUESTIONS_FEATURE.md)
- Answers: [ANSWERS_TO_DATABASE.md](ANSWERS_TO_DATABASE.md)
- COMA details: [COMA_RLS_FIX.md](COMA_RLS_FIX.md)
