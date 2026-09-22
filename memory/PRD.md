# Mana Ooru — PRD

Hyperlocal village super-app for Andhra Pradesh, launched in **Patavala, Kakinada district**. Free for residents. English + Telugu.

## Roles
- **User** — sees the whole app, posts to the feed with a photo (Google sign-in required to post; anyone can read).
- **Employee (shop owner)** — enters a 6-digit shop code on `/employee/login`, then edits their own business (timings, phone, hours, open/closed, EN+TE name & address). Owner-edits automatically flip a saffron **Verified** badge on the shop card.
- **Admin** — `satishkumardangeti123@gmail.com` only. Access to the Admin console with:
  - **Reports** — moderate reported posts (hide / restore / delete).
  - **Broadcast** — send village-wide alert (creates an update and pushes to opted-in devices).
  - **Shop codes** — searchable list of every shop's ID + 6-digit edit code, one-tap copy.
  - **Override edits** — full audit log; PUT `/api/admin/business/{id}` edits any shop without the code.

## Feature summary
### Core
Onboarding (Welcome + language toggle → Location → Interests), Home (location pill, brand block, rotating search, 8 quick-action cards, live buses row, latest updates), Emergency (6 red cards + helplines + sticky 112 CTA), Health directory (chip row + business cards with Open/Closed, distance, hours, Call, Directions), Section screens (Transport / Shops / Services / Government / Agriculture), AI search (Gemini 3 Flash), Settings (EN/TE, location, About).

### Round 2
Emergent Google sign-in, opt-in Village Alerts (push), Telugu/English voice search (Whisper), live "Next buses from Patavala" schedule, community feed with image uploads via Emergent Object Storage, per-shop employee editor.

### Round 3 (this iteration)
Saffron **Verified** badge auto-applied on owner edit, in-post **camera** capture (Take photo / From gallery / Cancel), full **Admin console** (Reports · Broadcast · Shop codes · Audit + admin override edits), single-admin lockdown via `ADMIN_EMAILS`.

## Tech
- **Frontend**: Expo SDK 57 / React Native, expo-router, expo-audio, expo-notifications, expo-image, expo-image-picker (camera + library), expo-secure-store, expo-clipboard, `@react-native-vector-icons/material-design-icons`, `@tanstack/react-query`.
- **Backend**: FastAPI, Motor, MongoDB, httpx, `emergentintegrations` (LLM + Whisper), Emergent Object Storage via `INTEGRATION_PROXY_URL`.
- **Integrations**: Emergent Google Auth · Emergent Push (SuprSend) · Emergent Object Storage · Gemini 3 Flash · OpenAI Whisper.

## Not built (deferred)
- Public admin invite flow (currently a single hard-coded email).
- Business-owner onboarding self-service (admin hands out codes).
- Real APSRTC live feed (schedule is curated).
- Full analytics on posts / broadcasts.

## Business enhancement
The Verified badge + admin-visible audit trail creates the trust surface for a future paid "Verified business" tier while the core app stays free for residents.
