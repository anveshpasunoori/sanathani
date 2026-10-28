# Nitya — Product Requirements (v0.1)

## Problem
Hindu families remember birthdays, anniversaries and especially death anniversaries (Shraddha) by the
lunar **thithi**, which falls on a different Gregorian date every year. Families abroad also face
time-zone and sunrise differences. Today this means asking a priest or reading a printed Panchangam
every year.

## Users
Telugu-speaking families first (AP and Telangana), in India and abroad; older family members with little
technical experience; anyone who wants daily Panchangam and traditional muhurta guidance.

## Goals (first release)
1. Add a family event in under a minute; it recurs every year by **thithi** or **Gregorian date**.
2. Annual dates are computed from astronomy, not date arithmetic, with the traditional day-selection rule
   for the event type (Udaya thithi for birthdays; Aparahna for Shraddha), Adhika/Kshaya masa, and
   kshaya/vriddhi thithis handled explicitly.
3. Per-event reminders (multiple, any days before, any time), time-zone and DST correct, no duplicates.
4. Daily Panchangam: thithi, nakshatra, yoga, karana with end times; sunrise/sunset; Rahu, Yama, Gulika;
   Abhijit; month, paksha, samvatsara.
5. Ask the Panchangam: natural-language questions answered **only** from computed data and saved events,
   with reasoning, assumptions and sources; never predicts outcomes.
6. Private by default; backup/restore; delete all data.

## Non-goals (this release)
Personal horoscope matching, full Muhurta Shastra (Lagna, Tarabala, Varjyam), solar-calendar traditions
(Tamil, Malayalam), and server-side accounts and sharing. These are planned stages.

## Principles
- **Correctness over decoration.** If data is missing or ambiguous (e.g. thithi changed during the day
  and no time is known), ask the user; never guess.
- **Transparency.** Every computed date shows *why*: thithi, rule, location, tradition, engine version.
- **Respect.** Traditional guidance is labelled as belief and custom; variation across families is stated.

## Acceptance criteria → status in v0.1
| Criterion | Status |
|---|---|
| Create event < 1 minute | ✅ 3 required inputs: type, name, date |
| Thithi and Gregorian recurrence | ✅ plus one-time |
| Dates from astronomical calculation | ✅ astronomy-engine + Lahiri; tested against known festival dates |
| Per-event reminder schedules | ✅ |
| Reminders for future years automatically | ✅ recomputed from the next occurrence each time |
| See/edit upcoming dates | ✅ next 5 years with explanations |
| Works across locations/time zones | ✅ local sunrise; DST-safe wall-clock conversions |
| AI answers from structured data | ✅ rule-based assistant over the engine (LLM layer planned) |
| Explains tradition & assumptions | ✅ on every date and answer |
| Privacy, sharing, notifications | ⚠️ privacy + local notifications + ICS done; account sharing, email/SMS, background push need the backend stage |
| Accessible, mobile-first | ✅ large targets, large-text mode, dark mode, screen-reader labels |

## Stages
1. **(this build)** Engine, local-first PWA, recurrence, reminders, assistant, tests.
2. Supabase backend: auth (email, Google, Apple), sync, RLS (see `schema.sql`), family invitations.
3. Server reminders: scheduled job computes fire times → Web Push / email / SMS; delivery log.
4. LLM assistant: Claude with tool calls into the same engine (`dayPanchang`, `assessDay`,
   `nextObservance`, event search) so the model never calculates dates itself.
5. More traditions (solar months, Vakya), Hindi/Tamil/Kannada/Malayalam/Marathi UI.
