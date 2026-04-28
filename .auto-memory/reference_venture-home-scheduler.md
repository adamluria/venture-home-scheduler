---
name: venture-home-scheduler infrastructure
description: GCP project, Cloud Run URL, env vars, deploy commands
type: reference
---

## Infrastructure

- **GCP project ID**: `venture-home-scheduler` (project number `9110064509`) — confirmed 2026-04-28
- **Cloud Run URL**: `https://venture-home-scheduler-9110064509.us-east1.run.app`
- **Region**: `us-east1`
- **GCS bucket**: TBD
- **GitHub repo**: `https://github.com/adamluria/venture-home-scheduler` — branch `main`

## Environment Variables

See `.env.example` for the full list. Production values live as Cloud Run env vars; never commit `.env.local`.

## Deploy Command

```bash
# One-time: set project as default
gcloud config set project venture-home-scheduler

# Deploy
gcloud run deploy venture-home-scheduler --source . --region us-east1
```

**Important**: When updating env vars, always use `--update-env-vars`, never `--set-env-vars` (the latter wipes all existing vars).
