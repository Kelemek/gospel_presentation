# Digital Bible Library (DBL) — License Request Template

Use this template when requesting access or a license from the Digital Bible Library (DBL) or any Bible-content provider so you can fetch Bible versions via their API. The template below is generic — adapt the specifics (organization name, URLs, expected traffic, usage types, jurisdictions) to your project.

---

## Quick checklist (what to include with the request)

- Project name and URL (e.g., https://gospel-presentation.vercel.app)
- Organization / individual name and contact email/phone
- Technical contact (name, email)
- Short description of the product and how you'll display verses
- Which Bible versions/translations you want (list exact codes/names)
- How you will use the text (display on web, mobile, print, derivative works)
- Whether you will store/cached verses (and for how long)
- Whether your use is commercial or non-commercial
- Expected monthly requests / estimated usage (API calls per month)
- Regions/countries where content will be available
- A short privacy/security note (how you handle user data)
- Any sample URLs/screenshots showing how verses will appear

---

## Email / Request Template

Subject: License request — access to Bible texts for "<Project Name>" via DBL / Bible API

To: [Digital Bible Library contact email or licensing team]
CC: [technical contact]

Hello [Licensing Team / Name],

My name is [Your Name] and I am the [title, e.g. Founder / Developer / Project Lead] of [Organization Name] (<project URL>).

We are building an application called "<Project Name>" that helps counselors and educators create personalized gospel presentations for counselees. Our app is available at: <project URL>.

We would like to request a license and API access to the following Bible versions from the Digital Bible Library (DBL) / Bible API so we can display scripture passages in our web and mobile interfaces:

- [Version 1] — e.g., New International Version (NIV)
- [Version 2] — e.g., English Standard Version (ESV)
- [Version 3] — (list all requested versions and exact names/codes)

Use cases
- Display scripture passages inline within the presentation pages (web and mobile).
- Allow users (counselors and counselees) to view specific verses and short passages (no full-book downloads stored permanently).
- Provide proper attribution and links back to the original translation/provider.

Technical details
- API consumption: We will call the DBL/Bible API at runtime to fetch passages; some passages may be cached for up to [e.g., 24 hours] to reduce API calls and improve performance.
- Estimated traffic: We expect approximately [X] API calls per month initially (growth to [Y] in 12 months). Example: [X] = 5,000 calls/month.
- Caching: Local in-memory or server-side cache for repeated passages; no permanent storage of entire translations.
- Hosting: App deployed on Vercel (https://vercel.com) under the domain: <project URL>.
- Regions: Content will be available worldwide, primarily in [list countries/regions].

Permissions requested
- Read-only access to the requested Bible versions via the API for display in the app.
- Permission to cache verse text temporarily for performance (please specify allowable cache durations).
- Clarify whether we can allow end-users to copy/paste verses and whether there are any restrictions on sharing outside the app.

Legal / Commercial
- This is a [non-commercial/commercial] project. (If commercial: brief details about monetization.)
- We will comply with any attribution requirements and terms of use set by DBL and the rights holders.

Attachments
- App README (describes feature set): [attach README or paste brief summary]
- Screenshots of where and how verses will be displayed in the UI
- Expected monthly usage spreadsheet (if available)

Contact
- [Your Name]
- [Title]
- Email: [your-email@example.com]
- Phone: [optional phone]
- Technical contact: [tech name and email]

We would appreciate guidance on the licensing terms and any next steps to obtain the necessary keys/credentials and comply with rights holders' requirements.

Thank you for your help,

[Your Name]
[Organization]
[URL]

---

## Notes & Best Practices

- Be explicit about which translations and data you need; DBL represents many rights-holders and you will often need to request each version by name.
- Attach screenshots showing the passage formatting and attribution so the licensing team can see how text will be displayed.
- If you plan to reuse or redistribute content (e.g., downloadable PDFs with verses), call that out — it may require additional permissions.
- Keep cache durations conservative (24 hours or less) unless the license permits longer storage.
- Always ask about required attribution text and hyperlinking back to the source.

## Next steps I can take for you
- Draft a message using your exact organization/project details.
- Create a short one-page summary (PDF) to attach with the request.
- Help populate the `Expected monthly usage` estimate based on your user numbers.

If you want, I can create a ready-to-send message with your project details — tell me the project name, URL, organization name, and which versions you want and I'll draft the email.
