# Mana Ooru — PRD

## Product
Mana Ooru ("Our Village") — hyperlocal digital utility for villages in Andhra Pradesh, India. First launch: **Patavala, Kakinada district**. Free to use. English + Telugu.

## Features shipped
### Core (round 1)
- Onboarding (Welcome + language toggle → Location → Interests).
- Home: location pill, brand block, rotating search bar, 8 quick-action tinted cards, live buses card, latest updates.
- Emergency: 6 red-tinted cards (Ambulance/Police/Fire/Hospitals/Pharmacy/Blood), extra helplines, sticky "CALL 112" CTA, disclaimer.
- Health directory: chip row + business cards with Open/Closed, distance, hours, Call + Directions.
- Section screens: Transport, Shops, Services, Government, Agriculture — all seeded with real Patavala-style data.
- AI-assisted search (Gemini 3 Flash) with rule-based fallback.
- Settings: EN/TE toggle, location switcher, About.

### Round 2 (this iteration)
- **Emergent Google Sign-in** (optional). Session token in `expo-secure-store` / `localStorage`; `/api/auth/session`, `/api/auth/me`, `/api/auth/logout`.
- **Village Alerts (push notifications)**: opt-in switch in Settings; `getDevicePushTokenAsync` → `/api/register-push` → Emergent SuprSend relay; broadcast endpoint `/api/announcements/broadcast`. Data-only FCM payload; iOS + Android build required to test live.
- **Voice Search** (Telugu + English): mic on the Home search bar, `expo-audio` recording → `/api/voice/transcribe` (OpenAI Whisper via Emergent LLM key). Detects language and auto-fires the search.
- **Live Bus Timings**: curated APSRTC-style schedule for Patavala; `/api/buses` returns the next departures with ETA; horizontal card row on Home, refetches every minute.
- **Community feed** (`/feed`): Google-signed-in users can publish news with an optional photo; anyone can read; "Report" button auto-hides a post after 5 reports. Official announcements appear in the same timeline.
- **Photo uploads**: `expo-image-picker` → `POST /api/uploads` → Emergent Object Storage → `GET /api/files/{path}` for display.
- **Business owner / employee editor** (`/employee/login` + `/employee/edit`): each business has a 6-digit `edit_code`. Enter business id + code → 12-hour edit token → edit shop name / subtitle / hours / phone / address / open-now in EN and TE. Live immediately.

## Tech
- **Frontend**: Expo SDK 57 / React Native, expo-router, expo-audio, expo-notifications, expo-image, expo-image-picker, expo-secure-store, `@react-native-vector-icons/material-design-icons`, `@tanstack/react-query`, AsyncStorage.
- **Backend**: FastAPI, Motor, MongoDB, httpx, `emergentintegrations` (LLM + Whisper), Emergent Object Storage via `INTEGRATION_PROXY_URL`.
- **Integrations**: Emergent Google Auth · Emergent Push (SuprSend) · Emergent Object Storage · Gemini 3 Flash · OpenAI Whisper.

## Not built (deferred)
- Admin/moderation console for feed reports.
- Business-owner onboarding self-service (currently codes are seeded / handed out).
- Native camera capture from feed (only library picker for now).
- Real APSRTC live feed (schedule is curated).

## Business enhancement
Business-owner self-serve editing turns a static village directory into a living platform. Combined with feed posts and village alerts, Mana Ooru becomes the default village-scale super-app and unlocks a future paid "Verified business" tier while staying free for residents.
