# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Leisure travelers building a day-trip shortlist before or during a city visit. Also demoed live as a pitch on phone and desktop.

## Product Purpose

Nomad plans a trip from saved Instagram collections: pick a collection, check posts, plan by saved collection or auto-create, then review the multi-day trip and step into each day — ordered stops on a live map with transit times, food picks, and real Instagram reels. Success is a finished trip the traveler can follow.

## Positioning

Reels + itinerary: real Instagram reels embedded alongside the map-and-stops day plan, ranked by views — a neighboring trip planner copies the map or the list, not the reels-in-the-flow mechanism.

## Operating Context

Single Next.js app (`npm run dev`, http://localhost:3000). Traveler flow: collections → collection (check posts, see their reels) → plan by saved or auto-create → trip view (day cards with landmark covers) → day view (stops, map, food, reels). Trips persist per city in localStorage. Layout is phone-first and scales to desktop pitch demos.

## Capabilities and Constraints

- Cities: New York, Chicago, Miami, Italy, Mumbai with static coords; per-city trips persisted locally.
- Google Maps JS + Places + Directions behind /api routes; keys set, billing deferred — local fallbacks (places list, ~estimates, map placeholder) cover billing-off.
- Reels: Instagram embeds from curated permalinks in data/reels.json, top 5 by views; colored tiles when embeds are unavailable. Same rail in collection and day views.
- Planning: checked posts mirror into the trip (deselected collection stops removed, hand-added kept); one place once per trip; free Optimize, Compare, category food row, WhatsApp share, trip-aware chat assistant.
- Day covers: Wikimedia Commons landmark photos (pinned per collection where set), picsum fallback.
- No backend or accounts; all data local except Google, Instagram, and Commons calls. Maintained plan-logic tests via `npm test` (node --test).
- Undecided: billing switch-on timing for live durations, search, reviews, and Place Photos.
- Next phase: import real saved collections from an Instagram profile (today's collections are local data).
- Direction: Instagram-embedded planning — enter from IG, search country/location, set trip days, then saved-collections or auto-create.
- Days overview lists every day with a highlight picture and short blurb; stepping in opens the day view (current app) with a smooth day toggle at the top.
- Food categories (local special, coffee, lunch, dinner, fine dine) drive recommendations within 10 km of your stops, with Google ratings displayed; unlocated spots show city-wide without walk claims.
- First launch shows a language picker (English, Mandarin, Hindi, Spanish, French, Italian) then a 6-card How-it-works guide; a top-bar ? button reopens it anytime.
- Every view carries numbered page-hint dots (collections 2, collection 4, overview 3, day 5, stop 2, stays 3) with a step-through panel; Got-it dismisses per view, ? menu replays them.

## Brand Commitments

Name: Nomad. No confirmed logo, voice, palette, or type commitments.

## Evidence on Hand

- Working app: app/page.js, components/MapView.js; logic in lib/ (route, score, plan); data in data/*.json; tests in test/.
- Decisions: DECISIONS.md. No testimonials, pricing, or benchmarks — do not fabricate.

## Product Principles

1. One flow: map, list, times, and reels stay in a single scroll.
2. Real content over placeholders wherever the demo allows.
3. Billing-free demo first; live Google data lights up with no code change.
4. Phone-first, desktop-capable.
