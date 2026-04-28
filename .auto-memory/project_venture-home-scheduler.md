---
name: venture-home-scheduler project context
description: Tech stack, component map, architecture decisions, current state
type: project
---

## Tech Stack

- **Frontend**: React (JSX), Vite
- **Styling**: Inline styles with dark theme, JetBrains Mono for data, Outfit for UI text
- **Hosting**: Google Cloud Run
- **Storage**: Google Cloud Storage
- **Integrations**: Salesforce, Google Calendar, SMS/email notifications, external partner booking APIs (Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics)

## Architecture Decisions

- **Salesforce Lead → appointment form mapping** (2026-04-28): Single source of truth lives in `src/data/leadMapper.js` (`leadToFormValues`). Both the in-app `LeadPicker` and the existing `#/schedule?lead=...` deep-link path should funnel through this helper. Mapping rules: `customer ← FirstName + ' ' + LastName`; `phone ← MobilePhone || Phone`; `address ← "Street, City, State"` (comma-joined to keep `parseAddressPart` working); `leadSource` only carried if it matches `LEAD_SOURCES` whitelist.
- **Lead search via SOSL, not LIKE** (2026-04-28): `/api/sfdc/search?name=` uses SOSL `FIND {term*} IN NAME FIELDS` to span Lead+Contact in one indexed call. Tradeoff is indexing lag (~minutes for new Leads). Phone/email branches stay on exact-match SOQL.
- **Existing SF button URL contract is canonical** (2026-04-28): The `#/schedule?lead=...&name=...&phone=...&...` deep-link defined in `docs/salesforce-lead-button-setup.md` is treated as a stable contract. New code augments (picker, visible Phone/Email fields) but never breaks it.
- **Customer interaction history matched by phone (last 10 digits)** (2026-04-28): `/api/sfdc/customer-history?phone=X` uses SOSL `IN PHONE FIELDS` to find Leads + Contacts, then 4 parallel SOQL queries fetch Opps/Tasks/Events/ContentDocumentLinks. Each sub-query is try/catch'd individually so a missing read permission doesn't kill the whole response. Renders inline in `LeadPicker` via expand-chevron, no separate page.
- **Per-rep Salesforce auth via session cookie** (2026-04-28): `sfdcAuth.js` replaces `app.locals.sfdc` shared-token with per-session storage keyed by an HTTP-only cookie (`vhs_sfdc_session`, 7-day TTL). Each rep authenticates separately via SF OAuth; their tokens stay isolated. In-memory `Map` for now; designed as a single-line swap to Firestore for production multi-instance Cloud Run. `sfdcFetch(req, url, options)` is the auth-aware fetch wrapper that auto-refreshes on 401 and retries once.
- **Cloud Run `--max-instances 1` constraint** (2026-04-28): required until the Firestore swap, because the in-memory session store doesn't survive multi-instance scaling. Documented in `docs/salesforce-sandbox-setup.md` §2.3.

## Component Map

- `src/components/NewAppointmentModal.jsx` — primary appointment-creation form; consumes `leadToFormValues` and `LeadPicker`.
- `src/components/LeadPicker.jsx` (2026-04-28) — debounced SF Lead/Contact picker; routes query to `?phone=` / `?email=` / `?name=`.
- `src/data/leadMapper.js` (2026-04-28) — Lead/Contact → form-shape mapping helper.
- `src/data/leadSources.js` — 495-value Lead Source picklist used by `SearchableSelect`.
- `server.js` — Express. SF endpoints under `/api/sfdc/*`. Key routes: `/lead/:id`, `/lead/:id/convert`, `/search?name|phone|email`, `/appointment` (POST/PATCH/DELETE), `/performance/*`, `/opportunity/:id`.

## Current State

In active iteration. Recent work: VH wordmark, searchable Lead Source picklist, Salesforce Lead/Contact lookup in appointment form (picker + mapping helper).
