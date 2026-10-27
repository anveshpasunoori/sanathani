# Sanathani — roadmap

What is left before the App Store / Play Store release, in suggested order. Tick items as they land.

## Decisions so far
- App name **Sanathani**, app ID `com.anveshpasunoori.sanathani`, built with Capacitor 8 (iOS + Android) from the same web code.
- Languages: English, Telugu, **Kannada, Tamil, Malayalam, Hindi, Marathi**, and (added 2026-10-26) **Gujarati, Bengali, Odia, Punjabi, Rajasthani/Marwari (one language), Bhojpuri**. Punjabi shows stotrams in Devanagari.
- Smooth voices: **Microsoft Azure neural voices**, generated once on the Mac and bundled as audio (no key inside the app).
- Vedic hymns (svaras) are taught only from real chanters' recordings; the computer voice is not used for them.
- Purusha Suktam / Sri Suktam: search for a clean, freely licensed edition with svaras (Taittiriya version preferred) and show it before adding.

## 1. Languages
- [x] Language picker with all seven languages (Settings and first-run setup).
- [x] Shared screen text (tabs, Panchangam headings, buttons) in Kannada, Tamil, Malayalam, Hindi and Marathi.
- [x] Panchangam names (thithi, paksha, nakshatra, months, weekdays, rashis) in each language, using each region's own names.
- [x] Stotrams, 108-name lists and pooja mantras shown in each language's script (Tamil with superscript ²³⁴ marks); fonts for every script; long words wrap on phones.
- [x] Home screen and the add/edit event form fully in all seven languages (text tables in `src/locales/`), including daily guidance, festival names, Panchangam traditions, yoga/karana/year names, relationships, month names and times. The place search box is done too.
- [x] Family list & event details, and the Calendar (month grid, filters, day details with its own Panchangam), in all seven languages.
- [x] Pooja tab screens (pooja list and pages, stotram reader, Chant with me, devotional songs): all screen text, pooja and deity names, regions, stotram titles in each script.
- [x] Remaining screens: Muhurtam, Horoscope & Matching & Life themes, Settings, Account, Ask, first-run setup. Planet, tara, life-area, colour and deity names are translated too.
- [x] Chart reading view in the Horoscope tab (2026-10-27): nature, yogas, nine planets with dignity and strength, twelve houses, Saturn phases, Ashtakavarga (`src/engine/chartReading.ts`, `src/ui/ChartReading.tsx`). Readings in English, Telugu, Kannada, Tamil, Malayalam, Hindi and Marathi (first pass, wording in `src/locales/chartReading*.ts`); other languages show English.
- [x] Horoscope readings in kn/ta/ml/hi/mr (2026-10-27, first pass): daily reading (Chandra bala, Tara bala), big-picture transits, Sade Sati labels, dasha text, Life themes (house themes and "why" reasons), the how-it's-calculated notes and the Jathaka card note. Wording in `src/locales/reading*.ts`; Telugu now has the notes too.
- [x] Matching (koota) details in te/kn/ta/ml/hi/mr (2026-10-27, first pass): what each koota looks at, bride/groom details (varna, vashya, yoni animals, gana, nadi), dosha cancellations, Kuja dosha lines and notes, and how it is calculated. Wording in `src/locales/match*.ts`. The Jathaka card image stays English and Telugu.
- [ ] The six newer languages (gu/bn/or/pa/raj/bho) still show the Chart reading, daily reading, Life themes and Matching in English.
- [ ] Tamil and Kerala families usually use the 10-porutham method rather than Ashtakoota; consider adding it (the Tamil and Malayalam notes say it is not included).
- [ ] Ask: understand questions typed in kn/ta/ml/hi/mr (suggested questions already work in every language).
- [x] Festivals follow the region, not the language: Ugadi (Telugu, Kannada), Gudi Padwa (Marathi), Chaitra Navratri / Nav Samvatsar (North), plus Gowri Habba, Bali Padyami, Karva Chauth, Govardhan Puja, Bhai Dooj / Bhau Beej / Bhagini Hasta Bhojanam and Chhath for the regions that keep them. The new-year pooja is named after the region's festival.
- [x] Tamil Nadu and Kerala solar calendars (`src/engine/solar.ts`): Tamil months by the sunset rule, Malayalam months by the three-fifths-of-daytime rule, Tamil year names and the Kollam Era; shown on Home, Calendar (solar-month view), Muhurtam and Ask. Festivals: Puthandu, Vaikasi Visakam, Aadi Perukku, Aadi/Thai Amavasai, Skanda Sashti, Karthigai Deepam, Vaikunta Ekadashi, Arudra Darisanam, Bhogi/Thai Pongal/Mattu Pongal, Thaipusam, Maasi Magam, Panguni Uttiram, Hanumath Jayanthi; Vishu, Karkidakam (Ramayana Masam), Karkidaka Vavu, Chingam 1, Onam, Ashtami Rohini, Mandala season, Thrikarthika, Thiruvathira, Makaravilakku. Checked against Drik Panchang dates for 2025–26.
- [x] Six more languages (2026-10-26): every screen translated as a first pass in Gujarati, Bengali, Odia, Punjabi (Gurmukhi), Rajasthani/Marwari and Bhojpuri; stotrams converted to Bengali, Gujarati and Odia script (Devanagari for Punjabi, Rajasthani, Bhojpuri).
- [x] Bengal and Odisha solar calendars (Bengal rule: the day after the sankranti, two days if past midnight; Odisha rule: the sankranti day if before midnight; Bangabda years) and the Gujarati calendar (Vikram Samvat from the day after Diwali). Festivals: Poila Boishakh, Pana Sankranti, Raja Sankranti, Durga Puja (Shashthi, Ashtami), Kojagari Lakshmi Puja, Kali Puja, Jagaddhatri Puja, Jamai Shashthi, Snana Purnima, Rath Yatra, Kumar Purnima, Prathamastami, Dol Jatra; Bestu Varas, Labh Pancham, Uttarayan; Lohri, Vaisakhi, Gangaur, Hariyali/Kajari/Hartalika Teej, Jitiya. New-year pooja guides for Gujarat, Bengal and Odisha.
- [ ] Native-speaker review of the six new languages (Bhojpuri and Marwari especially; Punjabi and Odia dates fall back to Hindi / English where a browser lacks those locales).
- [ ] Azure voices for Bengali, Gujarati and Odia are configured (`src/data/voice.ts`); generate them with `npm run voice -- --lang bn,gu,or` once the key is in.
- [ ] Pooja steps in every language: the pipeline is built (`npm run translate-poojas`, `scripts/translate-poojas.ts` → `src/data/poojaText/<lang>.json`, read by `src/data/poojaText.ts` with a "Show in English" toggle). Needs ANTHROPIC_API_KEY in `.env.local`; run `-- --lang te` first and review, then the rest. Re-run after editing any pooja text (only changed strings are sent).
- [x] Family events by the solar calendar (`src/engine/solarRecurrence.ts`): "by nakshatra in the Malayalam/Tamil month" (Kerala Pirannal and Shraddham) and "by thithi in the Tamil month" (Tamil Shraddham). Kerala stars count only if they last 6 nazhika after sunrise; when the day comes twice in a month the family chooses the first or the second. New events in those traditions default to these.
- [ ] Confirm with Kerala and Tamil purohits which kala (sunrise, Aparahna…) decides the Shraddham nakshatra, and whether first or second is usual when it repeats.
- [ ] Vakya Panchangam option (many Tamil temple calendars use it; month starts can differ by a day from the Drik calculation used here).
- [ ] Bengal and Odisha calendars; more regional festivals, checked with people from each region.
- [ ] Pooja guide content for kn/ta/ml/hi/mr (when to do it, steps, samagri, naivedyam, regional customs, next-date labels) — the pages say it is in English for now.
- [ ] Short thithi names for the narrow Calendar cells in each Indian language (now cut off with "…"; English uses Prat, Dwi…). Needs native speakers to choose the abbreviations.
- [ ] Messages worked out by the engine are still English: the "why this date" notes under thithi choices and next observances, and the Ask answers.
- [ ] Translate pooja steps, regional customs and descriptions.
- [ ] Have a native speaker check each language (names and screen text are a first pass).
- [ ] Tamil solar-calendar tradition (months by the sun's sign), if Tamil users are a priority.
- [ ] Songs stay in their original language (bhajans are sung as written).

## 2. Smooth voice (Azure)
- [ ] You: create the Azure Speech resource and put the key in `.env.local` (see below).
- [x] Script that turns every stotram line into an audio file per language (`npm run voice -- --lang te`, `scripts/build-voice.ts`), and the player uses those files — slow speeds play the same natural audio word by word or half by half (word timings from Azure), never stretched. About 46–50k characters per language; all six fit the free tier (500k/month).
- [ ] Run it once the key is in: `npm run voice -- --lang te` first, listen, then the other languages.
- [ ] Remove the phone's computer voice once the audio is in place.

## 3. Vedic hymns
- [ ] Find a clean edition of Purusha Suktam and Sri Suktam with svaras; review it together.
- [ ] Recordings by your guru/purohit (with permission); split into lines with `scripts/split-chant.mjs`.

## 3b. Regional pooja customs
- [x] "Customs in your region" on 10 festival poojas (Ganapathi, Lakshmi, Ugadi, Navaratri, Saraswati, Krishna, Sankranti, Hanuman, Subrahmanya, Shiva) for Telugu (Andhra Pradesh and Telangana together), Karnataka, Tamil Nadu, Kerala, Maharashtra and North India.
- [x] One Telugu Panchangam instead of separate Andhra Pradesh and Telangana calendars; older saves, backups and cloud copies are converted when loaded (`upgrade` in `src/data/traditions.ts`). The calendar follows the language chosen in setup and Settings.
- [ ] Have someone from each region check their region's customs.
- [ ] Translate the non-Telugu regions' customs (with the language work).
- [x] Compute the solar-calendar dates (Puthandu, Vishu, Pongal days) once Tamil/Kerala calendars are added.
- [x] The new-year pooja has each region's own picture, timing, samagri, naivedyam and steps (Ugadi with bevu-bella, Gudi Padwa, Puthandu kanni, Vishukkani, Nav Samvatsar with Ghatasthapana) — `byTradition` in `src/data/poojas.ts`.
- [x] Thiruppavai pooja for Dhanurmasam (Margazhi), with the day's pasuram number, Koodaravalli and Goda Kalyanam dates.
- [x] Thiruppavai text: thaniyans and all 30 pasurams (Telugu-script edition by Sunder Kidāmbi, prapatti.com), shown in proper Tamil spelling for Tamil readers (`tamilTextFromTelugu`).
- [ ] Thiruppavai: confirm prapatti.com's terms for this edition before release; an Andal picture (it uses the Krishna picture for now); have a Srivaishnava reader check the repaired text.
- [x] Festival & pooja reminders: 🔔 Remind me on Calendar festivals and pooja pages, the day before at the reminder time (phone notifications and in-app); list in Settings (`src/reminders/festivals.ts`).
- [x] Samagri shopping list: share what is still to get (WhatsApp / Messages / Notes) from a pooja's Samagri tab.
- [ ] Other festivals kept differently by region (Sankranti/Pongal, Navaratri, Diwali) could get their own regional guides the same way.

## 4. App store readiness
- [x] Reminders that arrive while the app is closed: the phone apps schedule the next 60 reminders on the device (`src/ui/nativeReminders.ts`), rebuilt on launch, return to the app and any change; text in the chosen language; tapping opens the event.
- [ ] Test reminders on a real iPhone and Android phone (permission prompt, delivery while closed, after a restart, the Android status-bar bell icon). Android may deliver a few minutes late unless exact alarms are allowed.
- [ ] Sign in with Apple (Apple requires it alongside Google sign-in).
- [ ] Privacy policy page (mention Open-Meteo / BigDataCloud place lookups and Azure-generated audio).
- [ ] Content rights: song recordings, the Ayyappa picture, any modern songs' lyrics.
- [ ] Supabase: run `0002_security.sql`, add the app redirect URL, turn on CAPTCHA.
- [ ] Home-screen widget (2026-10-27): data, bridge and native code written; needs Xcode (add the widget target + App Group) and Android Studio to build and test — see `docs/widget.md`.
- [ ] Local Supabase for testing (planned, not started): `brew install supabase/tap/supabase`, `supabase init`, `supabase start` (Docker Desktop running), put the printed URL and anon key in `.env.local`. Login codes arrive in the local inbox at http://127.0.0.1:54324; Google sign-in needs OAuth credentials. Then the "login page first" gate (paused 2026-10-26).
- [ ] Web host security headers, domain, `VITE_SITE_URL`.
- [ ] Install Xcode and Android Studio; first test builds on real phones.
- [ ] Store listings: screenshots, descriptions, content rating.

## Azure key setup (for item 2)
1. Sign in at https://portal.azure.com (free account).
2. Create a resource → search **Speech** → Create. Pricing tier **Free F0**; region e.g. *Central India*.
3. Open the resource → **Keys and Endpoint** → copy **Key 1** and the **Location/Region**.
4. Add to `.env.local` in this folder (never commit it):
   ```
   AZURE_SPEECH_KEY=...
   AZURE_SPEECH_REGION=centralindia
   ```
   These names have no `VITE_` prefix on purpose, so they never get built into the app.
