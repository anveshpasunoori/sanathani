// The samagri shopping list a family shares (WhatsApp, Messages, Notes) before a pooja: what is still
// to get first, then what is already ticked off, then the naivedyam to prepare.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

type Text = { en: string; te: string };

export interface ShoppingList {
  heading: string;
  /** e.g. "📅 Fri, 30 Oct" — the next date of the pooja, when known. */
  when?: string;
  samagri: Text[];
  /** Ticked items, by index into `samagri`. */
  checked: Record<number, boolean>;
  naivedyam: Text[];
  te: boolean;
  labels: { toGet: string; alreadyHave: string; naivedyam: string };
}

export function shoppingText(l: ShoppingList): string {
  const say = (t: Text) => (l.te ? t.te : t.en);
  const toGet = l.samagri.filter((_, i) => !l.checked[i]);
  const have = l.samagri.filter((_, i) => l.checked[i]);
  return [
    `🛒 ${l.heading}`,
    ...(l.when ? [l.when] : []),
    ...(toGet.length ? ['', `${l.labels.toGet}:`, ...toGet.map((t) => `☐ ${say(t)}`)] : []),
    ...(have.length ? ['', `${l.labels.alreadyHave}:`, ...have.map((t) => `✓ ${say(t)}`)] : []),
    ...(l.naivedyam.length ? ['', `${l.labels.naivedyam}:`, ...l.naivedyam.map((t) => `• ${say(t)}`)] : []),
    '',
    '— Nitya',
  ].join('\n');
}

/**
 * Opens the phone's share sheet with the text; where there is none (most desktop browsers), copies
 * it instead. Resolves to 'copied' in that case so the screen can say so.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Capacitor.isNativePlatform()) { await Share.share({ title, text, dialogTitle: title }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text }); return 'shared'; }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    // Closing the share sheet without choosing an app is not an error.
    return (e as Error)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}
