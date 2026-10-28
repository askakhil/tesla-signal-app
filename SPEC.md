# Tesla Signal Predictor — MVP Spec
Date: 2026-10-23

## Idea in one line
Web app in Tesla browser → GPS logs where/when you stop & resume → learns each signal's cycle → next time you approach, shows predicted seconds to green.

## What works / what won't
| Reality | Implication |
|---|---|
| Tesla browser = Chromium, needs HTTPS for Geolocation API | Deploy on Vercel (HTTPS free) — OK |
| Browser only tracks while open & in foreground | No background logging. App must stay open while driving |
| GPS in car: ~5-15m accuracy, 1 update/sec via watchPosition | Good enough if signal cluster radius = 25-40m |
| Many US signals are actuated (sensors), not fixed-time | Those won't be predictable. App must label confidence; fixed-time signals will converge, actuated ones won't |
| Different cycle by time-of-day / weekday | Store observations bucketed by hour + weekday/weekend |

## MVP flow
1. Tap Start Drive → `navigator.geolocation.watchPosition()`
2. Detect stop: speed < 0.5 m/s for >3s → record stop_start, lat/lng
3. Detect resume: speed > 2 m/s → record stop_end (= approx green start for your direction)
4. Cluster stops: same cluster if within 35m of existing centroid → same "signal" (later: split by heading/bearing)
5. After drive: save stops locally first

## Prediction algorithm (v1, keep simple)
For a signal cluster with observations of green-start times G1, G2, ...
- Try candidate cycle lengths C = 30,45,60,75,90,100,120,150,180s
- For each C, compute phase = Gi mod C, measure circular spread
- Pick C with tightest spread (lowest variance) → that's likely cycle
- Prediction: next_green = smallest t > now with t mod C == phase
- countdown = next_green - now, confidence = based on spread + #observations
- Need: min 3 observations on different cycles (not same stop) to show prediction, 5+ for "high confidence"
- Also store red duration from stop lengths, but green-start phase is the cleaner signal

Why this works: even if you arrive at random times in red, your resume time is anchored to green start (+ queue delay). Queue delay is noise — median / tightest-cluster filtering helps.

## Data model
```
Signal { id, lat, lng, headingBucket, observations: [], cycleSec?, phaseOffset?, confidence }
StopEvent { signalId, arrivedAt, resumedAt, stopDurationSec, lat, lng, heading }
Drive { id, startedAt, endedAt, stops: StopEvent[] }
```

## Storage — start free / local
- v1: localStorage / IndexedDB (Dexie) — $0, no login, works offline, data stays in car browser
  - Risk: Tesla browser may clear storage → export/import JSON button in v1
- v2 (if needed): Supabase or Neon free tier + Next.js API routes — sync phone ↔ Tesla

## Stack
- Next.js (App Router) + TypeScript + Tailwind — deployed to Vercel free
- No map in v1 (heavy, Tesla browser is slow). Big text UI: nearest signal, countdown circle, confidence
- v1.1: Leaflet + OpenStreetMap (free) for a simple map, only if Tesla browser handles it smoothly

## UI for Tesla screen
- Huge countdown number, red/green state, signal # / nearest cross-street label (manual name)
- Start/Stop Drive big button, last signals list, observations count per signal
- Dark mode, high contrast, no small tap targets

## Build order
1. Scaffold + geolocation + stop/resume detection + IndexedDB
2. Clustering + drive history list
3. Cycle-fitting + live countdown on approach (within 150m + heading towards it)
4. Test drive same route 3x, tune radius / queue-delay filter
