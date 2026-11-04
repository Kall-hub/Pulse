# Internal Pulse slot availability

Maintenance has a Slot Availability tab. This is Pulse's own calendar: no Google Calendar connection, credentials or synchronization are used.

## Using it

Choose a contractor, appointment length and date. The weekly view shows 08:00–16:00 in SAST, with job-card blocks labeled by start/end time, job-card ID and property. A 15-minute start-time grid and seven-day selector are also available on small screens. Click a gap, choose an active job card and save. New work starts with Log Request and Approve & Assign. Appointment length defaults to one hour and can be adjusted from 15 minutes to a full working day; include travel in that duration when needed. No automatic breaks, holidays or leave schedule is assumed.

The calendar reserves intervals, not just identical start times. An appointment ending at 10:00 can be followed by one starting at 10:00. Overlapping appointments for the same contractor are rejected even at different properties. Different contractors can be booked simultaneously. Times and durations must use 15-minute intervals and finish by 16:00. New bookings must be in the future.

The existing appointment-date control on a job card now opens Slot Availability. The selected card can be booked or moved there. Remove appointment clears its date/time/duration while keeping the card active. Past completed timed job cards remain calendar records and keep their original scheduled interval; they are opened in History rather than edited as active work. Date-only completed history is shown without inventing start/end times.

## Existing bookings

An active job with a date but no valid time and duration is labeled Time needed. It makes gaps for that contractor/day uncertain, rather than falsely green. Staff can set those cards' times or explicitly acknowledge the other untimed cards when saving a provisional appointment. Unknown dates never become free appointments automatically. Cards without dates appear in a queue for the selected contractor.

Start/end times also appear in Tech View, printed job cards and shared job text. Five-card capacity reviews and booking workload snapshots are retained.

## Persistence and concurrency

Fields: appointmentDate (YYYY-MM-DD), appointmentTime (HH:mm), appointmentDuration (minutes). Existing quantity/task/photo fields are unchanged by scheduling. The same Firestore document is used by Maintenance and Tech View.

All assignment/time updates in Maintenance use a Firestore transaction. A per-contractor/day registry under maintenance/_schedule/days/{contractor_date} serializes simultaneous bookings. The transaction reads registered job documents and known legacy documents before writing, checks their current contractor/status/interval, rejects overlapping or stale edits and appends a scheduling event under the job card. Moving/removing an appointment makes old registry references harmless: their current job documents no longer reserve that old interval. A full live snapshot is required in the UI before booking; cached/offline data is explicitly unconfirmed.

This remains protected by the existing Firebase login and deployed maintenance access rules. Application validation does not replace a future server-side/Firestore authorization review for independent SaaS organizations.

Run npm run test:maintenance for interval boundaries, time zones, working hours, legacy uncertainty, concurrent reservations, release and stale-update guards. Before rollout, test booking/rescheduling with two real signed-in sessions against the deployed Firebase project, then verify that the contractor sees the new date/time in Tech View.

## Temporarily disabled in the office UI

MAINTENANCE_PLANNING_ENABLED in src/lib/maintenance/features.mjs is false. Maintenance shows only New Requests, Active Jobs and History. Calendar entry points, workload/capacity warnings, aging notices and booking snapshots are hidden. Staff can assign or reassign contractors directly without schedule or capacity confirmations. Existing dates, schedule records and the calendar implementation remain intact for a later deliberate re-enable. Photo completion and PQA rights are unchanged. This switch affects the Maintenance office page, not the Viewings calendar or contractor Tech View.
