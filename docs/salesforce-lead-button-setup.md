# Salesforce "Schedule Appointment" Button — Lead Object

## Overview

This guide enables inside sales reps to launch the Venture Home Scheduler directly from any Salesforce Lead record. The custom button pre-fills the scheduler with Lead data (name, phone, email, address, zip, lead source) and immediately surfaces the best available appointment slots.

**What happens when an appointment is booked from a Lead:**
1. The Lead is automatically converted to an Account + Contact + Opportunity in Salesforce
2. A custom `Appointment__c` record is created and linked to the new Opportunity
3. The rep assignment, notifications, and calendar sync proceed as normal

---

## Custom Button Setup (Step by Step)

### 1. Access Salesforce Setup

1. Click **Setup** (gear icon, top-right) → **Setup Home**
2. In the left sidebar, search for **"Object Manager"** and click it
3. Find and click **Lead**

### 2. Create a New Button

4. In the Lead object panel, click **Buttons, Links, and Actions**
5. Click **New Button or Link**
6. Fill in the form:

   - **Label**: `Schedule Appointment`
   - **Name**: `Schedule_Appointment`
   - **Display Type**: `URL`
   - **Button or Link Type**: `Detail Page Button`
   - **Display Checkboxes**: Check *Detail Page (Standard)* and *Mobile Card*

### 3. Enter the Button Formula

7. In the **Content Source** section, select **URL**
8. Paste the button formula into the **URL** field:

```
https://venture-home-scheduler-9110064509.us-east1.run.app/#/schedule?lead={!Lead.Id}&name={!URLENCODE(Lead.Name)}&phone={!URLENCODE(Lead.Phone)}&email={!URLENCODE(Lead.Email)}&address={!URLENCODE(Lead.Street)}&zip={!URLENCODE(Lead.PostalCode)}&source={!URLENCODE(Lead.LeadSource)}
```

**Important**: Replace the Cloud Run URL with your actual deployment URL if it differs.

### 4. Confirm Field Names

These are all standard Salesforce Lead fields — no custom fields are required:

| Button Parameter | SFDC Field     | Description             |
|-----------------|----------------|-------------------------|
| `lead`          | `Lead.Id`      | Lead record ID          |
| `name`          | `Lead.Name`    | Full name               |
| `phone`         | `Lead.Phone`   | Phone number            |
| `email`         | `Lead.Email`   | Email address           |
| `address`       | `Lead.Street`  | Street address          |
| `zip`           | `Lead.PostalCode` | Zip/postal code      |
| `source`        | `Lead.LeadSource` | Lead source           |

### 5. Save

9. Click **Save**

---

## Add Button to Lead Page Layout

1. Go to **Object Manager → Lead → Page Layouts**
2. Select the layout used by your inside sales team
3. In the layout editor, click **Buttons** in the palette bar
4. Drag **Schedule Appointment** into the **Custom Buttons** section of the layout
5. Click **Save**

---

## How It Works

When a rep clicks the button on a Lead record:

1. The scheduler opens with the Lead's info pre-filled in the booking form
2. The rep selects a date, time slot, and consultant assignment
3. On confirmation:
   - The Lead is **automatically converted** to Account + Contact + Opportunity
   - An `Appointment__c` record is created in Salesforce linked to the new Opportunity
   - SMS/email confirmation is sent to the customer
   - The appointment appears on the scheduling calendar

---

## Comparison: Lead vs. Opportunity Booking

| Feature                    | Lead Button        | Opportunity Button  |
|---------------------------|--------------------|---------------------|
| Pre-filled fields         | Name, Phone, Email, Address, Zip, Source | Name, Address, Zip, TSRF, Source |
| Aurora TSRF available?    | No (not yet assessed) | Yes                |
| Auto-converts Lead?       | Yes → creates Account + Opp | N/A              |
| Creates Appointment__c?   | Yes                | Yes                 |
| Custom fields required?   | None               | Contact_Name__c, Install_Address__c, Install_Zip__c, Aurora_Avg_TSRF__c |

---

## Troubleshooting

- **"Page not found" when clicking button**: Verify the Cloud Run URL is correct and the service is deployed
- **Lead conversion fails**: Ensure the Lead has a valid `Status` field and that your org has a converted status value (usually "Qualified")
- **Fields not pre-filling**: Check that the Lead record has data in the Phone, Email, Street, and PostalCode fields
- **Need TSRF on Leads**: If you add `Aurora_Avg_TSRF__c` to the Lead object, update the button formula to include `&tsrf={!Lead.Aurora_Avg_TSRF__c}`
