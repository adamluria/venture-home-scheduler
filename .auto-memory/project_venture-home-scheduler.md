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

## Component Map

- `src/components/NewAppointmentModal.jsx` — primary appointment-creation form; consumes `leadToFormValues` and `LeadPicker`.
- `src/components/LeadPicker.jsx` (2026-04-28) — debounced SF Lead/Contact picker; routes query to `?phone=` / `?email=` / `?name=`.
- `src/data/leadMapper.js` (2026-04-28) — Lead/Contact → form-shape mapping helper.
- `src/data/leadSources.js` — 495-value Lead Source picklist used by `SearchableSelect`.
- `server.js` — Express. SF endpoints under `/api/sfdc/*`. Key routes: `/lead/:id`, `/lead/:id/convert`, `/search?name|phone|email`, `/appointment` (POST/PATCH/DELETE), `/performance/*`, `/opportunity/:id`.

## Current State

In active iteration. Recent work: VH wordmark, searchable Lead Source picklist, Salesforce Lead/Contact lookup in appointment form (picker + mapping helper).
