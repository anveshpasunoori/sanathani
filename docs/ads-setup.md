# Ads (Google AdSense, website only)

One small banner at the bottom of **Home** and **Calendar**. Never on stotrams, songs, pooja steps,
japa or deeksha screens. Ads are requested as non-personalized. The code is in `src/ui/Ad.tsx` and
stays switched off until the two ids below are set.

The iPhone and Android apps don't show these ads (Google doesn't allow AdSense inside apps); they
would need AdMob and a native build.

## 1. Apply

1. Sign up at <https://adsense.google.com> with the site `sanathanee.com`.
2. The site needs the privacy page (`/privacy.html`, already in `public/`) and should be live on the domain.
3. Google reviews the site (a few days to two weeks).

## 2. Keep the ads clean — do this before turning ads on

In AdSense → **Brand safety → Content → Blocking controls → All my sites**:

- **Sensitive categories** → block every one, especially:
  Dating, Gambling & Betting, Alcohol, Sexual & Reproductive Health, Get Rich Quick, Weight Loss,
  Cosmetic Procedures & Body Modification, Drugs & Supplements, **Religion** (stops other faiths' and
  conversion ads), **Astrology & Esoteric** (stops rival astrology and paid pooja apps), Politics,
  Black Magic / Occult if listed, Edgy humour / Shocking content if listed.
- **General categories** → block **Food & Drink → Meat & Seafood** (and Restaurants / Fast Food if
  you want to be strict), **Arts & Entertainment → Movies** trailers if they bother users.
- **Ad serving → Personalized ads**: turn off (the app also asks for non-personalized ads).
- **Ad review center**: turn it on and check it now and then. Any single ad you dislike can be
  blocked there, along with its advertiser.

Adult and sexual ads are already forbidden by Google's own policy; the blocks above cover the
rest. No ad network can promise 100%, so the Ad review center is the safety net.

In **Privacy & messaging**, publish Google's consent message for Europe/UK (required there).

## 3. Turn ads on

1. In AdSense → **Ads → By ad unit → Display ads**, make one *horizontal* unit called `Sanathani banner`.
2. From its code, copy `data-ad-client` (`ca-pub-…`) and `data-ad-slot` (a number).
3. In GitHub → repo **Settings → Secrets and variables → Actions → Variables**, add
   `VITE_ADSENSE_CLIENT` and `VITE_ADSENSE_SLOT`.
   (On Vercel: the same two names under Settings → Environment Variables, Production.)
4. Push or re-run the deploy. The deploy also writes `ads.txt` from the client id.

To switch ads off again, delete the two variables and redeploy.
