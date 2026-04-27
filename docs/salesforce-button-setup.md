# Salesforce "Schedule Appointment" Button Setup

## Overview

This guide enables sales reps to launch the Venture Home Scheduler directly from any Salesforce Opportunity record with a single click. The custom button pre-fills the scheduler with opportunity data (customer name, address, zip, TSRF, lead source) and immediately surfaces the best available appointment slots and representative assignments.

**Benefit**: Eliminate manual data entry, accelerate deal velocity, and route scheduling through the geographic optimizer in one step.

---

## Custom Button Setup (Step by Step)

### 1. Access Salesforce Setup

1. Click **Setup** (gear icon, top-right) → **Setup Home**
2. In the left sidebar, search for **"Object Manager"** and click it
3. Find and click **Opportunity**

### 2. Create a New Button

4. In the Opportunity object panel, click **Buttons, Links, and Actions**
5. Click **New Button or Link**
6. Fill in the form:

   - **Label**: `Schedule Appointment`
   - **Name**: `Schedule_Appointment` (auto-populated; adjust if needed)
   - **Display Type**: `URL`
   - **Button or Link Type**: `Detail Page Button`
   - **Display Checkboxes**: Check at least *Detail Page (Standard)* and *Mobile Card*

### 3. Enter the Button Formula

7. In the **Content Source** section, select **URL** (should be default)
8. Paste the button formula into the **URL** field:

```
https://venture-home-scheduler-XXXXX-ue.a.run.app/#/schedule?opp={!Opportunity.Id}&name={!URLENCODE(Opportunity.Contact_Name__c)}&address={!URLENCODE(Opportunity.Install_Address__c)}&zip={!URLENCODE(Opportunity.Install_Zip__c)}&tsrf={!Opportunity.Aurora_Avg_TSRF__c}&source={!URLENCODE(Opportunity.LeadSource)}
```

**Important**: Replace `venture-home-scheduler-XXXXX-ue.a.run.app` with your actual Cloud Run URL.

### 4. Confirm Field Names

Before saving, verify with your Salesforce admin that these field API names match your org:

- `Contact_Name__c` — custom field with contact/account name
- `Install_Address__c` — custom field with installation address
- `Install_Zip__c` — custom field with installation zip code
- `Aurora_Avg_TSRF__c` — custom field with Aurora TSRF value (0–100)
- `LeadSource` — standard Salesforce field

If any field names differ, update the formula. (See [Field Mapping Reference](#field-mapping-reference) below.)

### 5. Save

9. Click **Save**

---

## Add Button to Opportunity Page Layout

### 1. Open the Opportunity Page Layout

1. From the Opportunity object, click **Page Layouts**
2. Click the layout you want to customize (usually "Opportunity Layout" or similar)

### 2. Add the Button

3. In the layout editor, find the **Custom Buttons** section on the right panel
4. Drag **Schedule Appointment** onto the page (typically into the action bar at the top or a dedicated button section)
5. Click **Save**

---

## What Happens When Clicked

When a sales rep clicks **Schedule Appointment**:

1. The VH Scheduler opens in a new tab/modal
2. The New Appointment modal is pre-populated with:
   - **Customer Name** (from `Contact_Name__c`)
   - **Address** (from `Install_Address__c`)
   - **Zip Code** (from `Install_Zip__c`)
   - **TSRF** (from `Aurora_Avg_TSRF__c`)
   - **Lead Source** (from `LeadSource`)
3. The **Suggestion Engine** immediately ranks:
   - Available appointment slots (calendar availability)
   - Best-fit representatives (territory, proximity, skill match)
4. The rep can confirm a slot or refine filters and re-rank

---

## Field Mapping Reference

| URL Param | SFDC Field | Type | Notes |
|-----------|-----------|------|-------|
| `opp` | `Opportunity.Id` | 18-char ID | Used to link appointment back to opportunity; auto-populated by `{!Opportunity.Id}` |
| `name` | `Contact_Name__c` or `Account.Name` | String | Customer display name; **must be URL-encoded** |
| `address` | `Install_Address__c` | String | Street address for territory/proximity matching; **must be URL-encoded** |
| `zip` | `Install_Zip__c` | String | Installation zip; used by geographic optimizer; **must be URL-encoded** |
| `tsrf` | `Aurora_Avg_TSRF__c` | Number (0–100) | Avg roof suitability from Aurora project; no encoding needed |
| `source` | `LeadSource` | Picklist | Original lead source (e.g., Partner, Website, Referral); **must be URL-encoded** |

**URL Encoding**: The formula uses `{!URLENCODE(...)}` for text fields to safely handle special characters (spaces, apostrophes, etc.). The TSRF and ID fields do not need encoding.

---

## Troubleshooting

### Button Clicks but Nothing Happens

- **Check popup blockers**: Some browsers block new tabs. Whitelist your scheduler domain or allow popups for Salesforce.
- **Check Cloud Run URL**: Verify `https://venture-home-scheduler-XXXXX-ue.a.run.app` is correct and accessible. Test in your browser address bar.
- **Check field names**: If a field name is wrong, the merge field fails silently. Verify all custom field API names with your admin.

### Pre-fill Data Missing or Blank

- **Field doesn't exist**: Confirm the field exists on the Opportunity object and is populated in the record you're testing.
- **Wrong field API name**: Double-check spelling, including underscores and case sensitivity (e.g., `Contact_Name__c` vs. `Contact_name__c`).
- **Data hasn't synced**: If the opportunity was just created or updated, refresh the page and try again.

### TSRF Shows as Null or 0

- The Aurora sync may be pending. Verify that `Aurora_Avg_TSRF__c` is populated and visible in the Opportunity record. Check your Aurora integration for sync errors.

### Opportunity ID Not Captured

- The scheduler requires the opportunity ID for back-linking. If `{!Opportunity.Id}` is not working, contact your Salesforce admin to confirm the Opportunity object is accessible.

### Scheduler Page Loads but Form Appears Empty

- Verify that the URL parameters are being passed (check browser dev tools → Network → XHR calls).
- Confirm the scheduler backend is parsing the query string correctly (contact dev team if needed).

---

## Next Steps

1. **Test the button** on a staging/sandbox Opportunity record first.
2. **Gather feedback** from a pilot group of reps.
3. **Adjust field names** or add new parameters as needed (e.g., budget, notes).
4. **Roll out** to all users once stable.

For questions or enhancements, contact your VH Scheduler admin or development team.
