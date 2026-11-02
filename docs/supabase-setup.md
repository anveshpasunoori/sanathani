# Turning on accounts (Supabase)

Accounts are built in but switched off until the app knows your Supabase project. About 10 minutes.

## 1. Create the project
1. Go to <https://supabase.com>, sign up, and click **New project** (the free plan is enough).
2. Pick a name (e.g. `thithi-reminder`), a strong database password, and the region nearest your family
   (e.g. *Mumbai* for India, *East US* for the US).

## 2. Create the table
1. In the project, open **SQL Editor → New query**.
2. Paste the contents of `supabase/migrations/0001_user_state.sql` and click **Run**.
   This creates one private row per user, protected by Row Level Security.
3. Do the same with `0002_security.sql` and then `0003_groups.sql` (deeksha groups: events, chat, private
   messages, nearby groups, block and report). Groups use Realtime for live chat; the migration turns it on
   for its tables. Reports filed in the app appear in **Table Editor → reports** for you to review.

## 3. Email sign-in (one-time code)
1. **Authentication → Providers → Email**: make sure it is enabled.
2. **Authentication → Email Templates → Magic Link**: make sure the template includes `{{ .Token }}`
   so the email shows the 6-digit code (the link works too). For example:
   `Your Sanathani code is {{ .Token }}` followed by the default link.
3. The built-in mailer is rate-limited (a few emails per hour) — fine for testing. For your family,
   add an SMTP provider under **Project Settings → Authentication → SMTP** (e.g. Resend, Brevo, SES).

## 4. Google sign-in (optional)
1. In Google Cloud Console create an **OAuth client ID** (type *Web application*).
   Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase: **Authentication → Providers → Google** → paste the client ID and secret → enable.

## 5. Allowed URLs
**Authentication → URL Configuration**:
- *Site URL*: where the app is hosted (e.g. `https://thithi.example.com`).
- *Redirect URLs*: add the same, plus `http://localhost:5173` for development.
- For the iPhone and Android apps, also add `com.anveshpasunoori.sanathani://auth-callback` (sign-in opens in the phone's browser and returns to the app through this link).

## 6. Connect the app
1. **Project Settings → API**: copy the *Project URL* and the *anon public* key.
2. In the project folder: copy `.env.example` to `.env.local` and fill both values in.
3. Restart `npm run dev` (or rebuild). Settings → **Account & sync** now shows the sign-in options.

The anon key is meant to be public; Row Level Security is what keeps each family's data private.
Never put the *service_role* key in the app.

## What syncs
Family events, birth profiles (horoscope), settings, and deletions. The reminder delivery log and
cached dates stay on each device. Edits made offline sync when the connection returns; if two devices
edit the same event, the most recent edit wins.

## Coming next
Family sharing (invite relatives to view or edit shared events), phone-number sign-in (needs an SMS
provider such as Twilio), Apple sign-in (needs an Apple Developer account), and server push reminders.


## Testing on your Mac (local Supabase)

Everything above can be tried locally first (Docker Desktop running):

```bash
supabase start          # first run downloads the images; applies every migration in supabase/migrations
node scripts/test-groups.mjs   # checks the group security rules end to end with four test users
```

Put the printed `API_URL` and `ANON_KEY` in `.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
and restart `npm run dev`. Sign-in codes arrive in the local mailbox at http://127.0.0.1:54324. The email
template with the 6-digit code is `supabase/templates/magic_link.html` — use the same text in the live
project (step 3 of email sign-in above).
