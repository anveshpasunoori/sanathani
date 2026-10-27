import { formatPlaceName, nearestKnownPlace } from '../src/data/geocode';

describe('place names', () => {
  it('uses the state code in the US and the state name in India', () => {
    expect(formatPlaceName({ city: 'Edison', principalSubdivision: 'New Jersey', principalSubdivisionCode: 'US-NJ', countryCode: 'US' })).toBe('Edison, NJ');
    expect(formatPlaceName({ city: 'Hyderabad', principalSubdivision: 'Telangana', principalSubdivisionCode: 'IN-TG', countryCode: 'IN' })).toBe('Hyderabad, Telangana');
    expect(formatPlaceName({ locality: 'Gachibowli', principalSubdivision: 'Telangana', countryCode: 'IN' })).toBe('Gachibowli, Telangana');
    expect(formatPlaceName({ countryName: 'India' })).toBeNull();
  });
  it('falls back to the nearest built-in city', () => {
    const n = nearestKnownPlace(40.55, -74.35);
    expect(n.name).toBe('Edison, NJ');
    expect(n.km).toBeLessThan(15);
  });
});

import { findPlace, PLACES, placeLabel, searchLocal } from '../src/data/places';
import { upgradedName } from '../src/data/geocode';

describe('built-in places', () => {
  const top = (q: string) => searchLocal(q)[0]?.name;

  it('covers every Telangana and Andhra Pradesh district headquarters and world cities', () => {
    const ts = PLACES.filter((p) => p.region === 'Telangana').length;
    const ap = PLACES.filter((p) => p.region === 'Andhra Pradesh').length;
    expect(ts).toBeGreaterThanOrEqual(33);
    expect(ap).toBeGreaterThanOrEqual(26);
    expect(new Set(PLACES.map((p) => p.cc)).size).toBeGreaterThan(40);
    for (const p of PLACES) { expect(p.tz).toMatch(/\//); expect(Math.abs(p.lat)).toBeLessThan(80); }
  });

  it('labels places the way people write them', () => {
    expect(findPlace('Guntur')?.name).toBe('Guntur, Andhra Pradesh');
    expect(findPlace('Edison')?.name).toBe('Edison, NJ');
    expect(findPlace('Toronto')?.name).toBe('Toronto, ON');
    expect(findPlace('London')?.name).toBe('London, United Kingdom');
    expect(findPlace('Singapore')?.name).toBe('Singapore');
    expect(placeLabel('Washington', 'District of Columbia', 'United States', 'US')).toBe('Washington, DC');
  });

  it('searches by prefix, old names, and state or country qualifiers', () => {
    expect(top('gun')).toBe('Guntur, Andhra Pradesh');
    expect(top('vizag')).toBe('Visakhapatnam, Andhra Pradesh');
    expect(top('bombay')).toBe('Mumbai, Maharashtra');
    expect(top('Rajamahendravaram')).toBe('Rajahmundry, Andhra Pradesh');
    expect(top('edison nj')).toBe('Edison, NJ');
    expect(top('Portland, OR')).toBe('Portland, OR');
    expect(top('london uk')).toBe('London, United Kingdom');
    expect(top('Hyderabad TS')).toBe('Hyderabad, Telangana');
    expect(searchLocal('Kurnool, Karnataka')).toEqual([]);
    expect(top('New York')).toBe('New York, NY');
  });

  it('upgrades short names saved by older versions', () => {
    expect(upgradedName({ name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' })).toBe('Hyderabad, Telangana');
    expect(upgradedName({ name: 'Edison, NJ', lat: 40.5, lon: -74.4, tz: 'America/New_York' })).toBeNull();
  });
});
