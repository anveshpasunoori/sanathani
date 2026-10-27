import { useEffect, useState } from 'react';

export type Route =
  | { tab: 'home' }
  | { tab: 'calendar'; date?: string }
  | { tab: 'events'; id?: string; edit?: boolean; draft?: string }
  | { tab: 'ask'; q?: string }
  | { tab: 'astro' }
  | { tab: 'muhurtam'; activity?: string }
  | { tab: 'pooja'; id?: string }
  | { tab: 'stotram'; id: string }
  | { tab: 'login' }
  | { tab: 'songs'; deity?: string; song?: string }
  | { tab: 'settings' };

function parseHash(): Route {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const [tab, id, sub] = path.split('/');
  const params = new URLSearchParams(query);
  switch (tab) {
    case 'calendar': return { tab, date: id || undefined };
    case 'events': return { tab, id: id || undefined, edit: sub === 'edit', draft: params.get('draft') ?? undefined };
    case 'ask': return { tab, q: params.get('q') ?? undefined };
    case 'astro': return { tab };
    case 'muhurtam': return { tab, activity: params.get('activity') ?? undefined };
    case 'pooja': return { tab, id: id || undefined };
    case 'stotram': return id ? { tab, id } : { tab: 'pooja' };
    case 'login': return { tab };
    case 'songs': return { tab, deity: id || undefined, song: sub || undefined };
    case 'settings': return { tab };
    default: return { tab: 'home' };
  }
}

export function href(r: Route): string {
  switch (r.tab) {
    case 'calendar': return `#calendar${r.date ? `/${r.date}` : ''}`;
    case 'events': {
      const q = r.draft ? `?draft=${encodeURIComponent(r.draft)}` : '';
      return `#events${r.id ? `/${r.id}${r.edit ? '/edit' : ''}` : ''}${q}`;
    }
    case 'ask': return `#ask${r.q ? `?q=${encodeURIComponent(r.q)}` : ''}`;
    case 'astro': return '#astro';
    case 'muhurtam': return `#muhurtam${r.activity ? `?activity=${r.activity}` : ''}`;
    case 'pooja': return `#pooja${r.id ? `/${r.id}` : ''}`;
    case 'stotram': return `#stotram/${r.id}`;
    case 'login': return '#login';
    case 'songs': return `#songs${r.deity ? `/${r.deity}${r.song ? `/${r.song}` : ''}` : ''}`;
    case 'settings': return '#settings';
    default: return '#home';
  }
}

export function go(r: Route) {
  location.hash = href(r);
  window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
