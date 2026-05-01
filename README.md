# 🌿 ForageMate

**Community-powered map of publicly accessible foraging spots** — fruit trees, berry bushes, nut trees, wild herbs and more. Built with Expo (React Native) + Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 52, React Native, TypeScript |
| Routing | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Maps | React Native Maps + Google Maps |
| Auth | Email/Password + Google Sign-In |
| Location | Expo Location |
| Photos | Expo Image Picker |
| Notifications | Expo Notifications |

---

## Supabase Project

- **Project:** `foragemate`
- **Project ID:** `olvmqirywejembokfujz`
- **Region:** ap-southeast-2 (Sydney)
- **URL:** `https://olvmqirywejembokfujz.supabase.co`

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (auto-created on signup) |
| `plant_categories` | Seeded categories (Fruit Trees, Berries, Nuts, Herbs, Veg, Mushrooms, Flowers, Other) |
| `foraging_spots` | The main pin — lat/lng, plant info, status, moderation |
| `spot_availability` | Community ripeness reports (ripe/not yet/finished/damaged/removed) |
| `spot_verifications` | "I've been here and it's real" community verification |
| `spot_saves` | User bookmarks |
| `spot_comments` | Spot discussion |
| `feedback` | In-app feedback |
| `push_tokens` | Expo push notification tokens |

### Views

| View | Purpose |
|------|---------|
| `spots_with_details` | Spots joined with profile, category, latest status, save count, comment count |

---

## Setup Instructions

### 1. Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Xcode (iOS development)
- Apple Developer Account

### 2. Clone & Install

```bash
cd foragemate
npm install --legacy-peer-deps
```

### 3. Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable **Maps SDK for iOS** and **Maps SDK for Android**
4. Create API keys with appropriate restrictions
5. Replace placeholders in `app.json`:
   ```json
   "config": {
     "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
   }
   ```

### 4. Google Sign-In

1. In Google Cloud Console, go to APIs & Credentials → OAuth 2.0 Client IDs
2. Create an **iOS** client ID (bundle ID: `com.foragemate.app`)
3. Create a **Web** client ID
4. In `app/(auth)/login.tsx`, replace:
   ```ts
   webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
   iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',
   ```
5. In Supabase Dashboard → Authentication → Providers → Google: enable and add the web client credentials

### 5. Supabase Auth Settings

In [Supabase Dashboard](https://supabase.com/dashboard/project/olvmqirywejembokfujz):

- **Auth → URL Configuration:**
  - Site URL: `foragemate://`
  - Redirect URLs: `foragemate://`
- **Auth → Providers:** Enable Email, Google
- **Auth → Email:** Enable "Confirm email" if desired

### 6. Make yourself an admin

After signing up with your account:
```sql
UPDATE profiles SET is_admin = TRUE WHERE id = 'YOUR_USER_UUID';
```
Run this in Supabase Dashboard → SQL Editor.

### 7. Run the app

```bash
npx expo start
```

Scan QR with Expo Go, or press `i` for iOS Simulator.

---

## App Structure

```
foragemate/
├── app/
│   ├── _layout.tsx          # Root layout + auth guard
│   ├── onboarding.tsx       # 4-slide onboarding
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx        # Email + Google auth
│   └── (tabs)/
│       ├── _layout.tsx      # Bottom tab navigator
│       ├── map.tsx          # 🗺️ Main map with pins + filter strip
│       ├── add.tsx          # 📌 3-step add spot form
│       ├── saved.tsx        # 🔖 Saved/bookmarked spots
│       ├── profile.tsx      # 👤 User profile + submitted spots
│       └── admin.tsx        # 🛡️ Moderation queue (admin only)
├── lib/
│   └── supabase.ts          # Supabase client
├── constants/
│   └── theme.ts             # Colors, fonts, radii
├── app.json                 # Expo config
└── package.json
```

---

## Key Features

### Map Screen
- Google Maps with custom round emoji pins per category
- Horizontal category filter strip
- Spot detail bottom sheet with: category tag, ripeness status, quality stars, verify count, save count, comment count, access notes, description
- "Verify" and "Save" action buttons on each spot
- User location button

### Add Spot (3-step form)
- **Step 1:** Category selector (emoji chips), title, plant name, scientific name, description
- **Step 2:** GPS location capture, access notes, public land toggle, quantity estimate, quality rating stars
- **Step 3:** Photo upload, summary review, responsible foraging disclaimer
- Submits as `pending` for admin review

### Admin Moderation
- Only visible to `is_admin = true` users
- Shows all pending spots with full details
- One-tap Approve / Reject

### Spot Status System
Community members can report:
- 🟢 Ripe now
- 🟡 Not yet ripe
- 🔴 Season finished
- ⚠️ Damaged
- ⛔ Removed

---

## Building for App Store

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

---

## Differences from Watchly

| | Watchly | ForageMate |
|--|---------|-----------|
| Purpose | Community safety incidents | Foraging spots |
| Pin types | Incident categories | Plant categories (8 types) |
| Core action | Report an incident | Add a foraging spot |
| Extra fields | None | Plant name, scientific name, quantity, season, public land flag |
| Community features | View pins | Verify, save, ripeness reporting |
| Moderation | Approve/reject reports | Approve/reject spots |
| Safety disclaimer | Emergency services | Plant ID / foraging safety |

---

## Responsible Foraging Notice

ForageMate is a community tool. All users should:
- Only forage on publicly accessible land
- Independently verify plant identification from multiple sources
- Never consume any plant they are not 100% certain of
- Take only what they need, leave plenty for wildlife

This app does not constitute expert botanical advice.
