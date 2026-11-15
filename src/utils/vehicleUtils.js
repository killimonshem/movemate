import { dvlaProxyUrl } from '../config';

export const MOCK_REGISTRATIONS = {
  AB12CDE: { colour: 'BLACK', make: 'BMW', model: '3 Series', registrationNumber: 'AB12CDE' },
  CD34EFG: { colour: 'WHITE', make: 'FORD', model: 'Fiesta', registrationNumber: 'CD34EFG' },
  EF56HIJ: { colour: 'BLUE', make: 'TOYOTA', model: 'Corolla', registrationNumber: 'EF56HIJ' },
  GH78KLM: { colour: 'RED', make: 'AUDI', model: 'A3', registrationNumber: 'GH78KLM' },
  IJ90NOP: { colour: 'GREY', make: 'MERCEDES', model: 'C Class', registrationNumber: 'IJ90NOP' },
  KL12QRS: { colour: 'SILVER', make: 'HONDA', model: 'Civic', registrationNumber: 'KL12QRS' },
  MN34TUV: { colour: 'GREEN', make: 'NISSAN', model: 'Qashqai', registrationNumber: 'MN34TUV' },
  OP56WXY: { colour: 'YELLOW', make: 'RENAULT', model: 'Clio', registrationNumber: 'OP56WXY' },
  QR78ZAB: { colour: 'ORANGE', make: 'VOLKSWAGEN', model: 'Golf', registrationNumber: 'QR78ZAB' },
  ST90CDE: { colour: 'BROWN', make: 'KIA', model: 'Sportage', registrationNumber: 'ST90CDE' },
};

export const normalizeReg = (reg) =>
  typeof reg === 'string' ? reg.replace(/\s+/g, '').toUpperCase() : '';

export const validateUKReg = (reg) => {
  const cleaned = normalizeReg(reg);
  if (!cleaned) return false;
  const pattern =
    /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$|^[0-9]{1,4}[A-Z]{1,2}$|^[0-9]{1,3}[A-Z]{1,3}$|^[A-Z]{1,2}[0-9]{1,4}$|^[A-Z]{1,3}[0-9]{1,3}$|^[A-Z]{1,3}[0-9]{1,4}$/i;
  return pattern.test(cleaned);
};

export const validateUKMobile = (phone) => {
  if (typeof phone !== 'string') return false;
  const pattern = /^(\+44|0)7[0-9]{9}$/;
  return pattern.test(phone.replace(/\s+/g, ''));
};

export const formatPhoneNumber = (phone) => {
  if (typeof phone !== 'string') return '';
  let cleaned = phone.replace(/\s+/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+44')) {
    cleaned = '+44' + cleaned;
  }
  return cleaned;
};

export const formatPhoneDisplay = (phone) => {
  const formatted = formatPhoneNumber(phone);
  if (formatted.startsWith('+44')) {
    const digits = formatted.substring(3);
    if (digits.length >= 4) {
      return `+44 ${digits.substring(0, 4)} ${digits.substring(4)}`;
    }
  }
  return formatted;
};

// Mask phone number for privacy - show only last 3 digits
export const maskPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 3) return phone;
  return '***' + digits.substring(digits.length - 3);
};

export const formatVehicleSummary = (vehicleData) => {
  if (!vehicleData || typeof vehicleData !== 'object') return '';
  const parts = [
    vehicleData.colour || '',
    vehicleData.engineCapacity ? `${(vehicleData.engineCapacity / 1000).toFixed(1)}L` : '',
    vehicleData.make || '',
    vehicleData.model || '',
  ]
    .map((part) => String(part).trim())
    .filter(Boolean);
  return parts.join(' ');
};

export const matchesSearchTerm = (registration, term) => {
  const trimmed = typeof term === 'string' ? term.trim() : '';
  if (!trimmed) return true;

  const normalizedTerm = trimmed.replace(/\s+/g, '').toLowerCase();
  const normalizedReg = normalizeReg(registration?.reg || '').toLowerCase();
  if (normalizedReg.includes(normalizedTerm)) {
    return true;
  }

  const rawPhone = String(registration?.phone || '');
  const compactPhone = rawPhone.replace(/\s+/g, '').toLowerCase();
  const localPhone = compactPhone.startsWith('+44') ? '0' + compactPhone.slice(3) : compactPhone;
  return compactPhone.includes(normalizedTerm) || localPhone.includes(normalizedTerm);
};

export async function lookupVehicleByReg(reg, { signal, proxyUrl = dvlaProxyUrl } = {}) {
  const regClean = normalizeReg(reg);
  if (regClean.length < 4) {
    return { status: 'skipped', data: null, error: '' };
  }

  if (MOCK_REGISTRATIONS[regClean]) {
    return { status: 'ok', data: MOCK_REGISTRATIONS[regClean], error: '' };
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber: regClean }),
    signal,
  });

  const rawText = await res.text();
  let parsed = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    let errorMsg = 'Vehicle not found or DVLA error';
    if (parsed?.errors?.[0]?.detail) {
      errorMsg = parsed.errors[0].detail;
    } else if (parsed?.message) {
      errorMsg = parsed.message;
    } else if (parsed?.error) {
      errorMsg = parsed.error;
    }
    return { status: 'error', data: null, error: errorMsg };
  }

  return { status: 'ok', data: parsed, error: '' };
}
