// Thin wrapper over astronomy-engine (VSOP87/ELP-based geocentric positions, accurate to well
// under an arcminute for Sun and Moon). All Panchangam math derives from these primitives.
import * as A from 'astronomy-engine';

export const ENGINE_VERSION = 'drik-lahiri-1';

const DAY_MS = 86400000;

/** Lahiri (Chitrapaksha) ayanamsa in degrees, via the standard precession polynomial from J2000. */
export function lahiriAyanamsa(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * DAY_MS);
  return 23.85305 + (5028.796195 * T + 1.1054348 * T * T) / 3600;
}

const norm = (x: number) => ((x % 360) + 360) % 360;

export function sunTropical(date: Date): number {
  return A.SunPosition(date).elon;
}
export function moonTropical(date: Date): number {
  return A.EclipticGeoMoon(date).lon;
}
export function sunSidereal(date: Date): number {
  return norm(sunTropical(date) - lahiriAyanamsa(date));
}
export function moonSidereal(date: Date): number {
  return norm(moonTropical(date) - lahiriAyanamsa(date));
}
/** Moon − Sun ecliptic longitude, 0..360. Tithi = floor(elongation / 12). */
export function elongation(date: Date): number {
  return A.MoonPhase(date);
}

/** Next instant (after `start`, within `limitDays`) when the elongation equals `deg`. */
export function nextElongation(deg: number, start: Date, limitDays: number): Date | null {
  const t = A.SearchMoonPhase(norm(deg), start, limitDays);
  return t ? t.date : null;
}

function angDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/**
 * Next time a monotonically increasing angle function `fn` crosses `target` degrees.
 * Coarse stepping then bisection to ~1 second.
 */
export function findCrossing(fn: (d: Date) => number, target: number, start: Date, maxDays: number, stepHours = 4): Date | null {
  let t0 = start.getTime();
  let d0 = angDiff(fn(new Date(t0)), target);
  const end = t0 + maxDays * DAY_MS;
  while (t0 < end) {
    const t1 = Math.min(t0 + stepHours * 3600000, end);
    const d1 = angDiff(fn(new Date(t1)), target);
    if (d0 < 0 && d1 >= 0) {
      let lo = t0, hi = t1;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        if (angDiff(fn(new Date(mid)), target) < 0) lo = mid; else hi = mid;
      }
      return new Date(hi);
    }
    t0 = t1;
    d0 = d1;
  }
  return null;
}

/** Most recent crossing at or before `before`, searching back `maxDays`. */
export function findPrevCrossing(fn: (d: Date) => number, target: number, before: Date, maxDays: number): Date | null {
  let from = new Date(before.getTime() - maxDays * DAY_MS);
  let last: Date | null = null;
  for (;;) {
    const c = findCrossing(fn, target, from, (before.getTime() - from.getTime()) / DAY_MS);
    if (!c || c.getTime() > before.getTime()) return last;
    last = c;
    from = new Date(c.getTime() + 60000);
  }
}

export interface GeoPoint { lat: number; lon: number }

function observer(p: GeoPoint) {
  return new A.Observer(p.lat, p.lon, 0);
}

/** First sunrise (+1) or sunset (−1) after `start`, within `limitDays`. Null near the poles. */
export function sunEvent(p: GeoPoint, direction: 1 | -1, start: Date, limitDays = 1.2): Date | null {
  const t = A.SearchRiseSet(A.Body.Sun, observer(p), direction, start, limitDays);
  return t ? t.date : null;
}

export function moonrise(p: GeoPoint, start: Date, limitDays = 1.2): Date | null {
  const t = A.SearchRiseSet(A.Body.Moon, observer(p), 1, start, limitDays);
  return t ? t.date : null;
}
