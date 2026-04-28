// leadMapper.js
//
// Single source of truth for mapping a Salesforce Lead (or Contact) into the
// shape NewAppointmentModal's `defaultForm` / `setForm({...})` expects.
//
// Used by:
//   - LeadPicker (in-app fuzzy search results)
//   - app.jsx Salesforce deep-link path (#/schedule?lead=...)
//   - any future write-back flow that needs to round-trip a Lead → form
//
// Accepts BOTH the raw SFDC REST shape (FirstName, LastName, MobilePhone, Street,
// PostalCode, ...) and the normalized search-endpoint shape (firstName, lastName,
// mobilePhone, address, zip, ...) so callers don't have to think about which one
// they have.

import { LEAD_SOURCES } from './leadSources.js';

export function leadToFormValues(lead) {
  if (!lead) return {};

  const first = (lead.firstName || lead.FirstName || '').trim();
  const last  = (lead.lastName  || lead.LastName  || '').trim();
  const fullFromName = (lead.name || lead.Name || '').trim();
  const customer = [first, last].filter(Boolean).join(' ') || fullFromName;

  // Prefer mobile phone (most likely to reach the customer day-of), fall back to office.
  const phone = (
    lead.mobilePhone || lead.MobilePhone ||
    lead.phone       || lead.Phone       || ''
  ).trim();

  const email = (lead.email || lead.Email || '').trim();

  // Build "Street, City, State" — keeps parseAddressPart() in NewAppointmentModal
  // working for SlotSuggestions city/state extraction. If only some parts are
  // present, we still join what we have.
  const street = (lead.address     || lead.Street            || lead.MailingStreet      || '').trim();
  const city   = (lead.city        || lead.City              || lead.MailingCity        || '').trim();
  const state  = (lead.state       || lead.State             || lead.MailingState       || '').trim();
  const address = [street, city, state].filter(Boolean).join(', ');

  const zipCode = (
    lead.zip        || lead.PostalCode        ||
    lead.MailingPostalCode || ''
  ).trim();

  // Only carry leadSource if it's one of our canonical picklist values — otherwise
  // we'd silently break the SearchableSelect display (which expects a known string).
  const sfSource = (lead.source || lead.LeadSource || '').trim();
  const leadSource = LEAD_SOURCES.includes(sfSource) ? sfSource : undefined;

  // Carry the SFDC IDs through so syncAppointmentToSFDC can do the Lead→Opp
  // auto-conversion on save (see app.jsx ~line 251).
  const sfdcLeadId = lead.id || lead.Id || lead.sfdcLeadId || '';
  const isContact = lead.type === 'contact' || !!lead.accountId || !!lead.AccountId;

  return {
    customer,
    phone,
    email,
    address,
    zipCode,
    ...(leadSource ? { leadSource } : {}),
    ...(sfdcLeadId && !isContact ? { sfdcLeadId } : {}),
  };
}
