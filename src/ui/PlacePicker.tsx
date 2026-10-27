import { useEffect, useId, useRef, useState } from 'react';
import { distanceKm, placeNameFor, searchPlaces } from '../data/geocode';
import { POPULAR, searchLocal } from '../data/places';
import type { Place } from '../engine/panchang';
import { useText } from '../i18n';
import { PLACE_TEXT } from '../locales/placePicker';

interface Option { place: Place; detail: string; source: 'builtin' | 'online' }

const builtin = (p: (typeof POPULAR)[number]): Option => ({
  place: { name: p.name, lat: p.lat, lon: p.lon, tz: p.tz },
  detail: [p.cc === 'IN' || p.cc === 'US' || p.cc === 'CA' ? p.region : '', p.country].filter(Boolean).join(', '),
  source: 'builtin',
});

function tzLabel(tz: string): string {
  try {
    const off = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((x) => x.type === 'timeZoneName')?.value;
    return `${tz.replace(/_/g, ' ')}${off ? ` (${off})` : ''}`;
  } catch { return tz; }
}

/**
 * Type-ahead place search. Built-in places answer instantly (and offline); after a short pause
 * the worldwide town/village search adds anything else, with district and state shown.
 */
export function PlacePicker({ value, onChange, label, locate: allowLocate = true }: { value: Place; onChange: (p: Place) => void; label?: string; locate?: boolean }) {
  const { x } = useText(PLACE_TEXT);
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [online, setOnline] = useState<Option[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const local = query.trim() ? searchLocal(query, 6).map(builtin) : POPULAR.map(builtin);
  // Online results that duplicate a built-in place (same name within 5 km) are dropped.
  const extra = online.filter((o) => !local.some((l) => l.place.name === o.place.name && distanceKm(l.place.lat, l.place.lon, o.place.lat, o.place.lon) < 5));
  const options = [...local, ...extra];

  useEffect(() => {
    const q = query.trim();
    setOnline([]);
    if (q.length < 3) { setBusy(false); return; }
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, ctrl.signal);
        setOnline(r.map((p) => ({ place: { name: p.name, lat: p.lat, lon: p.lon, tz: p.tz }, detail: p.detail, source: 'online' as const })));
        setStatus('');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus(x('offline'));
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (o: Option) => {
    onChange(o.place);
    setQuery('');
    setOpen(false);
    setStatus('');
  };

  const locate = () => {
    if (!navigator.geolocation) return setStatus(x('noGeo'));
    setStatus(x('finding'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { latitude: lat, longitude: lon } = pos.coords;
        setStatus(x('lookingUp'));
        const name = await placeNameFor(lat, lon);
        onChange({ name, lat, lon, tz });
        setStatus('');
      },
      () => setStatus(x('geoFailed')),
      { maximumAge: 3600000, timeout: 15000 },
    );
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { if (open && options[active]) { e.preventDefault(); choose(options[active]); } }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="stack">
      <div className="place-current">
        <span aria-hidden="true">📍</span>
        <div className="grow">
          <div className="small muted">{label ?? x('location')}</div>
          <strong>{value.name}</strong>
          <div className="tiny muted">{tzLabel(value.tz)}</div>
        </div>
      </div>
      <div className="combo" ref={boxRef}>
        <label className="sr-only" htmlFor={id}>{x('searchLabel')}</label>
        <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="off"
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          value={query} placeholder={x('searchPh')}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }} />
        {open && (
          <ul className="combo-list" id={`${id}-list`} role="listbox">
            {!query.trim() && <li className="combo-group" role="presentation">{x('popular')}</li>}
            {options.map((o, i) => (
              <li key={`${o.place.name}|${o.detail}|${i}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
                className={i === active ? 'active' : undefined} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); choose(o); }}>
                <span className="combo-name">{o.place.name.split(',')[0]}</span>
                <span className="combo-detail">{o.detail}</span>
              </li>
            ))}
            {busy && <li className="combo-group" role="presentation">{x('searching')}</li>}
            {!busy && query.trim().length >= 3 && options.length === 0 && <li className="combo-group" role="presentation">{x('noneFound')}</li>}
          </ul>
        )}
      </div>
      {allowLocate && <button type="button" className="btn" onClick={locate}>{x('useLocation')}</button>}
      {status && <p className="small muted" role="status">{status}</p>}
      <p className="tiny muted">{x('privacyNote')}</p>
    </div>
  );
}
