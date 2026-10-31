# Keeping Pulse Tech on a phone

The /tech-view page has its own web app manifest and local icons. On a public HTTPS deployment, supported browsers can install Pulse Tech with its own home-screen icon and launch directly into Tech View. Older browsers can use their Add to Home screen / bookmark function. The page provides manual Android and iPhone instructions when no install prompt is available. Installation varies by browser and device; verify on the actual contractors' phones after deployment.

This does not create an Android APK or a Play Store application. Installation does not grant database access. Existing Firebase sign-in and deployed security rules still apply. It does not provide offline task updates, queued photo uploads or background sync. No service worker caches private job data.

Each opened job has Share job details, Copy text and Show job text. Native sharing is used when available, otherwise selectable text is provided. Contractors can paste/share that text into WhatsApp or notes for reading later. The text includes the job number, property, appointment, tasks and a SAST timestamp; it explicitly describes itself as a snapshot. Sharing always requires the user to select a recipient and send. The shared snapshot does not update live.

The portal contractor list matches maintenance: Rasta and Big boy internally, Chris and Derrick externally. External assignments use the externalContractor field. Legacy Derick and Drerick assignments are read as Derrick; no database records are rewritten. Relevant Firestore queries may need composite indexes on the deployed project; if Firebase returns an index-required error, use its console link to create the index. The portal shows a retryable error when a team/job query fails; verify live queries before rollout.

Run npm run test:tech for text export, contractor matching, manifest settings and icon dimensions. Acceptance: deploy over HTTPS, open the portal in Android Chrome, tap Install Pulse Tech or use the browser menu, reopen from the icon, load an assigned job, share its text to WhatsApp and reopen the text offline. Check on at least one contractor's low-end phone. Live Firebase access and real-device install/share acceptance were not performed locally.

References: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable and https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt

## Photo evidence and planning

Each repair item now requires 1–2 photo URLs before Tech View or the maintenance page can mark it complete. Camera capture is requested from the browser; devices may also offer their image picker. Photos are resized locally to a maximum dimension of 1000 pixels and uploaded sequentially. The Done button is disabled while no photo is present or processing/uploading is underway. The Firestore transaction reads the latest job, rechecks its contractor and status, merges the repair without overwriting concurrent task updates, and completes the card only when all items are done with evidence. The office finalize action applies the same checks. These are application guards; the existing deployed Firebase authentication/security rules are unchanged.

Previously completed history is retained. An active card with an old tick but no evidence will show that item as needing a photo; the contractor can attach it before the card is finalized. New task completion and office scheduling changes create event entries under maintenance/{jobId}/events. Uploaded files are retained if the save result is uncertain to avoid deleting evidence for a possibly committed repair.

Today means the appointmentDate exactly matches the SAST calendar date. Past dates, future dates and unscheduled cards have separate views. Age uses issueDate, falling back to a valid createdAt timestamp, and does not infer dates from ambiguous localized loggedAt strings. Five calendar days triggers coordinator review. A future scheduled date is explicitly distinguished from an overdue appointment.

The initial capacity-warning threshold is five active job cards, independent of repair-item counts. The maintenance page shows workload before assignment and requests confirmation if the proposed assignment or same-date bookings reaches that threshold. The job and its event history retain a snapshot of the open/date/aged counts seen when the office booked it, plus the signed-in office UID and timestamp. This is a planning warning, not automatic fault attribution or a duration-based capacity calculation.
