export const SHIPPING_ZONES = [
  { id: "nairobi",       label: "Nairobi Metropolis",              rate: 8   },
  { id: "kenya_other",   label: "Kenya — Other Counties",          rate: 15  },
  { id: "east_africa",   label: "East Africa (UG, TZ, RW, ET…)",  rate: 50  },
  { id: "africa",        label: "Rest of Africa",                  rate: 130 },
  { id: "europe_us",     label: "Europe / North America",          rate: 200 },
  { id: "international", label: "Rest of World",                   rate: 260 },
] as const;

export type ShippingZoneId = typeof SHIPPING_ZONES[number]["id"];

export function getShippingRate(zoneId: string): number {
  return SHIPPING_ZONES.find((z) => z.id === zoneId)?.rate ?? 0;
}

export function getShippingLabel(zoneId: string): string {
  return SHIPPING_ZONES.find((z) => z.id === zoneId)?.label ?? zoneId;
}
