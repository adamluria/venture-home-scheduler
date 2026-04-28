# Salesforce Partial Copy → Scheduler — One-Page Quickstart

The 5 steps to connect the scheduler to your Partial Copy sandbox. Full detail in `salesforce-sandbox-setup.md`; this is the short version.

---

## Partial-Copy-specific gotchas (read first)

| Thing | Value |
|---|---|
| **OAuth login URL** | `https://test.salesforce.com` (same as any sandbox) |
| **Your sandbox username** | `<prod username>.<sandbox name>` — e.g. `adam@venturehome.com.partcopy` |
| **Sandbox instance URL** | `https://<your-domain>--<sandbox name>.sandbox.my.salesforce.com` (you'll see it after login) |
| **Connected App location** | Must exist **in the sandbox**. If your sandbox was refreshed *after* the prod app was created, it's already there. If created standalone, build it in the sandbox. |
| **Data** | Partial Copy contains sampled real Leads/Accounts/Contacts/Opps — the LeadPicker and customer-history features will find real records. |

---

## Step 1 — Connected App (in the sandbox)

1. Log in at https://test.salesforce.com with `<your prod username>.partcopy`
2. **Setup → App Manager → New Connected App**
3. Settings:
   - Name: `VH Scheduler`
   - Enable OAuth: yes
   - Callback URL: `https://venture-home-scheduler-9110064509.us-east1.run.app/auth/salesforce/callback`
   - Scopes: `api`, `refresh_token, offline_access`, `id, profile, email`
4. Save → wait 5–10 min → click **View** → copy **Consumer Key** and **Consumer Secret**
5. Click **Manage → Edit Policies**:
   - Permitted Users: `Admin approved users are pre-authorized`
   - IP Relaxation: `Relax IP restrictions`
   - Refresh Token Policy: `valid until revoked`

## Step 2 — Custom Object: `Appointment__c`

Create with all 19 fields exactly as listed in `docs/salesforce-sandbox-setup.md` §1.3. The API names must match what `server.js` POSTs.

## Step 3 — Permission Set

**Setup → Permission Sets → New** → name `VH Scheduler Access`. Object access:

| Object | Permissions |
|---|---|
| Lead | Read, Edit, Convert |
| Contact, Account | Read |
| Opportunity | Read, Edit |
| Task, Event | Read, Create, Edit |
| ContentNote, Note | Read |
| Appointment__c | Read, Create, Edit, Delete |

System: `API Enabled`, `Manage Files`. Then **Manage Assignments** → assign to yourself + any rep who'll test.

## Step 4 — Cloud Run env vars

Run from anywhere with gcloud auth:

```bash
# Store the secret
echo -n "<consumer secret from Step 1>" | gcloud secrets create sf-client-secret \
  --data-file=- --project venture-home-scheduler

# Wire env vars + the secret
gcloud run services update venture-home-scheduler \
  --region us-east1 --project venture-home-scheduler \
  --max-instances 1 \
  --update-env-vars \
SF_CLIENT_ID=<consumer key from Step 1>,\
SF_LOGIN_URL=https://test.salesforce.com,\
SF_REDIRECT_URI=https://venture-home-scheduler-9110064509.us-east1.run.app/auth/salesforce/callback,\
USE_MOCK=false,\
NODE_ENV=production \
  --update-secrets SF_CLIENT_SECRET=sf-client-secret:latest
```

The `--max-instances 1` flag is required for now (the in-memory token store doesn't survive multi-instance scaling — see §2.3 of the full setup doc).

## Step 5 — Smoke test

1. Open https://venture-home-scheduler-9110064509.us-east1.run.app
2. Click **Connect Salesforce** in the banner near the top of the dashboard
3. Log in to the sandbox with your `.partcopy` username
4. Banner becomes a green pill: `Salesforce: <your email>`
5. Click **New Appointment** → in **Lookup Customer in Salesforce**, type a name from the sandbox → matching Leads appear
6. Click ▾ chevron next to a result → customer history loads inline (prior leads, opps, calls, notes)
7. Click result body → form prefills → pick date/time → **Schedule**
8. In the sandbox, find the new `Appointment__c` record (its `External_Id__c` matches the scheduler's id)

## When it doesn't work

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | Connected App callback URL ≠ `SF_REDIRECT_URI`. Both must be character-identical, no trailing slash. |
| `invalid_grant` | Wait 5–10 min after saving the Connected App. SF needs propagation time. |
| Banner stays unauthed after redirect | Cookie blocked. Check browser console for `Set-Cookie` warnings; sandbox + prod are different origins. |
| Every API call returns 401 | Permission set not assigned, OR user lacks `API Enabled`. Check **Setup → Users → Your user → Permission Set Assignments**. |
| `Appointment__c` create fails | Field API name typo. Compare to `docs/salesforce-sandbox-setup.md` §1.3 line by line. |

Logs: `gcloud run services logs read venture-home-scheduler --region us-east1 --limit 100`

---

When the partial-copy flow is solid, repeat Steps 1–3 in production (separate Connected App + Consumer Key/Secret), swap `SF_LOGIN_URL` to `https://login.salesforce.com`, redeploy. Reps re-click "Connect Salesforce" once on the prod URL and you're live.
