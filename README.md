# Signal Predictor — Tesla Browser App

Learn traffic signal cycles from your own drives, then get a predicted countdown to green in the Tesla browser.

**Live demo:** https://tesla-signal-app.vercel.app

Build verified 2026-10-23: Next.js 15, 109 kB first load, static page.

## Coming soon — and much more
Free, open-source browser apps for your car, in the same clean style as this one:

- Charge + trip tracker
- Parking spot saver
- Road-trip / charger planner
- Commute ETA learner
- Maintenance log
- Eco driving score
- Break timer for long drives
- Lease / mileage tracker

And much more.

## Deploy to Vercel (free, ~3 min)
1. Push this folder to a GitHub repo (or run `npx vercel` in this folder and follow prompts)
2. Vercel → Add New Project → import repo → Framework: Next.js → Deploy (no env vars needed)
3. You get an `https://...vercel.app` URL — HTTPS is required for GPS, Vercel gives it free
4. Open that URL in the Tesla browser, bookmark it

## Use it
1. Open the site in Tesla browser before driving, tap **Start Drive**, allow location
2. Drive your normal route, keep the page open — stops 4s–10min are auto-logged as signals
3. After a drive, rename signals to street names in the list
4. Next drives: within 200m of a learned signal (3+ stops from different cycles), a big countdown appears
5. Export JSON regularly — browser storage can be cleared; Import restores it

## Test without driving
- Open on desktop/phone → **Simulate past drive (test)** injects 5 stops on a 90s cycle at your current location → prediction should appear
- Or Start Drive on your phone browser and walk/drive a route

## How prediction works
Your resume time ≈ green start. The app tries candidate cycles (30–240s), picks the one your green-starts align on tightest, and counts down to the next phase-aligned green. Confidence drops when observations scatter — usually a sensor-triggered (actuated) signal, which honestly can't be predicted this way.

## Limits (by design for MVP)
- Page must stay open/foreground while driving — browsers can't background-track
- Same signal from opposite directions is one cluster for now (heading split is v1.1)
- Data is local to one browser until the Supabase sync in v2

## Dev
```bash
npm install
npm run dev   # http://localhost:3000 — GPS needs localhost or HTTPS
npm run build
```
