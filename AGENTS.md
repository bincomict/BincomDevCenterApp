# AI Coding Agent Instructions — Bincom Dev Center App

This file maintains project conventions, architectural decisions, and operational instructions to run the application seamlessly.

## 1. Application Context & Architecture
- **Framework**: React 18+ styled with Tailwind CSS, built via Vite.
- **Backend Architecture**: The app has been converted from a transient Node express server to a serverless Firebase client-side application.
- **State Management & Persistence**: Powered by real-time Firestore listeners (`onSnapshot` in `src/firebaseService.ts`) and Firebase Authentication. All student, meeting, and admin data is persisted in Firestore.
- **Database Initial Seeding**: Handled automatically on startup by `src/seed.ts` if no profiles exist in Firestore.

---

## 2. Environment Configurations
When starting, deploying, or testing, the system loads environment variables defined in `.env.example` and injected at build-time.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

*Note: In Vite development, variables can be defined both via standard `.env` files and compiled-in using the custom `define` blocks configured in `vite.config.ts`.*

---

## 3. Strict Time & Timezone Rules (Lagos, Africa)
The application schedules alignment meetings, standups, and tracks late check-ins based on **Africa/Lagos** timezone (WAT/GMT+1).
- **Date Strings**: Always use `getLagosDateString(new Date())` (returns format `YYYY-MM-DD`).
- **Punctuality Calculation**: Use `getLagosMinutesPastMidnight(now)` compared with scheduled meeting minutes past midnight to correctly determine "Attended" vs. "Late" (more than 5 minutes late) entries.

---

## 4. Compilation & Verification Guidelines
Before declaring tasks complete:
1. Run `npm run lint` (`tsc --noEmit`) to verify no strict TypeScript complaints remain.
2. Run `npm run build` (`vite build`) to verify compilation.
3. If new environment configurations or packages are updated, restart the dev server.
