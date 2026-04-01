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

- **Translation selector**: Choose from enabled translations (ESV, KJV, NASB, LSB, and optionally NIV, NLT, CSB via API.Bible when configured and enabled in admin)
- **Compare feature**: A second dropdown (default "Compare") lets users select another translation to view side-by-side
  - Compare translation appears on the left, main translation on the right
  - Each column shows scripture text plus the appropriate attribution
  - Works for both verse view and chapter context
  - Compare options exclude the current main translation
- **Verse view**: Single verse or verse range
- **Chapter Context**: Expands to show full chapter with highlighted verse(s)
- **Attribution**: Footer displays copyright/attribution per translation; when comparing, attributions appear in each column
- **Header title**: On narrow widths, the modal title truncates the **book name** (ellipsis) and keeps **chapter:verse** visible; full reference is in `title` and `aria-label` (so assistive tech and tests see the complete string)

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

## Text size (presentation site)

- In the sidebar below **Resources**, a **Text size** dropdown matches the Resources styling and offers **Normal**, **Larger**, and **Largest**.
- The choice is saved in `localStorage` (`gospel-profile-text-size`) and scales root font size on the main site via `TextSizeContext`, `ApplyTextSize`, and `html.text-size-*` classes in `globals.css`.
- **`/admin` routes are excluded**: text scaling is not applied on admin pages so the admin UI stays at default size.

## Promotional page (`/info`)

- Public route **`/info`** summarizes the product for churches: site name, short feature list (including that the **marriage seminar** is by **Dr. Randy Westerberg**), and **three QR codes** (website, [App Store](https://apps.apple.com/us/app/the-gospel-presentation/id6759943826), [Google Play](https://play.google.com/store/apps/details?id=org.cpchurch.gospelpresentation)).
- **Portrait / bulletin**: content is constrained to a card-sized layout around **5.5in × 8.5in** so the full design fits the intended bulletin screenshot. **QR codes** are **~88px** on screen (three across); on **`xl`** they render at **~128px** (SVG module size **128** for sharp scaling), **centered** in the aside with a **compact vertical gap**; the aside **scrolls** if the column is shorter than the stack.
- **Wide layout** (viewport **`xl` / ≥1280px** width): the card is a **16:9** frame (centered, width capped by **~1920px**, **96vw**, and viewport height). **`main`** uses a **single full-height grid row**: the **left four columns** are one flex column (hero, then **App Features** (wider column) beside a **narrower Included Content** column, roughly **~67% / ~33%** (**`2fr` / `1fr`**). **Included Content** lists **Gospel**, **Marriage**, and **Biblical Counseling** in **subsection cards** with **readable** type and padding; the **heading + cards** block is **vertically centered** in the column when it is **shorter** than the row; **vertical scroll** applies when the list **overflows**; the **hero** uses **moderate `xl` padding** so the two-column block has enough height; **App Features** card **fills the row height**; the bullet list uses **larger type** and **`justify-between`** spacing so items **use the vertical space**; the list region **scrolls** if the row is too short. The **QR column** matches the **full card height**. (Uses width only, not `orientation: landscape`.) URLs are centralized in `gospel-admin/src/lib/info-page-links.ts`; QR rendering in `InfoQrBlock` (`qrcode.react`).
- Footer navigation now includes **App Info & QR Codes** links from both presentation footers and the Copyright page.

## Bookmarks (presentation profile pages)

- **Header control**: On `[slug]` profile views, a **bookmark** icon sits to the left of the theme toggle. The bookmark and theme controls match the **Menu** button: **light mode** uses soft **slate-200 / hover slate-300** with **slate-800** icons and label; **dark mode** uses **slate-600 / hover slate-700** with white icons. The dropdown panel (styling aligned with the TOC text-size controls) opens **directly under the icon**. On viewports **below the `md` breakpoint** (~768px), the panel is **horizontally centered** on the screen; on wider screens the panel’s **right edge aligns to the icon** so it opens **leftward**. Position updates on scroll/resize while open. While open, a **dimmed full-viewport backdrop** (fades in) is rendered via a **portal to `document.body`** so it covers the whole page (the sticky header’s `backdrop-blur` would otherwise clip `position: fixed` children to the header); tap/click outside closes it on all breakpoints.
- **Add**: **+ Add bookmark** saves the current resource (`profile` title and slug) and the best-matching **table-of-contents anchor** (same `section-*` ids as the TOC) plus a short location label. Data is stored only in **`localStorage`** (`gospel-profile-bookmarks`); duplicate slug + anchor is ignored (“Already saved”).
- **Open**: Tapping a bookmark scrolls to that anchor on the current page, or **`router.push`/`#hash`** to another saved resource; deep links scroll after load via the same offset logic as TOC links ([`scrollToTocAnchor`](gospel-admin/src/lib/scrollToTocAnchor.ts)).
- **Remove**: Each row has a remove control; confirmation uses the same app confirm modal as other actions.

## Native app (Capacitor)

The app is wrapped for iOS and Android via Capacitor (WebView loads the deployed site).

- **Splash screen (iOS)**: On launch, the iOS app shows a centered app icon on a solid background (Launch Screen) and keeps it visible until the web app has loaded. This avoids a black screen between the system launch screen and the first painted content. Implemented with `@capacitor/splash-screen` (`launchAutoHide: false`) and `SplashScreenController` calling `SplashScreen.hide()` once the app is ready; the launch screen is defined in `ios/App/App/Base.lproj/LaunchScreen.storyboard` and uses the `LaunchIcon` image set (same graphic as the app icon). Changing the launch screen or splash behavior requires a **native rebuild** (e.g. `npx cap sync` then build in Xcode).

## Related Documentation
- Questions: [QUESTIONS_FEATURE.md](QUESTIONS_FEATURE.md)
- Answers: [ANSWERS_TO_DATABASE.md](ANSWERS_TO_DATABASE.md)
- COMA details: [COMA_RLS_FIX.md](COMA_RLS_FIX.md)
