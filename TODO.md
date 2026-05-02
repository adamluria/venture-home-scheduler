# TODO — venture-home-scheduler

## Project Summary

Intelligent calendar and scheduling system for Venture Home's distributed sales teams across 9 states, featuring geographic optimization, predictive assignment, and seamless Salesforce integration.

Venture Home operates across 9 states with 42 sales reps covering territories from Maine to Maryland. Current scheduling is manual, geography-unaware, and creates inefficient drive times. The system needs to handle complex territory overlaps, virtual closer assignments, and external partner booking while learning from 2 years of historical performance data.


## Release Strategy
**MVP → Iterative releases**
- MVP: Core scheduling interface with territory-based assignment, basic overbooking placeholders, mobile-responsive calendar views, and Salesforce sync for appointments. Manual closer assignment with tracking.
- Success: Inside sales can schedule appointments with one click. Drive times stay under 90min from home, 60min between consecutive appointments. Integration eliminates double-booking across Google Cal/Salesforce.

---

## Data Model

### Objects
Appointment (time, type, status, location, assigned consultant, virtual closer), Consultant (name, position, home zip, territory coverage), Territory (state/region boundaries, zip code lists), Lead (source, zip code, qualification status), Opportunity (deal size, stage, outcomes, design expert field)

### Relationships
Appointment belongs to Consultant and optionally Design Expert. Lead has zip code which maps to Territory coverage areas. Opportunity connects to Appointment through Salesforce event system. Consultant coverage areas overlap (e.g. Alastair covers NJ/PA/NY).

### Fields & API Names to Confirm
These must be confirmed before going to production. Each confirmed value should be written to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`, updated in `.auto-memory/project_venture-home-scheduler.md`, and updated in code as a named constant.

Exact Salesforce API field names for appointment tracking,Current appointment object structure in Salesforce,Google Calendar integration auth scope requirements,Traffic/mapping API preferences and rate limits,External partner webhook formats for booking confirmations

### Known Data Issues
Territory coverage has complex overlaps - some consultants cover multiple states while others focus on single regions. 'Closer only' vs 'virtual only' vs full consultants need different scheduling rules. Some zip codes appear in multiple consultant territories requiring intelligent assignment logic.

---

## Phase 0: Planning ✅
- [x] Brainstorm and discovery conversation
- [x] Scope and release strategy defined
- [x] Project docs generated
- [x] Planning memory file created

## Phase 1: Setup

### Tool Verification (run these first)
- [ ] Verify Node.js: `node --version` (requires v18+)
- [ ] Verify npm: `npm --version`
- [ ] Verify git: `git --version`
- [ ] Verify Docker: `docker --version`
- [ ] Verify gcloud: `gcloud --version` (install from https://cloud.google.com/sdk/docs/install if missing)

### Project Initialization
- [ ] Extract scaffold zip to `~/venture-home-scheduler`
- [ ] `cd ~/venture-home-scheduler && npm install`
- [ ] Copy `.env.example` → `.env.local` and fill in values
- [ ] Verify local dev server: `npm run dev`
- [ ] Initialize git: `git init && git add -A && git commit -m "initial scaffold from Ignition"`
- [ ] Create GitHub repo and push: `gh repo create venture-home-scheduler --source . --push`
- [ ] Set up `.auto-memory/` directory and `MEMORY.md` index
- [ ] Update `.auto-memory/reference_venture-home-scheduler.md` with GitHub URL

### GCP & Cloud Run
- [ ] Test Docker build: `docker build -t venture-home-scheduler . && docker run -p 8080:8080 venture-home-scheduler`
- [ ] Create GCP project: `gcloud projects create venture-home-scheduler --name="venture-home-scheduler"`
- [ ] Link billing: https://console.cloud.google.com/billing/linkedaccount?project=venture-home-scheduler
- [ ] Enable APIs: `gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com storage.googleapis.com`
- [ ] Create Artifact Registry: `gcloud artifacts repositories create venture-home-scheduler --repository-format=docker --location=us-east1`
- [ ] First Cloud Run deploy (use `--update-env-vars`, never `--set-env-vars`)
- [ ] Update `.auto-memory/reference_venture-home-scheduler.md` with Cloud Run URL + GCP project ID
- [ ] Write first session file: `docs/memory/YYYY-MM-DD.md`

### Salesforce Setup
- [ ] Go to Salesforce Setup → App Manager → New Connected App
- [ ] Enable OAuth settings; set callback URL to `http://localhost:5173` (dev) and your Cloud Run URL (prod)
- [ ] Add OAuth scope: `api`
- [ ] Copy the Consumer Key → goes into `SF_CLIENT_ID` in `.env.local`
- [ ] Confirm field names (see Data Model → Fields to Confirm above)
- [ ] Update SOQL queries with confirmed field names
- [ ] **Create `Appointment__c` in sandbox** per `docs/salesforce-sandbox-setup.md` §1.3 — mark `Status__c` as **Restricted Picklist** so writes outside the canonical 6 values hard-fail (canonical set + rationale: see `docs/memory/2026-05-01.md`)
- [ ] Smoke-test `/api/sfdc/appointment` POST + PATCH end-to-end once object exists
- [ ] Test OAuth flow against sandbox, then production org
- [ ] Write confirmed field names to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]` and update `.auto-memory/project_venture-home-scheduler.md`

### Google Calendar Setup
- [ ] Obtain API credentials for Google Calendar
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### SMS/email notifications Setup
- [ ] Obtain API credentials for SMS/email notifications
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### external partner booking APIs (Greenwatt Setup
- [ ] Obtain API credentials for external partner booking APIs (Greenwatt
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### Verse Setup
- [ ] Obtain API credentials for Verse
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### SunLink Setup
- [ ] Obtain API credentials for SunLink
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### Lo Mano Setup
- [ ] Obtain API credentials for Lo Mano
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

### Remix Dynamics) Setup
- [ ] Obtain API credentials for Remix Dynamics)
- [ ] Add to `.env.example` as placeholder + `.env.local` with real values
- [ ] Build mock data layer that mirrors the real API response shape
- [ ] Implement real API calls after mock is working
- [ ] Write confirmed endpoints and auth details to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]`

## Phase 2: Prototype
- [ ] Build core UI with mock data
- [ ] Implement main views and interactions
- [ ] Verify mock mode works end-to-end
- [ ] Deploy prototype to Cloud Run for review

### What the prototype already covers:
✅ Main calendar dashboard with territory filtering,✅ Consultant assignment interface with territory awareness,✅ Appointment type and status color coding,✅ Mobile-responsive layout for field reps,✅ Mock data representing all 6 territories and 42 consultants


## Phase 3: Live Data
- [ ] Confirm all field names and API names — write each to `docs/memory/YYYY-MM-DD.md` as `[Tier 1]` and update `.auto-memory/project_venture-home-scheduler.md`
- [ ] Connect Salesforce integration
- [ ] Connect Google Calendar integration
- [ ] Connect SMS/email notifications integration
- [ ] Connect external partner booking APIs (Greenwatt integration
- [ ] Connect Verse integration
- [ ] Connect SunLink integration
- [ ] Connect Lo Mano integration
- [ ] Connect Remix Dynamics) integration
- [ ] Set production env vars on Cloud Run (`--update-env-vars`, never `--set-env-vars`)
- [ ] Run with live data end-to-end
- [ ] Verify in production

## Phase 4: MVP Features
- [ ] Core scheduling interface with territory-based assignment, basic overbooking placeholders, mobile-responsive calendar views, and Salesforce sync for appointments. Manual closer assignment with tracking.

## Phase 5: MVP Deploy
- [ ] All env vars confirmed on Cloud Run
- [ ] Tested with real users in production
- [ ] Memory finalized, TODO updated
- [ ] Ship

## Phase 6+: Post-MVP
- [ ] Phase 2: Predictive consultant/closer pairing based on historical performance. Phase 3: Route optimization and traffic-aware scheduling. Phase 4: Full auto-assignment with machine learning intelligence.

## Next Session: Smart Assignment Integration

**Status as of 2026-04-28 EOD:** OAuth + Lead picker + customer-history all working end-to-end against partial-copy sandbox (revision 00024). Smart Assignment is the next layer: replace static rep ranking heuristics with real SF data, surface the reasoning to reps. The work below splits into 4 independent slices — pick whichever has the most leverage when picking up.

### Slice C — Audit Auto-Assign (start here, smallest, highest leverage)
Goal: confirm the form's `Auto-assign (recommended)` option actually uses `rankRepsForSlot`, not "first alphabetical with no calendar conflict."
- [ ] Open `src/components/NewAppointmentModal.jsx` → find `handleSubmit` → trace what happens when `form.consultant === ''`
- [ ] Trace into `commitAppointment` in `src/app.jsx` and any auto-assign helper
- [ ] If it doesn't call `rankRepsForSlot` from `src/data/slotSuggestionEngine.js`, wire it up: when consultant is empty, await `rankRepsForSlot({ date, slot, territory, leadSource, ... })` and take `[0].repId`
- [ ] Smoke test: create an appointment with consultant blank, verify it picks a sensible rep
**Estimate:** 20-40 min

### Slice B — "Best for {leadSource}" badge in the rep dropdown
Goal: when the user picks a rep manually, surface which reps over-index on the current lead source.
- [ ] In `NewAppointmentModal.jsx`, the **Assign Consultant** dropdown maps `availableConsultants` → option labels. Replace the simple label with a label + small badge.
- [ ] Compute synergy: `getRepCloseRate(rep.id, { leadSource: form.leadSource }) / getRepCloseRate(rep.id, { leadSource: null })`. If ratio > 1.05, mark with `★ Best for {leadSource}`.
- [ ] Source: `src/data/repPerformance.js` exports `getRepCloseRate`.
- [ ] Optional: re-sort the dropdown so high-synergy reps float to top of the territory's available list.
**Estimate:** 30-60 min

### Slice A — Wire real SF performance into the engine
Goal: replace `repPerformance.js`'s synthetic-jitter close rates with real data from SF.
- [ ] `server.js` already has `GET /api/sfdc/performance/by-source` (~line 466). Hit it once locally to inspect the actual response shape.
- [ ] Add a fetcher in `src/data/repPerformance.js`: module-scoped Promise cached for 10 min, called lazily on first `getRepSourceStats` call.
- [ ] Modify `getRepSourceStats(repId, leadSource)` to return real data when available (keyed by `(repId, leadSource)` or by aggregate SF user id), fall back to current synthetic when missing.
- [ ] Verify: after auth, the rep ranking should reflect real Q4 performance numbers, not deterministic-but-fake numbers.
**Estimate:** 60 min

### Slice D — Port the standalone Smart Assignment view
Source: `github.com/CSVenture1/venture-home-sales-intelligence` → `src/app.jsx` lines 1242-1539 → `AppointmentAssignmentView` (~300 lines: customer cards, time slot grid, ranked rep recommendations with reason strings).
- [ ] Clone fresh: `git clone --depth=1 https://github.com/CSVenture1/venture-home-sales-intelligence.git /tmp/vhsi-fresh`
- [ ] Create `src/components/SmartAssignmentView.jsx`. Port the JSX, adapt the inline `T = {...}` constants to import from `src/data/theme.js`.
- [ ] Replace mock data: `INSIDE_REPS`, `OUTSIDE_REPS`, `LEAD_SOURCES` → consume from our `mockData.js` consultants and `leadSources.js`.
- [ ] Replace `generateRepsBySource` synthetic helper with real `getRepSourceStats` + `getRepCloseRate` calls.
- [ ] Add to view router in `src/app.jsx` (alongside DayView/WeekView/MonthView/etc) under a new view mode like `viewMode === 'smart'`.
- [ ] Add a tab/button to `CalendarNav` (or wherever views are switched).
**Estimate:** 60-90 min

### Done criteria for the whole feature
A rep can: open New Appointment, the consultant dropdown shows ranked reps with "Best for {source}" badges, "Auto-assign (recommended)" picks the top-ranked rep based on real SF performance data + territory + slot + lead source, and there's a separate "Smart Assignments" view showing all open customer slots with rep recommendations.

### Out of scope for this work
- Other three views in sister repo (Lead Sources, Rep Performance, Market Overview) — management dashboards, separate work.
- Salesforce `Appointment__c` custom object setup — required only for SF write-back, independent of this work. See `docs/salesforce-sandbox-setup.md` §1.3.

---

## Known Challenges & Open Questions

90-minute drive radius calculations require real-time traffic data. Overbooking strategy needs smart cancellation prediction. Multi-state consultant assignments create complex territory logic. Historical Salesforce data extraction for ML training may require custom ETL process.

---

## Brainstorm Notes
User is building an intelligent scheduling system for Venture Home's 42-person distributed sales team across 9 states. The MVP focuses on geography-aware appointment scheduling with territory optimization and Salesforce integration. Key challenge is replacing manual scheduling with smart automation while handling complex territory overlaps, virtual closer assignments, and external partner booking. System will learn from 2 years of historical performance data to optimize consultant/closer pairings and predict optimal assignments. Future phases include route optimization, traffic awareness, and full predictive auto-scheduling.

---

## Reference Data

[object Object]
