# Salesforce Sandbox → Production Connection Guide

This is the step-by-step checklist for wiring the scheduler up to a real Salesforce org. Do **all of this in your sandbox first**, prove the flow works end-to-end, then repeat in production.

---

## Phase 1 — Salesforce admin work (in your sandbox)

### 1.1 Create a Connected App

1. **Setup → App Manager → New Connected App**
2. Fill in:
   - **Connected App Name**: `VH Scheduler` (or `VH Scheduler Sandbox`)
   - **API Name**: `VH_Scheduler`
   - **Contact Email**: your email
3. Check **Enable OAuth Settings**
4. **Callback URL** (sandbox version):
   ```
   https://venture-home-scheduler-9110064509.us-east1.run.app/auth/salesforce/callback
   ```
   (For production, you'll add the prod Cloud Run URL too — add both, one per line, when you're ready to flip to prod.)
5. **Selected OAuth Scopes** — add these three:
   - `Manage user data via APIs (api)`
   - `Perform requests at any time (refresh_token, offline_access)`
   - `Access the identity URL service (id, profile, email, address, phone)`
6. **Require Secret for Web Server Flow**: yes (default)
7. **Require Secret for Refresh Token Flow**: yes (default)
8. **Save** → wait **2–10 minutes** for SF to propagate the new connected app
9. Open the app from App Manager → **View** → grab:
   - **Consumer Key** → this is `SF_CLIENT_ID`
   - **Consumer Secret** (click "Click to reveal") → this is `SF_CLIENT_SECRET`

### 1.2 Set Connected App policies

Same Connected App → **Manage** → **Edit Policies**:

- **Permitted Users**: `Admin approved users are pre-authorized` (recommended) or `All users may self-authorize` (looser, fine for sandbox)
- **IP Relaxation**: `Relax IP restrictions` (Cloud Run IPs aren't fixed)
- **Refresh Token Policy**: `Refresh token is valid until revoked` (so the scheduler stays connected long-term)

### 1.3 Create the `Appointment__c` custom object

1. **Setup → Object Manager → Create → Custom Object**
2. Fill in:
   - **Label**: `Appointment`
   - **Plural**: `Appointments`
   - **API Name**: `Appointment__c`
   - **Record Name**: `Appointment Number` (Auto Number, format `APT-{0000}`)
3. Save.
4. Add these fields exactly (the API names must match what `server.js` POSTs):

   | Field Label | API Name | Type | Required | Notes |
   |---|---|---|---|---|
   | Opportunity | `Opportunity__c` | Lookup(Opportunity) | No | nullable |
   | Lead | `Lead__c` | Lookup(Lead) | No | nullable |
   | Customer Name | `Customer_Name__c` | Text(255) | Yes | |
   | Customer Address | `Customer_Address__c` | Text(255) | No | |
   | Customer Zip | `Customer_Zip__c` | Text(20) | No | |
   | Customer Phone | `Customer_Phone__c` | Phone | No | |
   | Customer Email | `Customer_Email__c` | Email | No | |
   | Scheduled Date | `Scheduled_Date__c` | Date | Yes | |
   | Scheduled Time | `Scheduled_Time__c` | Text(20) | Yes | e.g. "2:00 PM" |
   | Status | `Status__c` | Picklist | Yes | values: Scheduled, Confirmed, Completed, Cancelled, No-Show |
   | Type | `Type__c` | Picklist | Yes | values: Appointment, Follow-up, Closer-only |
   | Assigned Consultant | `Assigned_Consultant__c` | Text(50) | No | scheduler's internal rep id |
   | Assigned Design Expert | `Assigned_Design_Expert__c` | Text(50) | No | scheduler's internal closer id |
   | Is Virtual | `Is_Virtual__c` | Checkbox | No | default false |
   | Lead Source | `Lead_Source__c` | Text(255) | No | |
   | Territory | `Territory__c` | Text(20) | No | NYW / NJPA / NYE / CT / MARI / MENH / MD |
   | TSRF | `TSRF__c` | Number(5,2) | No | nullable |
   | Cancel Reason | `Cancel_Reason__c` | Text(255) | No | for cancelled/no-show records |
   | External Id | `External_Id__c` | Text(50) | No | **mark as External Id and Unique** — used for dedup |

5. Add `Appointment__c` to the page layout you'll use.

### 1.4 Permission Set

Easier to grant a permission set than edit a profile. Create one:

1. **Setup → Permission Sets → New**
2. **Label**: `VH Scheduler Access`
3. After saving, edit:
   - **Object Settings**:
     - `Lead`: Read, Edit, Convert
     - `Contact`: Read
     - `Account`: Read
     - `Opportunity`: Read, Edit
     - `Task`: Read, Create, Edit
     - `Event`: Read
     - `ContentNote`: Read
     - `Note`: Read (legacy notes)
     - `Appointment__c`: Read, Create, Edit, Delete (full CRUD on the custom object)
   - **System Permissions**:
     - `API Enabled`
     - `Manage Files`
4. **Manage Assignments** → assign the permission set to every rep who'll use the scheduler.

### 1.5 (Optional but recommended) Add custom buttons

Already documented in `docs/salesforce-lead-button-setup.md` and `docs/salesforce-button-setup.md`. Add them to the Lead and Opportunity page layouts so reps can click into the scheduler from any record.

---

## Phase 2 — Cloud Run config

### 2.1 Store the client secret in Secret Manager (don't put it as a plain env var)

```bash
echo -n "your-consumer-secret-from-step-1.1" \
  | gcloud secrets create sf-client-secret \
    --data-file=- \
    --project venture-home-scheduler
```

Grant the Cloud Run service account access:
```bash
gcloud secrets add-iam-policy-binding sf-client-secret \
  --member="serviceAccount:9110064509-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project venture-home-scheduler
```

### 2.2 Wire env vars and the secret into the service

```bash
gcloud run services update venture-home-scheduler \
  --region us-east1 \
  --project venture-home-scheduler \
  --update-env-vars \
SF_CLIENT_ID=<consumer-key-from-step-1.1>,\
SF_LOGIN_URL=https://test.salesforce.com,\
SF_REDIRECT_URI=https://venture-home-scheduler-9110064509.us-east1.run.app/auth/salesforce/callback,\
USE_MOCK=false,\
NODE_ENV=production \
  --update-secrets \
SF_CLIENT_SECRET=sf-client-secret:latest
```

**Important notes:**
- `SF_LOGIN_URL` is `https://test.salesforce.com` for sandbox, `https://login.salesforce.com` for prod.
- Always use `--update-env-vars`, never `--set-env-vars` (the latter wipes everything).
- The `--update-secrets` flag mounts the secret as `SF_CLIENT_SECRET` env var inside the container — code reads it the same as any other env var.

### 2.3 (For production later) Single-instance constraint

The current implementation stores OAuth tokens in process memory. To avoid token loss when Cloud Run scales:

```bash
gcloud run services update venture-home-scheduler \
  --region us-east1 \
  --max-instances 1
```

This is fine for dozens of concurrent reps. When you outgrow that, swap the in-memory `Map` in `sfdcAuth.js` for a Firestore-backed adapter (the file has a comment marking the swap point).

---

## Phase 3 — Smoke test

After deploying with the new env vars (`./deploy.sh "Wire SF sandbox"`):

1. Open the Cloud Run URL.
2. You should see the "Connect Salesforce" banner near the top of the dashboard. Click it.
3. SF login opens in the sandbox domain; log in with a sandbox user that has the `VH Scheduler Access` permission set.
4. After redirect, the banner becomes a small green pill: `Salesforce: <your email>`.
5. Open "New Appointment" → in the **Lookup Customer in Salesforce** field, type a name from your sandbox. Matching Leads should appear within a second.
6. Click the chevron (▾) on a result → the customer history panel expands inline showing prior leads/opps/calls/notes.
7. Click the result body → form pre-fills with the Lead's data. Pick a date/time, click **Schedule**. Check your sandbox: a new `Appointment__c` record should exist with `External_Id__c` matching the scheduler's appointment id.
8. Click "Sign out of Salesforce" (the `↩` icon next to the email pill) → banner reverts to "Connect Salesforce". Confirm a fresh Lookup attempt fails with "Connect Salesforce to view full history".

If any of those steps fail, check Cloud Run logs:
```bash
gcloud run services logs read venture-home-scheduler --region us-east1 --limit 100
```

Most common issues:
- **"redirect_uri_mismatch"** → callback URL in Connected App doesn't exactly match `SF_REDIRECT_URI`. Both must be character-identical, including trailing slashes (none).
- **"invalid_grant"** → secret didn't propagate; SF Connected Apps take 2-10 minutes to be usable.
- **401 on every API call** → permission set not assigned, or the user lacks API Enabled.
- **`Appointment__c` create fails** → field API name typo. Compare exactly to the table in §1.3.

---

## Phase 4 — Production cutover (when sandbox is solid)

1. Repeat §1.1–§1.4 in your **production** SF org (separate Connected App, separate Consumer Key/Secret).
2. Add the production Connected App credentials to a **separate** Secret Manager entry (`sf-client-secret-prod`).
3. Either:
   - **Easier**: maintain two Cloud Run services (`venture-home-scheduler` for prod, `venture-home-scheduler-sandbox` pointing at sandbox SF) — separate URLs, separate env vars.
   - **Single service**: swap env vars on the same service when cutting over.
4. After cutover, every rep clicks the "Connect Salesforce" banner once on the prod URL and is good for 7 days (the cookie TTL) before re-auth.

---

## What's still on the roadmap (not done in this pass)

- **Firestore-backed token persistence** — required if you ever set `--max-instances > 1`. The hook point is the `sessions` Map in `sfdcAuth.js`.
- **Auto-redirect on 401** from any SF endpoint (not just the explicit auth banner check). Today, a stale token after 2 hours surfaces as in-app errors until the rep re-clicks "Connect Salesforce." The session-cookie design supports a more graceful fallback; just needs a small fetch-wrapper on the frontend.
- **Per-rep mapping** — the scheduler doesn't yet tie its internal consultant ids (e.g. `nyw-1`) to the rep's SF User Id. When the rep authenticates, we know who they are in SF; mapping that to the consultant roster would let the app personalize views (e.g. "show me MY appointments"). Currently `Assigned_Consultant__c` stores the internal id; consider switching to SF User lookup once the mapping exists.
