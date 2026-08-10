/** The 47 counties, for the delivery form. */
export const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
] as const;

/** Shipping zones that deliver inside Kenya and so use the county/town form. */
const DOMESTIC_ZONES = new Set(["nairobi", "kenya_other"]);

export function isDomesticZone(zoneId: string): boolean {
  return DOMESTIC_ZONES.has(zoneId);
}

/**
 * Normalise a Kenyan mobile number to the 2547XXXXXXXX / 2541XXXXXXXX form
 * Daraja and Paystack both expect. Accepts 07…, 7…, +254 7…, 254 7…, and the
 * newer 01… range. Returns null if it cannot be read as one.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let local: string | null = null;
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^(7|1)\d{8}$/.test(digits)) local = digits;

  return local ? `254${local}` : null;
}

/** KRA PINs are a letter, nine digits, then a letter — e.g. A012345678Z. */
export function isValidKraPin(pin: string): boolean {
  return /^[A-Z]\d{9}[A-Z]$/i.test(pin.trim());
}
