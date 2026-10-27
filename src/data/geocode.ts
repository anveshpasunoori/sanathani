// Turns device coordinates into a readable place name ("Edison, NJ", "Hyderabad, Telangana").
// Uses BigDataCloud's free client-side reverse geocoder; only coordinates rounded to ~1 km are sent,
// and only when the user taps "Use my current location". Offline, we fall back to the nearest
// built-in city.
import type { Place } from '../engine/panchang';
import { fold, PLACES, placeLabel, searchLocal } from './places';

const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestKnownPlace(lat: number, lon: number): { name: string; km: number } {
  let best = { name: PLACES[0].name, km: Infinity };
  for (const p of PLACES) {
    const km = distanceKm(lat, lon, p.lat, p.lon);
    if (km < best.km) best = { name: p.name, km };
  }
  return best;
}

interface BdcResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
  countryCode?: string;
}

/** Formats a reverse-geocode result the same way as built-in places ("Edison, NJ", "Guntur, Andhra Pradesh"). */
export function formatPlaceName(r: BdcResponse): string | null {
  const city = r.city || r.locality;
  if (!city) return null;
  return placeLabel(city, r.principalSubdivision, r.countryName, r.countryCode);
}

export async function placeNameFor(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const name = formatPlaceName(await res.json());
      if (name) return name;
    }
  } catch { /* offline or blocked: fall through */ }
  const near = nearestKnownPlace(lat, lon);
  return near.km < 40 ? near.name : near.km < 150 ? `Near ${near.name}` : 'Current location';
}

export const isUnnamedPlace = (name: string) => name.startsWith('My location (');

interface OmResult {
  name: string; latitude: number; longitude: number; timezone?: string; population?: number; feature_code?: string;
  admin1?: string; admin2?: string; admin3?: string; country?: string; country_code?: string;
}

export interface PlaceResult extends Place {
  /** Second line in the picker: district, state, country. */
  detail: string;
}

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Worldwide town and village search (Open-Meteo geocoder, GeoNames data). Sends only the typed
 * text. "Guntur, AP" or "Tenali Andhra" searches "Guntur"/"Tenali" and keeps matches in that state.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const [head, ...restParts] = query.split(',');
  let town = head.trim();
  let quals = restParts.join(' ').trim();
  // "tenali andhra" without a comma: try the last word as a qualifier if it names a state/country we know.
  if (!quals && town.includes(' ')) {
    const words = town.split(/\s+/), last = words[words.length - 1];
    if (searchLocal(last, 1).length === 0 && PLACES.some((p) => p.quals.some((x) => x.startsWith(fold(last))))) { quals = last; town = words.slice(0, -1).join(' '); }
  }
  if (town.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(town)}&count=20&language=en&format=json`;
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('Search is unavailable right now.');
  const data = (await res.json()) as { results?: OmResult[] };
  const qWords = fold(quals).split(' ').filter(Boolean);
  const seen = new Set<string>();
  return (data.results ?? [])
    .filter((r) => r.timezone && !/^(AIRP|RSTN|BUSTN|HTL)/.test(r.feature_code ?? ''))
    .filter((r) => {
      if (!qWords.length) return true;
      const sample = PLACES.find((p) => p.region === r.admin1);
      const hay = [r.admin1, r.admin2, r.country, r.country_code].filter(Boolean).map((x) => fold(x!)).concat(sample?.quals ?? []);
      return qWords.every((w) => hay.some((h) => h.startsWith(w) || h.split(' ').some((y) => y.startsWith(w))));
    })
    .map((r): PlaceResult => {
      const name = strip(r.name);
      const district = r.admin2 && strip(r.admin2) !== name ? strip(r.admin2).replace(/ district$/i, '') + ' district' : undefined;
      return {
        name: placeLabel(name, r.admin1 && strip(r.admin1), r.country, r.country_code),
        lat: r.latitude, lon: r.longitude, tz: r.timezone!,
        detail: [district, r.admin1 && strip(r.admin1), r.country].filter(Boolean).join(', '),
      };
    })
    .filter((p) => { const k = `${p.name}|${p.detail}`; return !seen.has(k) && !!seen.add(k); })
    .slice(0, 10);
}

/** Older saves used short names ("Hyderabad"); return the fuller built-in label for the same spot, if any. */
export function upgradedName(p: Place): string | null {
  if (p.name.includes(',')) return null;
  const hit = PLACES.find((x) => x.name.startsWith(`${p.name},`) && distanceKm(p.lat, p.lon, x.lat, x.lon) < 25);
  return hit ? hit.name : null;
}
