const TRAFFIC_THRESHOLD = 5;

const normalizeUnitName = (rawUnit = '') => {
  const value = String(rawUnit || '').trim();
  if (!value) return '';

  const cleaned = value.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const upper = cleaned.toUpperCase();

  const aliases = {
    LC: 'LUNNON CREST',
    'LUNNON CREST': 'LUNNON CREST',
    LUNNONCREST: 'LUNNON CREST',
    BLVD: 'HILLCREST BOULEVARD',
    BOULEVARD: 'HILLCREST BOULEVARD',
    'HILLCREST BOULEVARD': 'HILLCREST BOULEVARD',
    HILLCRESTBOULEVARD: 'HILLCREST BOULEVARD',
    VIEW: 'HILLCREST VIEW',
    'HILLCREST VIEW': 'HILLCREST VIEW',
    HILLCRESTVIEW: 'HILLCREST VIEW',
    'VILLA MAG': 'VILLA MAGNOLIA',
    'VILLA MAGNOLIA': 'VILLA MAGNOLIA',
    VILLAMAG: 'VILLA MAGNOLIA',
    VILLAMAGNOLIA: 'VILLA MAGNOLIA',
    JAK: 'JAKARANDA',
    JAKARANDA: 'JAKARANDA',
    JAKRANDA: 'JAKARANDA',
    RUM: 'RUMOURS',
    RUMOURS: 'RUMOURS'
  };

  return aliases[upper] || upper;
};

const formatPhoneForWhatsApp = (phone = '') => {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1);
  } else if (!cleaned.startsWith('27')) {
    cleaned = '27' + cleaned;
  }

  return cleaned;
};

const getClientBookingUrl = (bookingId) => {
  if (typeof window === 'undefined' || !bookingId) return '';
  return `${window.location.origin}/viewing-response?id=${encodeURIComponent(bookingId)}`;
};

const buildWhatsAppStatusMessage = (viewing, statusType) => {
  if (typeof window === 'undefined') return '';

  const safeViewing = {
    id: viewing?.id || '',
    prospect: viewing?.prospect || 'there',
    unit: normalizeUnitName(viewing?.unit),
    date: viewing?.date || '',
    time: viewing?.time || ''
  };

  const url = `${window.location.origin}/viewing-response?id=${encodeURIComponent(safeViewing.id)}`;

  if (statusType === 'slot-unavailable') {
    return `Hi ${safeViewing.prospect}, this viewing slot is no longer available. Please choose another time here: ${url}`;
  }

  if (statusType === 'reschedule-approved') {
    return `Hi ${safeViewing.prospect}, your reschedule request has been approved. Your new viewing is on ${safeViewing.date} at ${safeViewing.time}.`;
  }

  return `Hi ${safeViewing.prospect}! Your viewing for ${safeViewing.unit} is confirmed on ${safeViewing.date} at ${safeViewing.time}. Manage it here: ${url}`;
};

export {
  TRAFFIC_THRESHOLD,
  normalizeUnitName,
  formatPhoneForWhatsApp,
  getClientBookingUrl,
  buildWhatsAppStatusMessage
};
