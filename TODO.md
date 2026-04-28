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
---

## Known Challenges & Open Questions

90-minute drive radius calculations require real-time traffic data. Overbooking strategy needs smart cancellation prediction. Multi-state consultant assignments create complex territory logic. Historical Salesforce data extraction for ML training may require custom ETL process.

---

## Brainstorm Notes
User is building an intelligent scheduling system for Venture Home's 42-person distributed sales team across 9 states. The MVP focuses on geography-aware appointment scheduling with territory optimization and Salesforce integration. Key challenge is replacing manual scheduling with smart automation while handling complex territory overlaps, virtual closer assignments, and external partner booking. System will learn from 2 years of historical performance data to optimize consultant/closer pairings and predict optimal assignments. Future phases include route optimization, traffic awareness, and full predictive auto-scheduling.

---

## Reference Data

[object Object]
