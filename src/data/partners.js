// Partner booking link configuration
// Each partner gets a unique slug and territory filter
// Partners see available slots only in their assigned territories

export const PARTNERS = {
  greenwatt: {
    slug: 'greenwatt',
    name: 'Greenwatt',
    territories: ['CT', 'MARI', 'MENH'],
    brandColor: '#22C55E',
    logo: null, // URL when available
    contactEmail: 'bookings@greenwatt.com',
    active: true,
  },
  verse: {
    slug: 'verse',
    name: 'Verse',
    territories: ['NYE', 'NYW', 'NJPA'],
    brandColor: '#6366F1',
    logo: null,
    contactEmail: 'scheduling@verse.io',
    active: true,
  },
  sunlink: {
    slug: 'sunlink',
    name: 'SunLink',
    territories: ['NJPA', 'MD'],
    brandColor: '#F59E0B',
    logo: null,
    contactEmail: 'partners@sunlink.com',
    active: true,
  },
  lomano: {
    slug: 'lomano',
    name: 'Lo Mano',
    territories: ['NYE', 'CT', 'MARI'],
    brandColor: '#EC4899',
    logo: null,
    contactEmail: 'appointments@lomano.com',
    active: true,
  },
  'remix-dynamics': {
    slug: 'remix-dynamics',
    name: 'Remix Dynamics',
    territories: ['NYW', 'MENH', 'MD'],
    brandColor: '#14B8A6',
    logo: null,
    contactEmail: 'ops@remixdynamics.com',
    active: true,
  },
};

export function getPartnerBySlug(slug) {
  return Object.values(PARTNERS).find(p => p.slug === slug) || null;
}

export function getAllActivePartners() {
  return Object.values(PARTNERS).filter(p => p.active);
}

// Generate the full booking URL for a partner
export function getBookingUrl(slug, baseUrl = 'http://localhost:3000') {
  return `${baseUrl}/book/${slug}`;
}
