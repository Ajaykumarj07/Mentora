# Mentora AI — AI-Powered Learning Assistant

> An intelligent, gamified study companion powered by Google Gemini AI. Runs as a Web App **and** Android App from a single codebase.

---

## ✨ Features

- 🤖 **AI Doubt Tutor** — Conversational AI teaching assistant
- 📝 **Smart Notes** — Auto-generate structured notes from topics
- 🧠 **Quiz Generator** — AI-generated adaptive quizzes with XP rewards
- 🗺️ **Study Roadmaps** — Personalized day-by-day study plans
- 🔥 **Gamification** — XP, coins, levels, streaks, leaderboard
- 🎨 **4 Themes** — Dark, Light, Matrix, Nordic
- 📱 **Android App** — Native Android via Capacitor (single codebase)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer Motion) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firestore |
| AI Provider | Google Gemini + Groq (multi-provider) |
| Backend | Express.js (AI proxy server) |
| Mobile | Capacitor 7 (Android) |

---

## 🚀 Development

### Prerequisites

- Node.js >= 20.19.0
- npm >= 10
- (For Android) Android Studio + JDK 17 + Android SDK 34

### Install Dependencies

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase and AI API keys:

```bash
cp .env.example .env
```

### Run Web Dev Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🌐 Web Build

```bash
npm run build
```

Output is in the `dist/` directory.

---

## 📱 Android Development

### First-Time Setup

Make sure Android Studio is installed with SDK 34 and a virtual device (emulator) configured.

### Build and Sync for Android

```bash
# Full build + sync to Android project
npm run cap:build:android
```

This runs `vite build` then `npx cap sync android` to copy web assets.

### Open in Android Studio

```bash
npm run cap:open
```

Then in Android Studio: **Run ▶ Run 'app'** to launch on emulator or physical device.

### One-Command Deploy to Device

```bash
npm run cap:run:android
```

---

## 📦 APK Generation

### Debug APK (for testing)

```bash
# In Android Studio
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Or via Gradle CLI (from the android/ directory):
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Signed Release APK (for distribution)

1. Generate a keystore (one-time setup):
```bash
keytool -genkey -v -keystore mentora-release.jks -alias mentora -keyalg RSA -keysize 2048 -validity 10000
```

2. Add signing credentials to `android/gradle.properties`:
```properties
KEYSTORE_PATH=/path/to/mentora-release.jks
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=mentora
KEY_PASSWORD=your_key_password
```

3. Uncomment the `signingConfigs` block in `android/app/build.gradle`.

4. Build the release APK:
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Android App Bundle (.aab) for Play Store

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔄 Sync Future Changes

After any frontend code change, run:

```bash
# Rebuild + sync to Android
npm run cap:build:android
```

To just sync without rebuilding (if dist/ is already up to date):
```bash
npm run cap:sync
```

---

## 🔐 Firebase Setup

### Android SHA-1 Fingerprint

Google Sign-In on Android requires your SHA-1 fingerprint to be registered in the Firebase Console.

Get your debug fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Add the SHA-1 to: **Firebase Console → Project Settings → Your Android App → Add fingerprint**

Download the updated `google-services.json` and place it in `android/app/google-services.json`.

---

## 🔧 Troubleshooting

### Android Build Fails — "SDK not found"
- Open Android Studio → SDK Manager → Install Android SDK 34
- Set `ANDROID_HOME` environment variable

### Google Sign-In not working on Android
- Ensure SHA-1 fingerprint is added in Firebase Console
- Ensure `google-services.json` is in `android/app/`
- On Android, sign-in uses redirect flow (not popup) — this is expected

### App shows blank screen
- Check that `npm run build` completes without errors
- Check that `base: './'` is set in `vite.config.ts`
- Run `npm run cap:sync` again

### Capacitor sync fails
- Delete `android/` folder and re-run `npx cap add android`
- Run `npm run build` first, then `npm run cap:sync`

---

## 📁 Project Structure

```
Mentora/
├── src/
│   ├── components/          # React UI components
│   │   ├── common/          # Shared components (Logo, etc.)
│   │   ├── OfflineBanner.tsx  # Offline detection UI
│   │   └── ...
│   ├── contexts/
│   │   └── StateContext.tsx # Global app state + auth
│   ├── hooks/
│   │   └── useNetwork.ts    # Network status hook
│   ├── lib/
│   │   ├── firebase.ts      # Firebase init
│   │   └── platform.ts      # Capacitor platform detection
│   ├── services/
│   │   └── aiProvider.ts    # Multi-provider AI service
│   └── types.ts
├── android/                 # Generated Android project (Capacitor)
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── res/
├── dist/                    # Vite production build output
├── capacitor.config.ts      # Capacitor configuration
├── vite.config.ts           # Vite build configuration
└── package.json
```

---

## 🚀 Deployment

### Web
Deploy the `dist/` folder to any static host (Firebase Hosting, Vercel, Netlify, etc.) alongside the Express backend.

### Android Play Store
1. Generate signed `.aab` (see above)
2. Upload to Google Play Console
3. Complete store listing, screenshots, and privacy policy
4. Submit for review

---

## 🔮 Future Improvements

- [ ] iOS support (`npx cap add ios`)
- [ ] Push notifications via FCM
- [ ] Camera integration for document scanning
- [ ] File download / share with native Share Sheet
- [ ] Biometric authentication
- [ ] Background sync for offline notes
- [ ] App update prompt using Capacitor Live Updates
