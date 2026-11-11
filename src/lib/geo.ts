/** Great-circle distance in kilometres. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rounds to the nearest half kilometre so a distance cannot be used to triangulate an address. */
export function coarseKm(km: number): number {
  return Math.max(0.5, Math.round(km * 2) / 2);
}

export type Place = { label: string; city: string; state: string; lat: number; lng: number };

// Areas offered when the browser cannot (or may not) share a location.
export const PLACES: Place[] = [
  { label: "Lekki Phase 1", city: "Lagos", state: "Lagos", lat: 6.4474, lng: 3.4723 },
  { label: "Victoria Island", city: "Lagos", state: "Lagos", lat: 6.4281, lng: 3.4219 },
  { label: "Ikoyi", city: "Lagos", state: "Lagos", lat: 6.4549, lng: 3.4246 },
  { label: "Yaba", city: "Lagos", state: "Lagos", lat: 6.5095, lng: 3.3711 },
  { label: "Surulere", city: "Lagos", state: "Lagos", lat: 6.5005, lng: 3.3581 },
  { label: "Ikeja", city: "Lagos", state: "Lagos", lat: 6.6018, lng: 3.3515 },
  { label: "Ajah", city: "Lagos", state: "Lagos", lat: 6.4698, lng: 3.5852 },
  { label: "Festac Town", city: "Lagos", state: "Lagos", lat: 6.4654, lng: 3.2833 },
  { label: "Wuse 2", city: "Abuja", state: "FCT", lat: 9.0765, lng: 7.4726 },
  { label: "Garki", city: "Abuja", state: "FCT", lat: 9.0333, lng: 7.4893 },
  { label: "Maitama", city: "Abuja", state: "FCT", lat: 9.0882, lng: 7.4934 },
  { label: "Gwarinpa", city: "Abuja", state: "FCT", lat: 9.1099, lng: 7.4042 },
  { label: "Kubwa", city: "Abuja", state: "FCT", lat: 9.1551, lng: 7.3221 },
  { label: "GRA Phase 2", city: "Port Harcourt", state: "Rivers", lat: 4.8242, lng: 7.0034 },
  { label: "Rumuola", city: "Port Harcourt", state: "Rivers", lat: 4.8352, lng: 7.0239 },
  { label: "Trans-Amadi", city: "Port Harcourt", state: "Rivers", lat: 4.8105, lng: 7.0372 },
  { label: "Rumuokoro", city: "Port Harcourt", state: "Rivers", lat: 4.8707, lng: 6.9983 },
  { label: "Bodija", city: "Ibadan", state: "Oyo", lat: 7.4352, lng: 3.9142 },
  { label: "GRA", city: "Benin City", state: "Edo", lat: 6.3176, lng: 5.6145 },
  { label: "Independence Layout", city: "Enugu", state: "Enugu", lat: 6.4403, lng: 7.5148 },
  { label: "Nassarawa GRA", city: "Kano", state: "Kano", lat: 12.0022, lng: 8.5491 },
];

export function nearestPlace(lat: number, lng: number): Place | null {
  let best: Place | null = null;
  let bestKm = Infinity;
  for (const p of PLACES) {
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km < bestKm) {
      best = p;
      bestKm = km;
    }
  }
  return bestKm <= 25 ? best : null;
}
