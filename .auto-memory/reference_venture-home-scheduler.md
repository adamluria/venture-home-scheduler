---
name: venture-home-scheduler infrastructure
description: GCP project, Cloud Run URL, env vars, deploy commands
type: reference
---

## Infrastructure

- **GCP project**: TBD — set during Phase 1
- **Cloud Run URL**: TBD — set after first deploy
- **Region**: us-east1
- **GCS bucket**: TBD
- **GitHub repo**: TBD — set during Phase 1

## Environment Variables

See `.env.example` for the full list.

## Deploy Command

```bash
gcloud run deploy venture-home-scheduler --source . --region us-east1 --project [GCP_PROJECT_ID]
```

**Important**: Always use `--update-env-vars`, never `--set-env-vars` (the latter wipes all existing vars).
