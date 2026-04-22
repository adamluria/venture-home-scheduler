# VH Scheduler — Feature ideas from popular calendar tools

Quick scan of what Google Calendar, Outlook, Calendly, Fantastical, Notion Calendar, SPOTIO, Badger Maps, and Salesforce Maps do well, mapped to things that would actually move the needle for Venture Home's sales workflow. Ordered by expected impact per unit of build effort.

## Tier 1 — High-leverage, fits our workflow cleanly

**Natural-language quick-add** (Fantastical's trademark feature)
Type "Sat 2pm Sanchez 123 Oak St Norwalk CT paid lead" into a single command bar and we parse it into {date, time, customer, address, zip → territory, leadSource}. Given we already have zip-prefix territory mapping and SlotSuggestions, this is mostly a parser + the existing NewAppointmentModal state shape. Huge for RSMs who are on the phone and want to book without opening a modal.

**Drag-to-reschedule with conflict preview**
In Day/Week/Swimlane views, drag an appointment card to a new slot. As it hovers, we show (a) the new P(close) from the suggestion engine, (b) whether the rep is available, (c) whether the moved slot triggers the weekend 7pm block or closer-only constraint. Calendly and Google both do drag-to-reschedule; none of the sales tools do it with close-probability feedback.

**"Find me a time" scheduling assistant** (Outlook's scheduling assistant, generalized)
Given customer zip + preferred window (e.g., "this week, 2–7pm"), return the 5 best slots across all reps ranked by P(close). We already have `suggestSlots()`. Wrap it in a standalone modal launched from a CTA on the customer detail screen / lead intake — not just inside the new-appointment form.

**SMS/email customer confirmations + reminders**
Calendly's bread and butter. Two-way: customer gets booking confirmation immediately, 48h reminder, 2h reminder; they can reply STOP or CONFIRM. The sit-rate delta on this is usually 8–15%. Twilio + SendGrid integration, uses `predictSitRate()` to decide whether to up the cadence on low-sit-rate lead sources (self-gen, retail).

**Self-service customer reschedule link**
Every confirmation has a `/reschedule/:token` link. Customer picks a new slot from that rep's available ones. Removes the RSM from the no-show-recovery loop. This is the single feature that makes Calendly worth its price tag.

**Route optimization for the day** (Badger Maps / SPOTIO)
Given a rep's confirmed in-person appointments for tomorrow, order them to minimize drive time and show the map. Call `https://routes.googleapis.com/directions/v2:computeRoutes` (Routes API) with all stops as waypoints and `optimizeWaypointOrder=true`. Upgrade our current zip-prefix proximity score to real distance when the API is enabled.

**Offline sit + outcome entry on mobile**
We already have a PWA shell. Add an IndexedDB queue for status updates (`sat`, `no_show`, `closed`, `pitched`) so a rep in a driveway with no signal can mark the outcome and it syncs when they reconnect. This is what makes mobile feel like a real tool instead of a read-only dashboard.

## Tier 2 — Worth building once Tier 1 ships

**Month view** (requested)
The standard grid. Each cell shows a density dot (0/1/2+/full) per time slot, color-coded by territory. Tap a day → Day view. Keeps us comparable to Google/Outlook for managers scanning a quarter.

**Swimlane by time-of-day** (requested)
X axis = days, Y axis = time slots (9 / 11:30 / 2 / 5 / 7), cells = rep chips. Shows "5pm is our peak and it's always full" at a glance. Different from By Rep (which puts reps on Y axis).

**By State / By Sales Team views** (requested)
Aggregations of the Rep view — group rows by territory.state or by team (CT, NYE, NJPA, etc.). Cheap to build because it's the same data.

**Resource blocking / time-off** (Google, Outlook)
Reps mark vacation, personal appts, training blocks. Suggestion engine already has `blockedSlots` on consultants; we need a UI for reps to edit their own.

**Recurring availability templates**
"Every Mon/Wed/Fri I want 2pm and 5pm free" as a reusable pattern. Hybrid reps who are in-office T/Th would benefit.

**Keyboard shortcuts** (Fantastical, Notion Calendar)
`N` new appt, `D/W/M/R` switch views, `T` today, `/` focus search. Power users (coordinators) get a 2–3x speed-up.

**Multi-calendar overlay**
Rep's VH calendar + their personal Google Calendar (read-only, OAuth). Prevents scheduling on top of a dentist appt.

**Undo toast** (Gmail-style)
"Appointment moved — Undo" with a 6-second window. Drag-to-reschedule + undo = we can ship aggressive AI auto-scheduling without fear.

**Availability heatmap**
Month grid colored by total open capacity across all reps in a territory. Lets managers see "Tuesday the 21st is bare — push partner leads that day."

## Tier 3 — Neat, lower priority

**AI conflict resolution** ("Clockwise-style")
When a higher-priority appointment gets booked into a rep's day, the engine offers to bump the lower-ranked one to the next-best slot + rep, notifying the customer.

**Time zone intelligence**
Only matters if reps cross zones (MD → NJPA is same zone; CT → far western NY might differ). Low priority.

**Quick actions on appointment long-press** (mobile)
Long-press an appointment card → Reschedule / Call customer / Directions / Mark sat. Removes the detail modal for common actions.

**Pinned searches / saved filters**
"My team, next 7 days, Paid leads only" as a one-tap filter chip.

**Dark/light mode toggle**
We're dark-only now. Coordinators working in spreadsheets all day often prefer light.

**Weekly digest email to RSMs**
Every Monday at 7am: "Last week you closed 8 of 14 sits (57%). Your best closer × lead-source combo was Claire × GTR at 61%. This week you have 22 appts booked; 3 rep × slot combos are in the red zone — click to rebalance."

**Calendar invites (.ics) to customers**
Generate a real .ics from the booking link so their personal calendar has the VH appointment with a Google Meet link pre-inserted for virtual.

**Booking-page A/B testing**
Already have partner booking pages. Measure conversion per partner; let partners choose a template.

## Suggested next-3-sprint ordering

Sprint 1 (customer-facing leverage): SMS confirmations + reminders, self-service reschedule link, `.ics` generation
Sprint 2 (rep productivity): drag-to-reschedule with conflict preview, natural-language quick-add, undo toast
Sprint 3 (field ops): route optimization via Routes API, offline outcome entry, month + swimlane views

## Sources

- [Fantastical vs Google Calendar 2026 (Morgen)](https://www.morgen.so/blog-posts/fantastical-vs-google-calendar)
- [Google Calendar vs Outlook 2026 (YouCanBook.me)](https://youcanbook.me/blog/google-calendar-vs-outlook)
- [8 Best Google Calendar Alternatives 2026 (YouCanBook.me)](https://youcanbook.me/blog/google-calendar-alternatives)
- [6 best calendar apps in 2026 (Zapier)](https://zapier.com/blog/best-calendar-apps/)
- [Best Apps for Field Sales Reps 2026 (SPOTIO)](https://spotio.com/blog/best-apps-for-sales-reps/)
- [Field sales software 2026 (Pipedrive)](https://www.pipedrive.com/en/blog/field-sales-software)
- [Sales route optimization (SPOTIO)](https://spotio.com/features/sales-route-optimization/)
- [Calendar UI Examples & UX Tips (Eleken)](https://www.eleken.co/blog-posts/calendar-ui)
- [Calendar View Pattern (UX Patterns)](https://uxpatterns.dev/patterns/data-display/calendar)
