# venture-home-scheduler — AI Assistant Instructions

This file is read automatically by your AI tool (Claude Code, Cursor, Windsurf, Copilot, etc.).
Full detail is in AGENTS.md and PROJECT_INSTRUCTIONS.md.

## Start of every session — do this first, without being asked:
1. Read `.auto-memory/MEMORY.md` — canonical project index. Follow its links.
2. Read `AGENTS.md` — role definitions, memory system, session lifecycle
3. Read `docs/memory/` — newest first, prioritize Tier 1 entries
4. Read `TODO.md` and `PROJECT_INSTRUCTIONS.md` (if present)
5. Give the user a brief status summary before starting any work
6. If the request is ambiguous or multi-step → PM agent first. If trivial → fast path.

## During every session — update docs automatically:
When any of these happen, write to `docs/memory/YYYY-MM-DD.md` immediately:
- A field name, API name, or schema detail is confirmed → tag as `[Tier 1]`
- An architectural decision is made (include the reasoning)
- A bug is found and fixed (include: what it was, root cause, fix)
- An integration endpoint, auth method, or credential name is confirmed
- A business rule or threshold is agreed on (include the exact agreed value)
- Any infrastructure detail changes (URL, bucket name, branch, env var)

If it's a **Tier 1 fact** (infra, architecture, confirmed field name, deployment state), also update the relevant `.auto-memory/` file.

Do NOT ask the user to update the docs. Do it yourself the moment it's known.

## End of every session — do this before closing:
1. Finalize today's session file in `docs/memory/`
2. If any Tier 1 context changed, update relevant `.auto-memory/` files
3. Update `TODO.md` — check off completed items, add new ones
4. `git add -A && git commit -m "[what shipped]"`
5. Push to the current branch: `git push`
6. Tell the user what shipped

(Ultra-fast-path fixes can bundle into the next real commit — see AGENTS.md.)

## Project context:
- **Description**: Intelligent calendar and scheduling system for Venture Home's distributed sales teams across 9 states, featuring geographic optimization, predictive assignment, and seamless Salesforce integration.
- **Stack**: React (JSX), Vite + Cloud Run
- **Integrations**: Salesforce, Google Calendar, SMS/email notifications, external partner booking APIs (Greenwatt, Verse, SunLink, Lo Mano, Remix Dynamics)
- **Canonical memory**: `.auto-memory/MEMORY.md` — read first, trust first
- **Session memory**: `docs/memory/YYYY-MM-DD.md` — one per session day
- **Full instructions**: See AGENTS.md and PROJECT_INSTRUCTIONS.md

## Never:
- Ask the user to "update the memory file" — do it yourself
- Skip the session-start read — always read `.auto-memory/MEMORY.md` first
- Commit secrets or `.env.local` — it's in .gitignore for a reason
- Use `--set-env-vars` on Cloud Run — always use `--update-env-vars`
- Run `gcloud` or `docker` commands without first verifying the tool is installed

## Quick commands (run from repo root: `~/venture-home-scheduler`):
```bash
npm run dev                  # local dev server
docker build -t venture-home-scheduler .   # test Docker build locally
gcloud run deploy venture-home-scheduler --source . --region us-east1 --project YOUR_PROJECT
```
