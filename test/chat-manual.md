# Chat edit QA (manual, ~10 min)

Needs `MODEL_API_KEY` in `.env.local` and `npm run dev`. Open the chat bubble
on a day with a few stops. Edits always ask before applying.

1. Add known: "Add the Statue of Liberty" → confirm card with address +
   Google rating → Confirm → stop appears in the day list with its rating;
   reload, still there.
2. Add gibberish: "Add asdfqwerty xyz" → "No match found", trip unchanged.
3. Add dupe: "Add Chelsea Market" (already on the day) → candidate flagged
   as already-on → Confirm → dupe note, no second row.
4. Add to day: with 2+ days, "Add Central Park to day 2" → Confirm →
   appears on Day 2 (check via overview), not Day 1.
5. Remove exact: "Remove Times Square" → card names the day → Confirm → gone.
6. Remove fuzzy: "Remove the market" (matches Chelsea Market) → one-match card.
7. Remove absent: "Remove the Eiffel Tower" → "No match found".
8. Ambiguous: with two similar stops, "remove high" → pick-one card with
   options → tap one → Confirm removes only that one.
9. Cancel: start any add, tap Cancel → "Kept as is", trip unchanged.
10. Localized: switch to Hindi or Spanish, repeat #1 in that language →
    card and result note are localized.
11. Regression: "Summarize my trip" → prose answer, no card, trip unchanged.
