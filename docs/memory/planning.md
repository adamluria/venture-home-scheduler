

# Planning Memory — 2026-04-08
**Contributor**: Project creator (via Ignition planning session)
**Session type**: Initial brainstorm and project definition

---

## What We're Building

We are building an intelligent calendar and scheduling system called **VH Solar Scheduling** for Venture Home Solar, a residential solar sales company operating across 9 US states (Maine, New Hampshire, Massachusetts, Rhode Island, Connecticut, New York, New Jersey, Pennsylvania, and Maryland). The system replaces a manual, geography-unaware scheduling process with a smart, territory-optimized platform that handles appointment assignment, drive-time constraints, virtual closer pairing, external partner booking, and eventually predictive intelligence powered by 2 years of historical Salesforce data.

The system serves multiple user types: **inside sales agents** (two squads led by Joseph and Ben) who schedule high volumes of appointments from desktops, **outside sales consultants** (~42 field reps across 7 territories) who need a mobile-first experience for managing their daily schedules on the go, **external partners** (Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics) who book appointments through dedicated booking links, and eventually **customers themselves** who will self-schedule via an embedded booking widget on venturehome.com and Facebook.

The core innovation is **geography-aware intelligent assignment**: when an inside sales agent clicks to schedule, the system should determine the optimal sales consultant based on zip code proximity (no more than 90 minutes from the rep's home, no more than 60 minutes between consecutive appointments), lead ownership rules, rep skill-level weighting, and historical performance data. It should also determine whether a virtual closer (called a "Design Expert") should be paired with the consultant, based on learned patterns from past manual assignments and outcomes.

This system must integrate deeply with Salesforce (where appointments are tracked as records on a custom object and leads become opportunities once scheduled), Google Calendar (bidirectional sync for rep availability and appointment visibility), and SMS/email systems for automated customer and rep reminders. The calendar interface needs multi-layer territory filtering, overbooking placeholder slots, color-coded appointment types and statuses, and booking links for both internal and external use.

## Why We're Building It

Venture Home's current scheduling workflow is manual and breaks down at multiple points:

- **No geographic intelligence**: Schedulers have no intuitive way to match appointments to reps based on location, leading to excessive drive times and inefficient daily routes. In major metro areas (NYC, Boston, Baltimore/DC), traffic variability makes this even worse.
- **Poor system integration**: Current tools (Calendly, Salesforce, Google Calendar) don't communicate reliably. Changes made in one system don't reflect in others, causing double-bookings and missed updates.
- **Messy visual interface**: Existing calendar tools don't support the multi-territory, multi-layer view that managers need to see regional workload at a glance.
- **No overbooking strategy**: The team regularly gets cancellations but has no mechanism to proactively schedule placeholder appointments to maximize rep utilization.
- **Mobile failures**: The Salesforce mobile app has persistent technical issues. Field reps driving between appointments need a reliable, fast mobile experience.
- **Manual closer assignment**: Design experts are manually paired with consultants for every appointment, with no data-driven guidance on which pairings perform best.

If this system works, it becomes a **competitive moat**. No other residential solar company would have this level of scheduling intelligence — automatically optimizing rep assignment, closer pairing, route efficiency, and workload balancing across a 9-state footprint. Partners like Greenwatt would prefer working with Venture Home because the booking experience is seamless. Inside sales agents become dramatically more efficient ("push a button and it schedules properly"). And over time, the system learns which rep/closer/territory/time combinations produce the highest close rates, shortest sales cycles, and lowest cancellation rates.

The 2 years of historical Salesforce data (with the existing "Design Expert" field on opportunities) means the intelligence layer doesn't start cold — it can launch with meaningful insights from day one.

## Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Frontend framework** | React (JSX) with Vite | Fast iteration, rich ecosystem for calendar UIs, supports both desktop and mobile responsive design |
| **Styling approach** | Inline styles with dark theme | Consistent with prototype; dark theme reduces eye strain for agents working long hours; amber accent color for solar industry identity |
| **Typography** | JetBrains Mono for data/numbers, Outfit for UI text | Clear data readability for scheduling grids; modern, professional UI feel |
| **Design tone** | Professional, data-dense, dark background with amber (#F0A830) accents | Solar industry appropriate; efficient use of screen real estate for high-volume schedulers |
| **Backend** | Node.js with PostgreSQL | Phase 2+ — needed for performance tracking, ML training data storage, API layer for integrations |
| **System of record** | Salesforce is system of record for leads/opportunities/outcomes; this tool is the scheduling interface that syncs bidirectionally | Venture Home's business processes already center on Salesforce |
| **Appointment data model** | Custom Salesforce object, mirrored/cached locally for fast UI rendering | Calendar needs to be a "visual representation of a custom Salesforce object" per user requirement |
| **Scope type** | MVP → phased evolution | Phase 1 is core scheduling with territory awareness; intelligence features layer in progressively |
| **Drive time calculations** | Will require real-time mapping/traffic API | 90-minute home radius and 60-minute inter-appointment constraints are hard requirements |
| **Overbooking approach** | Placeholder slots per region that can absorb real appointments | Cancellations are frequent enough that proactive overbooking is strategically important |
| **Closer assignment evolution** | Phase 1: manual with tracking → Phase 2: suggestions → Phase 3: auto-assign high-confidence → Phase 4: full automation | Builds trust progressively; captures training data from manual decisions |

## MVP Scope

### In Scope (v1)

1. **Desktop calendar interface** for inside sales teams
   - Day, week, and multi-day views
   - Multi-layer territory filtering (view NYE + CT simultaneously, or all regions)
   - Color-coded appointment types (5 types) and statuses (7 statuses)
   - Visual distinction between in-person and virtual appointments
   - Time slots: 9 AM, 11:30 AM, 2 PM, 5 PM, 7 PM (weekdays); no 7 PM on weekends
   - Holiday blocking (6 holidays)

2. **Territory-aware appointment scheduling**
   - Zip code lookup to determine territory and available consultants
   - 90-minute max drive from consultant's home zip
   - 60-minute max drive between consecutive appointments
   - Manual override to assign directly to a specific rep by name
   - Lead source routing: "paid" leads go to any available rep; "self gen" and "get the referral" go to the owning rep (or the Design Expert on the referring opportunity, with geographic fallback)

3. **Consultant + Design Expert dual assignment**
   - Appointments can appear on both the consultant's and the Design Expert's calendar
   - Visual interface showing both consultant schedule and closer schedule
   - Manual closer assignment with tracking data captured for future ML

4. **Overbooking / placeholder slots**
   - Per-region placeholder slots that can hold extra appointments beyond normal capacity
   - Clear visual distinction for placeholder vs. confirmed appointments

5. **Salesforce integration (bidirectional)**
   - Read leads/opportunities from Salesforce
   - Create/update appointment records on custom Salesforce object
   - Sync appointment status changes in both directions
   - Track Design Expert field on opportunities

6. **Google Calendar sync (bidirectional)**
   - Push appointments to consultant and closer Google Calendars
   - Read Google Calendar to determine free/busy status
   - Free/busy logic: can book over "optional" meetings, cannot book over "mandatory" ones
   - Virtual meeting appointments auto-generate Google Meet link

7. **Automated reminders**
   - SMS and email reminders to customers for upcoming appointments
   - Notifications to consultants and Design Experts
   - Alert to consultant when their appointment status changes to "Confirmed"

8. **Mobile-responsive web app** for field reps
   - View daily/weekly schedule
   - See appointment details (customer, address, type, status, closer assignment)
   - Basic schedule management (mark complete, flag for reschedule)

9. **Booking links**
   - Individual booking links for all consultants and Design Experts (for email signatures)
   - Partner-specific booking links for Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics
   - Embeddable booking widget for venturehome.com
   - Booking link for Facebook page
   - Easy creation of new booking links
   - Partner booking shows availability without exposing specific rep names

10. **Rep management**
    - Add/remove/edit sales consultants and Design Experts
    - Set home zip code, territory coverage, position tier (Solar Consultant, Sr. Solar Consultant, Design Expert, Regional Sales Manager)
    - Time-off request system: approved requests block calendar availability

### Explicitly Out of Scope (v1)

- **Predictive intelligence / ML-based assignment suggestions** (Phase 2)
- **Route optimization and daily route suggestions** (Phase 3)
- **Traffic-aware and weather-aware scheduling adjustments** (Phase 3)
- **Auto-assignment of Design Experts** (Phase 2-4 progressive)
- **Performance dashboards** showing conversion rates by rep/territory/pairing (Phase 2)
- **Skill-level weighted appointment distribution** (Phase 2 — data collection starts in v1)
- **Smart overbooking** based on historical cancellation patterns (Phase 3)
- **Customer self-scheduling portal** (Phase 2)
- **Native mobile apps** (iOS/Android) — v1 is mobile-responsive web
- **Cross-regional auto-reassignment** (Phase 3)
- **Predictive show-rate / conversion scoring** (Phase 3+)

## Data Model

### Core Objects

**Appointment** *(maps to custom Salesforce object)*
- `id` — unique identifier
- `salesforce_id` — Salesforce record ID (confirmed: maps to custom object)
- `google_calendar_event_id` — Google Calendar event ID
- `appointment_type` — enum: `appointment`, `follow_up`, `contract_signing`, `change_order`, `cancel_save`
- `appointment_status` — enum: `scheduled`, `confirmed`, `completed`, `needs_reschedule`, `rescheduled`, `canceled`, `disqualified`
- `is_virtual` — boolean (if true, includes Google Meet link)
- `google_meet_link` — string, auto-generated for virtual appointments
- `scheduled_date` — date
- `scheduled_time` — enum: `9:00`, `11:30`, `14:00`, `17:00`, `19:00`
- `duration_minutes` — integer (default 90 for appointment/contract_signing, 60 for others)
- `customer_name` — string
- `customer_phone` — string (for SMS reminders)
- `customer_email` — string (for email reminders)
- `customer_address` — string
- `customer_zip_code` — string (critical for geographic assignment)
- `assigned_consultant_id` — FK to Consultant
- `assigned_design_expert_id` — FK to Consultant (nullable)
- `territory_id` — FK to Territory
- `lead_source` — string (from Salesforce: "paid", "self_gen", "get_the_referral", etc.)
- `lead_source_rollup` — string (from Salesforce, confirmed field name pattern)
- `opportunity_id` — Salesforce Opportunity ID
- `is_placeholder` — boolean (for overbooking slots)
- `confidence_score` — float (assignment optimization confidence, Phase 2+)
- `created_by` — FK to User (inside sales agent who scheduled)
- `created_at` — timestamp
- `updated_at` — timestamp

**Consultant** *(represents all outside sales team members)*
- `id` — unique identifier
- `salesforce_user_id` — Salesforce User ID
- `name` — string
- `position` — enum: `solar_consultant`, `sr_solar_consultant`, `design_expert`, `regional_sales_manager`
- `is_closer_only` — boolean (e.g., Boris Kaiser, Max McNamara)
- `is_virtual_only` — boolean (subset of closer_only: never assigned in-person appointments)
- `home_zip_code` — string
- `home_coordinates` — lat/lng (derived from zip)
- `territory_ids` — array of FK to Territory (many-to-many; some consultants cover multiple territories)
- `team` — string (territory code: NYE, NYW, CT, MARI, MENH, NJPA, MD)
- `skill_level` — integer (for weighted appointment distribution, Phase 2)
- `is_active` — boolean
- `google_calendar_id` — string
- `phone` — string (for notifications)
- `email` — string
- `booking_link_slug` — string (unique URL slug for personal booking link)

**Territory**
- `id` — unique identifier
- `code` — string: `NYE`, `NYW`, `CT`, `MARI`, `MENH`, `NJPA`, `MD`
- `name` — string: "New York East", "New York West", etc.
- `display_color` — hex color code
- `zip_codes` — array of strings (serviceable zips for this territory)
- `states` — array of strings

**ZipCodeCoverage** *(maps zip codes to territories and available consultants)*
- `zip_code` — string
- `territory_id` — FK to Territory
- `state` — string
- `coordinates` — lat/lng (for drive time calculations)

**TimeOffRequest**
- `id` — unique identifier
- `consultant_id` — FK to Consultant
- `start_date` — date
- `end_date` — date
- `status` — enum: `pending`, `approved`, `denied`
- `approved_by` — FK to User (manager)

**BookingLink**
- `id` — unique identifier
- `slug` — unique URL string
- `link_type` — enum: `consultant`, `design_expert`, `partner`, `website`, `facebook`
- `assigned_to` — string (consultant name or partner name)
- `territory_filter` — array of territory codes (optional, for partner links)
- `is_active` — boolean

**InsideSalesSquad** *(for reference/permissions)*
- `id` — unique identifier
- `name` — string ("Joseph's Squad", "Ben's Squad")
- `leader` — string
- `covered_territories` — array of territory codes
  - Joseph's Squad: NYE, NYW, MD, NJ
  - Ben's Squad: CT, MA, ME, NH, RI

### Key Relationships

- An Appointment belongs to one Consultant (the field rep) and optionally one Design Expert (virtual closer)
- A Consultant belongs to one or more Territories (e.g., Alastair Cornell covers NJ/PA/NY)
- A Territory contains many ZipCodes
- A ZipCode belongs to exactly one Territory
- An Appointment is linked to a Salesforce Opportunity via `opportunity_id`
- A Lead becomes an Opportunity when an Appointment is scheduled (Salesforce-side logic)
- For "get_the_referral" leads: the appointment should be assigned to the consultant who owns the referring customer's Opportunity → fallback to that Opportunity's Design Expert → fallback to geographic assignment

### Field Name Status

| Field | Status |
|-------|--------|
| `Design Expert` on Opportunity | ✅ Confirmed — exists in Salesforce |
| `Lead Source Rollup` = "paid" | ✅ Confirmed — user mentioned this exact term |
| `lead_source` values: "self_gen", "get_the_referral" | ✅ Confirmed — user described these |
| Custom appointment object in Salesforce | ⚠️ Confirmed to exist, but API name unknown |
| Appointment status field in Salesforce | ⚠️ Confirmed statuses exist, API field name unknown |
| Lead status tracking in Salesforce | ⚠️ Confirmed to exist, field names unknown |
| Opportunity stage/outcome fields | ⚠️ Assumed standard Salesforce opportunity stages |

## Fields & API Names to Confirm

Before going to production, the following must be confirmed against the actual Salesforce org:

- [ ] **Custom Appointment Object**: API name (e.g., `Appointment__c` or `Sales_Appointment__c`?)
- [ ] **Appointment Status field**: API name on the appointment object (e.g., `Status__c`?)
- [ ] **Appointment Type field**: API name (e.g., `Appointment_Type__c`?)
- [ ] **Design