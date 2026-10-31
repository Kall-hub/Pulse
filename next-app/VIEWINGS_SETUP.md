# Smarter viewings in The Pulse

The upgrade is integrated into this app's existing `/viewings` page and uses the existing Firebase login and Sidebar. The public tenant page is `/viewing`. This app retains its `output: 'export'` hosting setup: server operations run in three Netlify Functions rather than unsupported Next.js server routes.

## Finish the connection

1. In Netlify, add the environment variables from `.env.viewings.example`. The server-only Firebase service account must belong to `ocpulse-9e668`. Keep the private key and signing secret out of browser variables and source control. Generate a random signing secret of at least 32 characters. Set `APP_ORIGIN` to your real public HTTPS domain and `OFFICE_PHONE` to your actual contact number.
2. In Firebase Console → Authentication, copy the **UID** of each staff member who manages viewings. Put these IDs, separated by commas, in `VIEWING_AGENT_UIDS` on Netlify. An Admin SDK custom claim `viewingsAgent: true` also grants access. This list is intentionally server-controlled: editable profile roles cannot grant API privileges. Do not put email addresses in the UID list.
3. Install dependencies with `npm install`. The server dependencies added are `firebase-admin`, `@google-cloud/firestore`, and `@opentelemetry/api`. Run `npm run test:viewings` and `npm run build`.
4. Deploy the updated Firestore rules using your normal Firebase workflow (`firebase deploy --only firestore:rules` after confirming the project). The file preserves your ticket, email log and finance rules, but excludes `viewings` from the broad signed-in allow rule. Only server APIs may access viewings. The rules are modified locally; they are **not deployed automatically**.
5. Deploy this app through your existing Netlify workflow. `netlify.toml` now declares `netlify/functions` with the esbuild bundler. No deployment was performed as part of the local code integration.

For local use, run `npm run dev` from this folder. It starts Next.js and a loopback-only server running the actual Netlify handlers; Next.js proxies the function URLs to it. Open `http://localhost:3000/viewings`. Production still uses Netlify Functions and static export. A private `.env.local` template has been created with a generated signing secret and localhost origin. Fill in `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `VIEWING_AGENT_UIDS` using your Firebase service account and staff authentication UIDs, then restart the dev command. Set `OFFICE_PHONE` if needed. Firebase Console > Project settings > Service accounts provides the Admin SDK service account key. Enter the email and private key from that key privately in `.env.local`, never in chat. Use the quoted private-key format shown in `.env.viewings.example`. Keep local secret files ignored. Netlify Dev is also supported when configured separately.

## What changed

- Booking captures tenant name, phone/WhatsApp preference, property/unit, **manual agent name**, date and time. All times use South Africa time (SAST). New records begin as Awaiting Confirmation.
- Saving prepares a private link and WhatsApp message. **Click Open WhatsApp, then Send in WhatsApp.** Opening a draft is not delivery. Copy-message is available for other channels. Automatic delivery/interactive WhatsApp buttons would require a separate WhatsApp Business connection; the choices here are on the linked tenant page.
- The tenant can confirm, cancel or request a preferred date and time. Cancellation is visible on the dashboard within its 10-second refresh interval.
- Requested reschedules appear in Requests with the original and preferred slots. Approve moves the appointment and prepares a confirmation. Slot not available preserves the old appointment, creates a new link, and prepares a reply asking for another slot or a telephone call.
- Refreshing/sharing a link and either reschedule decision replaces the previous private link. Do not keep sending older drafts. Links expire 30 days after the scheduled appointment (or creation, whichever is later). Anyone with a private link can manage that one viewing; do not share publicly.
- Old `/cancel-viewing?id=...` links no longer cancel appointments automatically. The old page asks tenants to request a fresh link. Use Prepare WhatsApp link on old active bookings to issue a secure replacement. Historical records remain stored.
- Completed visits drive the analytics: at least **five completed visits** are required for the top-property spotlight. Cancelled bookings and no-shows are excluded. Property history shows booking counts, completed visits, cancellations, last visit and individual booking dates, agents, statuses and outcomes.
- The line graph shows daily completed visits for a selected property over the last 30 SAST days, including zero days. Exact daily figures are also available in a table. High traffic triggers a maintenance and cleaning reminder.
- Future viewing outcomes cannot be logged early. Transactions reject stale updates and prevent a tenant from changing an ended booking. Events record the changes in a private subcollection.

## Verification and limits

Verified locally: the Next.js production build passed, all seven new/updated JSX files compiled, and all 15 workflow, signed-link and API authorization tests passed. The functions loaded successfully without live Firebase credentials for these guard tests. Browser and live Firebase/WhatsApp checks remain outstanding.

Run `npm run test:viewings` for booking transitions, validation, traffic threshold, SAST day boundaries, and signed-link tampering/expiry tests. Live Firebase access, deployed security rules, and real WhatsApp delivery require the configuration above and a live acceptance check.

Acceptance check: sign in as an allowlisted staff member; book a future viewing; open the link on another device; confirm/cancel; request a different slot; approve; request/reject on a second booking; open the replacement link and pick another slot; verify a non-allowlisted account is denied; log five actual completed visits and inspect analytics.

Booking requires a manually entered agent name. The same name (ignoring capitalization and extra spaces), date and exact start time cannot be booked twice, even at different properties. Cancelled appointments free the slot. Creation and reschedule approval enforce this in a server transaction, including simultaneous saves and legacy records. The form also shows an immediate conflict warning. There is no duration model, so nearby start times are not treated as overlapping. This is one shared team's viewings; organization scoping is needed before use by independent agencies. All-time history currently reads all booking records; add pagination/aggregated analytics for a large dataset. Public tenant requests have a Netlify rate limit configuration (60 requests/minute per IP/domain grouping); verify this limit is supported on your hosting plan.

The Sidebar's Firebase import casing was corrected from `Config` to `config` to match the actual folder on case-sensitive deployment hosts. Styling is scoped to the new screens so other pages keep their styles.

Original overwritten source files are backed up outside the app at `C:\Users\kally\Documents\New project\pulse-integration\originals`.

References: [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [Netlify Functions configuration](https://docs.netlify.com/build/functions/configuration/), [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Viewing slot availability and client confirmations

The Slot Availability tab shows a monthly calendar and host-specific appointment starts from 08:00 to 16:00 in 15-minute steps. Select or enter the same host name used on booking cards; capitalization and extra spaces are ignored. Open times prefill a new booking form, while booked appointments open their card. Final saves still use the server transaction to prevent simultaneous double bookings. This schedule tracks exact starts, not viewing duration or travel time. Cancelled bookings release their slot; pending requests preserve the original appointment until approved. Availability selection is disabled after a booking-refresh error until fresh data loads.

When a client keeps the original slot after a rejected request, Pulse stores a timestamped tenant response. The client sees a saved confirmation and staff see “Client kept the original slot” on the booking card after the next refresh. Network errors and timeouts prompt the client to refresh and check saved status before retrying.
