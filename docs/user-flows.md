# User flows & screens

## Navigation
Bottom tab bar (top bar on desktop): **Home · Calendar · Family Events · Ask · Settings**. Hash routes
(`#home`, `#calendar/2026-11-18`, `#events/<id>`, `#events/new`, `#ask?q=…`, `#settings`) so the
browser Back button works.

## Onboarding (5 steps, all skippable after step 1)
1. Language (Telugu / English)
2. Panchangam tradition (AP Telugu, Telangana Telugu, Kannada, Marathi, North Purnimanta)
3. Location (city list or device location → lat/lon + time zone)
4. Default reminder time + **notification permission** (asked here, with context)
5. First event: Add / Show sample events / Skip

## Add event (target < 1 minute)
Type chips → name + relationship → original date (+ optional time, place) → repeat mode.
For thithi recurrence the form resolves the lunar date live:
- one thithi all day, or time given → shows "Kartika Krishna Navami" with explanation
- thithi changed that day, no time → **asks** which applies (shows both with time ranges)
- "I already know the thithi" → manual month / paksha / thithi / Adhika
Preview shows the next three observances with reasons. Reminder chips (on day, 1, 3, 7, custom) with
per-reminder time. "More details" holds title, observance rule, Adhika policy, tradition, nakshatra,
rituals, notes, photo, privacy.

## Natural-language add
Ask: "Remember my wedding anniversary on the Telugu calendar and remind me 3 days before" →
confirmation card → **Review & save** opens the form pre-filled → user adds the date → save.

## Event detail
Next observance (large) + reason + cautions → original details → reminder list with
Scheduled / Delivered / Missed status → coming 5 years → Edit · Add to calendar (.ics) · Delete.

## Calendar
Gregorian month or Hindu lunar month (new moon → new moon). Cells: date, thithi, dots for family
events / festivals / vratas; filters; year jump. Tap a day → detail: thithi and nakshatra with start
and end times, observances with the rule used, family events, rituals, source.

## Ask
Free text + suggestion chips. Answers show: title, key facts, sections (considerations, windows,
periods to avoid), caution, source/assumptions, and actions (Review event, Open event).

## Settings
Language · tradition · location · default reminder time & notification status · ICS export ·
theme & text size · backup / restore / delete all · account & sharing (planned) · calculation method.
