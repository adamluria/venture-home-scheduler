# Project: venture-home-scheduler

## What This Is

Intelligent calendar and scheduling system for Venture Home's distributed sales teams across 9 states, featuring geographic optimization, predictive assignment, and seamless Salesforce integration.

Venture Home operates across 9 states with 42 sales reps covering territories from Maine to Maryland. Current scheduling is manual, geography-unaware, and creates inefficient drive times. The system needs to handle complex territory overlaps, virtual closer assignments, and external partner booking while learning from 2 years of historical performance data.


## Repo Setup

- **Local project directory**: `~/venture-home-scheduler` (extracted from scaffold zip or cloned from GitHub)
- **GitHub repo**: `[your-gh-org]/venture-home-scheduler`
- **Branch strategy**: `main` is production. Work on feature branches (`feature/[name]`) and merge via PR.

When asked to make changes, commit to the current working branch with clear commit messages. Push to GitHub when asked to "push" or "ship it."

## Tech Stack

- **Frontend**: React (JSX), Vite
- **Styling**: Inline styles with dark theme, JetBrains Mono for data, Outfit for UI text
- **Data Sources**: Salesforce for leads/opportunities, Google Calendar for availability, internal database for performance tracking
- **Integrations**: Salesforce, Google Calendar, SMS/email notifications, external partner booking APIs (Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics)


## Hosting & Deployment

- **Runtime**: Google Cloud Run (containerized, port 8080)
- **Static/File Storage**: Google Cloud Storage
- **Container Registry**: Google Artifact Registry
- **Region**: us-east1

### Key deployment rules:
- Cloud Run URL format: `https://venture-home-scheduler-HASH-ue.a.run.app`
- Environment variables are set via Cloud Run service configuration — never baked into the container
- `.env.local` is for local dev only — never deployed, never committed
- For server-side API calls, use the Cloud Run service URL as the base, not localhost
- Always test Docker builds locally before deploying: `docker build -t venture-home-scheduler . && docker run -p 8080:8080 venture-home-scheduler`

### Deployment Commands
All commands run from the repo root (`~/venture-home-scheduler`).

```bash
# Verify required tools first
which node && which npm && which git && which docker && which gcloud
# If any are missing, install before proceeding

# First-time GCP setup (run once)
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com storage.googleapis.com

# Create Artifact Registry repo (once)
gcloud artifacts repositories create venture-home-scheduler --repository-format=docker --location=us-east1

# Build and deploy
gcloud builds submit --tag us-east1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/venture-home-scheduler/venture-home-scheduler:latest .
gcloud run deploy venture-home-scheduler \
  --image us-east1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/venture-home-scheduler/venture-home-scheduler:latest \
  --region us-east1 --platform managed --allow-unauthenticated

# Update environment variables
gcloud run services update venture-home-scheduler --region us-east1 \
  --update-env-vars="KEY=value,KEY2=value2"
```

## Project Structure

```
venture-home-scheduler/
├── .auto-memory/
│   ├── MEMORY.md                  # Canonical index — read first every session
│   ├── reference_venture-home-scheduler.md       # Infra: GCP project, Cloud Run URL, env vars
│   └── project_venture-home-scheduler.md         # Tech stack, components, architecture decisions
├── src/
│   ├── main.jsx
│   ├── app.jsx
│   ├── components/                 # React (JSX), Vite components (.jsx)
│   ├── views/
│   ├── data/
│   ├── auth/
│   └── utils/
├── docs/
│   └── memory/
│       └── planning.md            # Bootstrap planning artifact from Ignition
├── PROJECT_INSTRUCTIONS.md
├── AGENTS.md
├── TODO.md
├── STARTER_PROMPTS.md
├── Dockerfile
├── .dockerignore
├── .gcloudignore
├── .env.example
├── .env.local                     # Local dev only — git-ignored
├── .gitignore
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

## Current State

✅ Main calendar dashboard with territory filtering,✅ Consultant assignment interface with territory awareness,✅ Appointment type and status color coding,✅ Mobile-responsive layout for field reps,✅ Mock data representing all 6 territories and 42 consultants

## Design

- **Theme**: Professional solar industry interface with amber accents, efficient data-dense layouts
- **Fonts**: JetBrains Mono for data/numbers, Outfit for UI text

- **Visual rules**: Appointment types have distinct colors, territory filtering with clear visual separation, mobile-first responsive design

## Data Model

### Objects
Appointment (time, type, status, location, assigned consultant, virtual closer), Consultant (name, position, home zip, territory coverage), Territory (state/region boundaries, zip code lists), Lead (source, zip code, qualification status), Opportunity (deal size, stage, outcomes, design expert field)

### Relationships
Appointment belongs to Consultant and optionally Design Expert. Lead has zip code which maps to Territory coverage areas. Opportunity connects to Appointment through Salesforce event system. Consultant coverage areas overlap (e.g. Alastair covers NJ/PA/NY).

### Fields to Confirm Before Going Live
Exact Salesforce API field names for appointment tracking,Current appointment object structure in Salesforce,Google Calendar integration auth scope requirements,Traffic/mapping API preferences and rate limits,External partner webhook formats for booking confirmations

### Known Data Issues
Territory coverage has complex overlaps - some consultants cover multiple states while others focus on single regions. 'Closer only' vs 'virtual only' vs full consultants need different scheduling rules. Some zip codes appear in multiple consultant territories requiring intelligent assignment logic.

## Architecture Notes

Phase 1: React frontend with mock intelligence for assignment suggestions. Phase 2: Node.js backend with PostgreSQL for performance tracking and ML training data. Phase 3: Integration with mapping APIs for route optimization. Eventually may integrate into larger Canopy platform as scheduling module.


## Multi-User Collaboration

These docs are **AI-agnostic** — they work with Claude, GPT, Gemini, Copilot, or any LLM.
- **Team**: small team


## How to Work in This Project

1. **Read in this order every session**: `.auto-memory/MEMORY.md` (follow its links) → `AGENTS.md` → `docs/memory/` (newest first) → `TODO.md` and this file. The project spec is distributed across these files — no single file has the complete picture. Give a brief status summary before starting work.

2. **Follow AGENTS.md.** It defines agent roles, the memory system (tiers, auto-memory, golden snapshots), and session lifecycle. Read it and follow it.

3. **Keep mock data working at all times.** Every feature must be testable with mock/demo data before live data is wired up. The mock mode should always work.

4. **Field names and API names are placeholders until confirmed.** Keep them as configurable constants. When a field name is confirmed, update the constant, write it to today's session file in `docs/memory/` as `[Tier 1]`, and update `.auto-memory/project_venture-home-scheduler.md`.

5. **Design rules are not suggestions.** Appointment types have distinct colors, territory filtering with clear visual separation, mobile-first responsive design

6. **Ambiguous or multi-step work goes through the PM agent first.** When a feature is described in business terms, scope it before building: data source needed, API calls required, UI components to build, which agents are involved, and what goes in TODO.md as follow-up. See AGENTS.md → Fast Path for when to skip PM.

7. **Write to memory incrementally.** The moment a field name is confirmed, a decision is made, or a bug is fixed — write it to today's session file in `docs/memory/YYYY-MM-DD.md`. If it's a Tier 1 fact (infra, architecture, confirmed field name, deployment state), also update the relevant `.auto-memory/` file. See AGENTS.md → Memory System for the full rules.

8. **Commit often in small chunks.** After each logical unit of work (a component, a data integration, a view), commit with a descriptive message.

9. **Memory files and TODO.md are committed to GitHub.** They are project artifacts, not ephemeral notes. Every session should end with a commit and push that includes updated memory and TODO files.

10. **End every session the same way.** Finalize today's session file in `docs/memory/`. If any Tier 1 context changed, update the relevant `.auto-memory/` files. Update TODO.md, commit everything, push to GitHub, confirm what was shipped. (Ultra-fast-path fixes can bundle into the next real commit — see AGENTS.md.)

11. **Cloud Run deploys**: test locally in Docker first. `docker build -t venture-home-scheduler . && docker run -p 8080:8080 venture-home-scheduler`

12. **Environment variables**: `.env.local` for local dev. Set production vars via `gcloud run services update --update-env-vars` (never `--set-env-vars` — it wipes all existing vars). Never commit secrets.

## Reference Data

[object Object]
