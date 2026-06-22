# QA Project Analysis - Mentora

This document provides a comprehensive technical audit of the Mentora application codebase and architecture configuration.

---

## 1. Architecture Overview
Mentora is structured as a Vite-powered React Single Page Application (SPA) frontend integrated with a Node.js Express API backend. The system utilizes Google Firebase for client-side authentication, database hosting (Cloud Firestore), and security policy evaluation.

- **Frontend Build Tool**: Vite (v6) with React 19, tailwindcss, lucide-react, and motion.
- **Backend API Engine**: Node.js Express server with esbuild bundling.
- **Database Layer**: Cloud Firestore (NoSQL).
- **Hosting / Security Rules**: Firebase rules engine configured locally in `firestore.rules`.

---

## 2. Frontend Modules
Located primarily under `/src`, the user interface components are structured logically:
- **`src/components/AuthView.tsx`**: Login page presenting Google OAuth SSO entry and session lock alerts.
- **`src/components/DashboardView.tsx`**: User performance dashboard showing daily XP streaks, level indicators, and progression graphs powered by `recharts`.
- **`src/components/SmartNotesView.tsx`**: Note generator interface allowing topic entries and displaying AI study content and flashcards.
- **`src/components/QuizView.tsx`**: Academic multiple-choice question challenge workspace.
- **`src/components/RoadmapView.tsx`**: Learning syllabus module showing step-by-step checkboxes.
- **`src/components/ChatAssistantView.tsx`**: Real-time tutoring dialogue sidebar.

---

## 3. Backend Modules
The server runtime is compiled from `server.ts` into `dist/server.js` using ES Modules (ESM) format:
- **AI Routing Hub**: Evaluates active provider models (Groq primary, Groq fallback, Gemini 3.5 Flash, OpenRouter) and applies self-correcting fallbacks on failures.
- **Security Middleware**: Express rate limiting (`express-rate-limit`) applied to protect AI request paths.
- **Global Error Handling**: Uncaught router exceptions are captured and formatted as JSON payloads rather than leaking HTML stack traces.

---

## 4. AI Integrations
Mentora utilizes a robust multi-provider AI routing abstraction:
- **Groq Primary**: `llama-3.3-70b-versatile` for immediate high-speed generation.
- **Groq Fallback**: `llama-3.1-8b-instant` if primary latency overflows.
- **Gemini Fallback**: `gemini-3.5-flash` for structural schema accuracy.
- **OpenRouter Backup**: `google/gemini-2.5-flash` as an external API endpoint fallback.
- **Local Fallback Engine**: If all cloud endpoints fail or time out, a localized concept parser runs locally to supply immediate mock studies.

---

## 5. Authentication Flows
Authentications are initialized on the client side using Firebase Authentication:
- **Google OAuth SSO Popup**: Direct token verification with Firebase.
- **Guest Access**: Anonymous profile tokens.
- **Email Verification Lockout**: Restricts access to AI resources (`notes`, `quizzes`, `roadmaps`) until the email token is verified.

---

## 6. Firestore Collections
- **`users`**: Statically maps user metrics (email, uid, currentLevel, totalXp, dailyStreak, role).
- **`notes` / `roadmaps`**: Stores generated concept documents linked to specific creator UIDs.

---

## 7. Security Model & User Roles
- **Roles**: Structured into `student` (default) and `admin`.
- **firestore.rules**:
  - Restricts read/write access to owners (`auth.uid == userId`).
  - Restricts critical fields updates (blocks changing standard users `role` field from `student` to `admin` using `affectedKeys()` assertions).
- **API Safeguards**: Rate limits AI routes to 30 requests per 15 minutes per IP.

---

## 8. API Endpoints
- `GET /api/health`: Node process configuration diagnostic check.
- `GET /api/ai/health`: AI provider health telemetry.
- `POST /api/gemini/generate-notes`: Compiles markdown text notes and flashcards.
- `POST /api/gemini/generate-quiz`: Generates multi-choice test forms.
- `POST /api/gemini/recommendations`: Provides smart XP study tips.
- `POST /api/gemini/summarize-document`: Compiles summary coordinates of text files.
- `GET /api/nonexistent-route-error-check`: Uncaught route error simulator.

---

## 9. Key Risk Areas
- **AI API Congestion / Latency**: Handled by robust provider switching.
- **Firestore Unauthorized Access**: Blocked by strict custom rules.
- **Secrets Leaks**: Ignored by gitignore setups.
- **Rate-limit exhaustion**: Mitigated by Express Rate Limit middleware.
