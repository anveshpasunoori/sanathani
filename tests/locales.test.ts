import { EVENT_FORM_TEXT } from '../src/locales/eventForm';
import { HOME_TEXT } from '../src/locales/home';
import { RITUAL_TEXT } from '../src/locales/rituals';
import { PLACE_TEXT } from '../src/locales/placePicker';
import { HOROSCOPE_INTRO_TEXT } from '../src/locales/horoscopeIntro';
import { EVENTS_TEXT } from '../src/locales/events';
import { CALENDAR_TEXT } from '../src/locales/calendar';
import { POOJA_TEXT } from '../src/locales/pooja';
import { FOLLOW_TEXT, REMINDER_TEXT } from '../src/locales/reminders';
import { SETUP_TEXT } from '../src/locales/setup';
import { SETTINGS_TEXT } from '../src/locales/settings';
import { ACCOUNT_TEXT } from '../src/locales/account';
import { ASK_TEXT } from '../src/locales/ask';
import { MUHURTAM_TEXT } from '../src/locales/muhurtam';
import { HOROSCOPE_TEXT } from '../src/locales/horoscope';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('screen text tables', () => {
  for (const [name, table] of Object.entries({ HOME_TEXT, EVENT_FORM_TEXT, RITUAL_TEXT, PLACE_TEXT, HOROSCOPE_INTRO_TEXT, EVENTS_TEXT, CALENDAR_TEXT, POOJA_TEXT, REMINDER_TEXT, FOLLOW_TEXT, SETUP_TEXT, SETTINGS_TEXT, ACCOUNT_TEXT, ASK_TEXT, MUHURTAM_TEXT, HOROSCOPE_TEXT })) {
    it(`${name}: every language keeps the English placeholders and has no blanks`, () => {
      for (const [lang, strings] of Object.entries(table)) {
        for (const [key, en] of Object.entries(table.en)) {
          const s = (strings as Record<string, string>)[key];
          expect(s.trim(), `${lang}.${key}`).not.toBe('');
          expect(placeholders(s), `${lang}.${key}`).toBe(placeholders(en));
        }
      }
    });
  }
});
