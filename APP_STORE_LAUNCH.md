# Stack & Merge — App Store Connect launch copy

Copy/paste the blocks below into App Store Connect. Char limits in headers; everything's already under the cap.

---

## App Name (≤30 chars)

```
Stack & Merge: Tile Puzzle
```

*26 chars. The title is the single highest-weight ranking field — "tile puzzle" is the keyword phrase we want indexed.*

---

## Subtitle (≤30 chars)

```
2048 Merge Combine Numbers
```

*26 chars. Stuffs `2048`, `merge`, `combine`, `numbers` — high-traffic genre keywords. Apple does not double-count between title + subtitle + keyword field, so we don't repeat "tile puzzle" here.*

---

## Keywords field (≤100 chars, comma-separated, no spaces)

```
2048,puzzle,brain,zen,leaderboard,relax,casual,minimal,number,match,combine,chain,addictive
```

*99 chars. Notes:*
- *No plurals — Apple stems, so `puzzle` matches `puzzles`.*
- *No "tile" or "merge" — already in title/subtitle (no double-count).*
- *No competitor names (Apple rejects).*
- *No "best/free/new" filler (Apple disallows).*

---

## Promotional Text (≤170 chars)

*Editable any time without resubmit. Use for launch hype, sales, new features.*

```
Climb the global leaderboard. Build the elusive 2048. Unlock forest, ocean, and midnight themes. No ads, no IAPs — pure puzzle, made by a solo dev.
```

*148 chars.*

---

## Description (≤4000 chars)

*First three lines show before the "Read More" fold — open with the hook.*

```
A clean, fast take on the merge puzzle. Tap to place tiles, chain combos, climb the global leaderboard.

Stack & Merge is the puzzle game I wanted to exist — minimal, immediate, no ads, no in-app purchases. Just you, a 4×4 board, and the chase for a bigger tile.

THREE WAYS TO PLAY
• Classic — reach 2048 with special Wild and Bomb tiles
• Zen — drift forever, no game over, end your run whenever
• Race — 60 seconds, max score, all reflex

GLOBAL LEADERBOARD
Every completed game auto-posts. Pick a handle or stay anonymous as "#42" — your number is permanent, yours from day one. Tap a leaderboard row to peek at any player's number.

UNLOCK AS YOU CLIMB
Hit 1024 points to unlock Forest. 4096 unlocks Ocean. 16384 unlocks Midnight. Twelve achievements track your milestones.

DESIGNED TO FEEL GREAT
• Custom haptic feedback on every merge
• Hand-tuned sound on every tap
• Sub-100ms screen response
• Tile animations that don't waste your time
• Built for one-handed play

NO ADS. NO IN-APP PURCHASES. NO TRACKING.
Stack & Merge is free to download and free to play. No paywalls, no rewarded ads, no upgrades. Anonymous device-level analytics help me improve the game; nothing is sold or shared.

Made with care by a solo developer.
```

---

## What's New (v1.0)

```
First launch! Stack & Merge is now on the App Store.

This version: classic / zen / race modes, global leaderboard with anonymous numbered players, four unlockable themes, twelve achievements, and zero ads.

I'm Connor — a solo dev. If you find a bug, a typo, or have an idea, tap "support" in Settings and message me. I read every one.
```

---

## App Store Connect form fields

| Field | Value |
|---|---|
| **Primary category** | Games |
| **Sub-category** | Puzzle |
| **Secondary** (optional) | Casual |
| **Age rating** | 4+ |
| **Pricing** | Free |
| **In-App Purchases** | None |
| **Support URL** | `https://stack-merge-git-main-coastn.vercel.app/support` |
| **Privacy Policy URL** | `https://stack-merge-git-main-coastn.vercel.app/privacy` |
| **Marketing URL** (optional) | Same as support URL is fine |
| **Copyright** | `2026 Connor Rydel` |
| **Trade Representative Contact** | Use your email + address (Korea-only requirement; can leave blank if not distributing there) |

> If you have a custom Vercel domain (e.g. `stackmerge.app`), swap the URLs above.

---

## App Privacy questionnaire (in App Store Connect)

Answer each row honestly. Stack & Merge is unusually clean — most apps lie here, you don't have to.

| Data category | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info | No | — | — | — |
| Location | No | — | — | — |
| Sensitive Info | No | — | — | — |
| Financial Info | No | — | — | — |
| Health & Fitness | No | — | — | — |
| **Identifiers → Device ID** | **Yes** | No | No | Analytics |
| **Usage Data → Product Interaction** | **Yes** | No | No | Analytics |
| **User Content → Other User Content** *(the optional display name)* | **Yes** | Yes | No | App Functionality |
| Diagnostics | No | — | — | — |
| Browsing History / Search | No | — | — | — |
| Purchases | No | — | — | — |

*"Linked to user" means the data is tied to a real identity (real name, email, etc). The device ID and gameplay events are NOT linked. The display name IS linked (it's a user-chosen identifier).*

---

## App Review notes (paste into the App Review section)

```
No login is required. The app generates a random device ID on first launch — no Apple ID, no email.

To test the leaderboard:
1. Open the app, tap "How to play" if it's your first time
2. Pick any mode (Classic recommended) and finish a run
3. The end-of-game screen shows submission status — it auto-posts to the global leaderboard

To set a display name (optional):
- Tap your identity row on the home screen ("you · #N")
- Pick a unique handle

No special test account needed. All gameplay is offline-capable except the leaderboard, which uses Supabase over HTTPS.

Contact for review issues: connorrydel@coastn.co
```

---

## Screenshots — what you still need to capture

App Store Connect requires screenshots in specific device sizes. **You must capture these from a real device or simulator** — I can't generate them.

| Device | Resolution | Required? | Notes |
|---|---|---|---|
| **6.9" iPhone** (15/16 Pro Max) | 1290 × 2796 | **REQUIRED** | 3-10 images |
| **6.5" iPhone** (older Pro Max) | 1284 × 2778 | Optional | If skipped, Apple auto-scales 6.9" |
| **iPad 13"** | 2064 × 2752 | **REQUIRED** if `supportsTablet: true` | We currently have this on. Either capture iPad shots or change `ios.supportsTablet` to `false` in app.json. |

**Suggested shots (in order):**
1. **Home screen** with the polished hero — STACK&MERGE wordmark, 3 mode cards, leaderboard CTA
2. **Mid-game classic** — board with a chain merge happening, score >500
3. **End overlay** with a strong score and "→ posted" status
4. **Leaderboard** showing top players including your #0 "Connor"
5. **Settings** with Forest theme unlocked (after a 1024+ run)
6. **Zen mode** with the END RUN button visible

Use the iOS Simulator's `⌘S` to take screenshots at exact device resolution.

---

## Final pre-submit checklist

- [ ] `eas login` (your Expo account)
- [ ] Create the app entry in App Store Connect (bundle ID `com.connor.stackmerge`)
- [ ] `eas build --platform ios --profile production` (kicks the build; provides Apple creds when prompted)
- [ ] `eas submit --platform ios --latest` (or use App Store Connect's TestFlight UI manually)
- [ ] Paste copy from this doc into App Store Connect metadata
- [ ] Upload screenshots
- [ ] Fill the App Privacy questionnaire (see table above)
- [ ] Submit for review
