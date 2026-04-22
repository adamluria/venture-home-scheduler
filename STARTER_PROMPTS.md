# Starter Prompts — venture-home-scheduler

Use these in order. Each one picks up where the last left off. Copy the prompt block, paste it, add any `[PASTE]` values, and go.

---

## New Contributor? Start Here
```
I'm joining an existing project. Read .auto-memory/MEMORY.md first (follow its links), then AGENTS.md, TODO.md, and docs/memory/ (newest first). Give me a status summary: what's done, what's in progress, what's blocked, and what I should work on next.
```

---

## Session 1: Repo Setup & First Deploy

### 1a — Initialize the repo
```
I have the project scaffold zip for venture-home-scheduler. Help me:
1. Extract it to ~/venture-home-scheduler
2. Run npm install
3. Copy .env.example to .env.local
4. Start the dev server with npm run dev
5. Verify it runs in the browser with mock data
6. Initialize git and make the first commit
7. Create a GitHub repo and push
Walk me through each step. Don't skip anything.
```

### 1b — GCP setup and first Cloud Run deploy
```
Now let's get this deployed to Cloud Run. First verify I have gcloud and docker installed (check with which). Then:
1. Create a GCP project (gcloud projects create)
2. Link a billing account — give me the console URL
3. Enable the required APIs (Cloud Run, Artifact Registry, Cloud Build, Storage)
4. Create the Artifact Registry repository for Docker images
5. Do the first Cloud Run deploy (use --update-env-vars, never --set-env-vars)
6. Verify it's live at the Cloud Run URL
7. Write the Cloud Run URL and GCP project ID to .auto-memory/reference_venture-home-scheduler.md
My project name is: venture-home-scheduler
Walk me through each step from ~/venture-home-scheduler. Don't skip anything.
```

---

## Session 2: Build the Core Prototype

### 2a — Build main views with mock data
```
Build the core prototype with mock data. Start with the main view and get it rendering with realistic mock data. Mock mode must continue to work after we wire up real data — don't let me lose the ability to demo without a live connection.

The key objects we're working with:
Appointment (time, type, status, location, assigned consultant, virtual closer), Consultant (name, position, home zip, territory coverage), Territory (state/region boundaries, zip code lists), Lead (source, zip code, qualification status), Opportunity (deal size, stage, outcomes, design expert field)
```

### 2b — Wire up remaining views and deploy
```
The main view is working. Now:
1. Build out the remaining views from our planning discussion
2. Make sure all views work with mock data
3. Deploy the prototype to Cloud Run
4. Write a memory file capturing decisions made and what was built
What's still on the list from Phase 2 in TODO.md?
```

---

## Session 3: Salesforce Connection

### 3a — Connected App and OAuth
```
Walk me through creating a Salesforce Connected App step by step:
1. Where to go in Salesforce Setup (App Manager → New Connected App)
2. What to name it
3. What OAuth settings to enable
4. What callback URLs to use — local dev (http://localhost:5173) and Cloud Run production URL
5. What OAuth scope to add (api)
6. Where to find the Consumer Key after creation
7. How to add it to .env.local and set it on Cloud Run
Don't skip any steps.
```

### 3b — Confirm field names from live org
```
I've connected to Salesforce and can run queries. Here's what I found about our data model:
- [PASTE: the API name of the key relationship field on the main object]
- [PASTE: confirm any custom field API names]
- [PASTE: the stage/status values that mean "completed" or "sold"]
- [PASTE: how to filter for the specific record type we care about]

Update all queries and data processors with the confirmed field names. Write every confirmed field name to today's memory file as [Tier 1] and update .auto-memory/ if this changes the data model.
```

### 3c — Test with live data and handle edge cases
```
We have confirmed field names. Now:
1. Run the main query against production data and show me a sample
2. Check for any data quality issues (missing fields, unexpected values, nulls)
3. Handle token expiry gracefully — auto-redirect to re-auth when the access token expires
4. Write everything confirmed to today's memory file
5. Commit and push
```

---

## Session 4: Google Calendar Integration

### 4a — Mock layer
```
Build a Google Calendar integration module. Start with a mock data layer that mirrors the exact shape of the real Google Calendar API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 4b — Live integration
```
I've added my Google Calendar credentials to .env.local. Now:
1. Replace the mock with real Google Calendar API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 5: SMS/email notifications Integration

### 5a — Mock layer
```
Build a SMS/email notifications integration module. Start with a mock data layer that mirrors the exact shape of the real SMS/email notifications API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 5b — Live integration
```
I've added my SMS/email notifications credentials to .env.local. Now:
1. Replace the mock with real SMS/email notifications API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 6: external partner booking APIs (Greenwatt Integration

### 6a — Mock layer
```
Build a external partner booking APIs (Greenwatt integration module. Start with a mock data layer that mirrors the exact shape of the real external partner booking APIs (Greenwatt API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 6b — Live integration
```
I've added my external partner booking APIs (Greenwatt credentials to .env.local. Now:
1. Replace the mock with real external partner booking APIs (Greenwatt API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 7: Verse Integration

### 7a — Mock layer
```
Build a Verse integration module. Start with a mock data layer that mirrors the exact shape of the real Verse API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 7b — Live integration
```
I've added my Verse credentials to .env.local. Now:
1. Replace the mock with real Verse API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 8: SunLink Integration

### 8a — Mock layer
```
Build a SunLink integration module. Start with a mock data layer that mirrors the exact shape of the real SunLink API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 8b — Live integration
```
I've added my SunLink credentials to .env.local. Now:
1. Replace the mock with real SunLink API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 9: Lo Mano Integration

### 9a — Mock layer
```
Build a Lo Mano integration module. Start with a mock data layer that mirrors the exact shape of the real Lo Mano API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 9b — Live integration
```
I've added my Lo Mano credentials to .env.local. Now:
1. Replace the mock with real Lo Mano API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 10: Remix Dynamics) Integration

### 10a — Mock layer
```
Build a Remix Dynamics) integration module. Start with a mock data layer that mirrors the exact shape of the real Remix Dynamics) API response. Wire it into the relevant views. Mock must work before we touch real credentials.
```

### 10b — Live integration
```
I've added my Remix Dynamics) credentials to .env.local. Now:
1. Replace the mock with real Remix Dynamics) API calls using the env vars
2. Handle auth and error cases (token expiry, rate limits, unexpected responses)
3. Confirm all field names and write them to memory as [Tier 1]
4. Test with live data end-to-end
5. Commit and write a memory file
```

---

## Session 11: MVP Features

### 11a — Scope the next feature
```
Read .auto-memory/MEMORY.md, TODO.md, and docs/memory/ (newest first). What's the highest-priority feature from Phase 4? Scope it as the pm agent — what data do we need, what API calls, what UI components, what agents are involved, and how long will it take?
```

### 11b — Build it
```
Let's build [FEATURE NAME]. Mock data first — I want to see it working in the browser before we wire up any real data. Commit at each logical checkpoint.
```

---

## Anytime Prompts

### Status check
```
Read .auto-memory/MEMORY.md (follow its links), then docs/memory/ (newest first) and TODO.md. What's done, in progress, and blocked? What would you recommend working on next?
```

### End session
```
Finalize today's memory file in docs/memory/. If any Tier 1 context changed this session (infra, architecture, field names), update the relevant .auto-memory/ files too. Update TODO.md with completed and new items, commit everything, and push to GitHub. What shipped this session?
```

### Scope an idea
```
Read .auto-memory/MEMORY.md and TODO.md first. I have an idea: [DESCRIBE]. Scope it as the pm agent — data needed, APIs, UI components, which agents are involved, effort estimate, and where it fits in the priority stack.
```

### Deploy
```
Deploy the current state to Cloud Run. First verify I have gcloud and docker installed (check with which). Walk me through each step from ~/venture-home-scheduler. Make sure env vars are set (use --update-env-vars, never --set-env-vars) and the service is healthy after deploy. Update .auto-memory/ with the live URL if this is a first deploy.
```

### Debug a problem
```
I'm seeing this issue: [DESCRIBE]. Read .auto-memory/MEMORY.md and relevant memory files, then diagnose the root cause, fix it, write what you found and fixed to today's memory file, and commit.
```

### Chat → Code cutover
```
I've been prototyping in chat and have a working artifact. Decompose the prototype into the proper project structure, set up local dev, and get it running. Don't rewrite from scratch — extract and refactor. Verify it runs with mock data before touching any real data connections.
```
