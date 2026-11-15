# MoveMate Bug Fixes & Hardening Report

This document details all bugs, security vulnerabilities, broken workflows, build/test failures, and UI/styling issues identified and resolved across the `movemate` codebase.

---

## Summary by Area

| Area | Fixes Implemented | Key Files |
| --- | --- | --- |
| Build, Tooling & Deployment | Fixed failing production build, CRA proxy, Vercel static routing, test dependencies, and stray typo file | `package.json`, `vercel.json`, `src/setupProxy.js`, `deploy-functions.sh`, `.env.example` |
| Security & Auth (Edge Functions) | Fixed RLS bypass break (`Authorization` override), replaced unsalted password query with PBKDF2 + timing-safe comparison, added signed HMAC admin tokens (`x-admin-token`) enforced across admin endpoints | `supabase/functions/admin-auth/index.ts`, `fetch-registrations/index.ts`, `fetch-venues/index.ts`, `register-vehicle/index.ts`, `send-sms/index.ts`, `send-notification/index.ts` |
| Missing Backend Endpoints | Implemented missing `send-sms` and `send-notification` Supabase Edge Functions and moved driver confirmation SMS server-side | `supabase/functions/send-sms/index.ts`, `supabase/functions/send-notification/index.ts`, `supabase/functions/register-vehicle/index.ts` |
| API Proxy (`/api/vehicle-enquiry`) | Hardened body parsing, normalized/validated plate input, added `DVLA_API_KEY` guard, handled non-JSON upstream responses, removed error leaks | `api/vehicle-enquiry.js` |
| Frontend Core & Architecture | Eliminated circular dependency (`App.js` ↔ `AdminDashboard.js`), deduplicated shared config/utilities, fixed lookup race conditions, double submits, timezone/ID mismatches, and stale closures | `src/config.js`, `src/utils/vehicleUtils.js`, `src/components/Common.js`, `src/App.js`, `src/AdminDashboard.js` |
| CSS & UI Layout | Fixed mobile/desktop width truncation, table cell flex bug, button alignment, z-index stacking, input adornment overlap, and added missing Bulk SMS / lookup CSS | `src/AppStyles.css` |
| Automated Test Coverage | Replaced broken CRA placeholder test with 29 Jest/RTL unit + integration tests and 6 Edge Function tests | `src/App.test.js`, `src/AdminDashboard.test.js`, `src/vehicleEnquiryApi.test.js`, `src/utils/vehicleUtils.test.js`, `tests/edge-functions.test.js` |

---

## Detailed Fixes

### 1. Build, Test, Proxy & Deployment Configuration

1. **ESLint failures breaking `CI=true npm run build`**
   - **Root Cause**: Unused `useCallback` and `maskPhoneNumber` imports in `src/App.js` and `react-hooks/exhaustive-deps` warnings in `src/AdminDashboard.js` caused Create React App's CI build (`process.env.CI=true`) to fail.
   - **Fix**: Refactored shared components and utilities cleanly into `src/components/Common.js`, `src/utils/vehicleUtils.js`, and `src/config.js`, and wrapped async callbacks properly with `useCallback` / clean hook dependency arrays.

2. **Circular module dependency between `src/App.js` and `src/AdminDashboard.js`**
   - **Root Cause**: `App.js` imported `AdminLogin` and `AdminDashboard` from `AdminDashboard.js`, while `AdminDashboard.js` imported icons, `BackButton`, `InputField`, `Modal`, and `Toast` back from `App.js`.
   - **Fix**: Extracted shared UI primitives and SVG icons into `src/components/Common.js` (re-exporting them from `src/App.js` for compatibility), breaking the circular import cycle.

3. **Broken Jest test runner & outdated placeholder test**
   - **Root Cause**: `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event` were missing from `package.json`, while `src/App.test.js` still tested for `/learn react/i` from CRA scaffolding.
   - **Fix**: Added Testing Library devDependencies to `package.json`, removed unused `cors` dependency, added `"test:functions"` script, and replaced `App.test.js` with full test suites.

4. **Missing local API dev middleware for `/api/*`**
   - **Root Cause**: Calling `/api/vehicle-enquiry` under `npm start` failed because CRA had no proxy or middleware mounting Vercel's `api/*.js` handlers locally.
   - **Fix**: Added `src/setupProxy.js` using `express.json()` and `dotenv` to mount `/api/vehicle-enquiry`, `/api/test`, and `/api/simple-test` during `npm start`.

5. **Vercel SPA catch-all intercepting public assets**
   - **Root Cause**: `vercel.json` only whitelisted `/static/(.*)` before routing `/(.*)` to `/index.html`, causing `/manifest.json`, `/favicon.ico`, `/robots.txt`, `/logo192.png`, and `/logo512.png` to return HTML in production.
   - **Fix**: Replaced the `/static/(.*)` rule with `{"handle": "filesystem"}` before the `/(.*)` catch-all route.

6. **Stray 0-byte typo file & outdated deployment docs**
   - **Root Cause**: An empty stray file named `tailwind.` existed in the repo root, and `deploy-functions.sh` / `.env.example` omitted the SMS/notification functions and required Twilio/session secrets.
   - **Fix**: Removed `tailwind.` (`git rm`), updated `deploy-functions.sh` to deploy all 6 functions (`fetch-venues`, `admin-auth`, `register-vehicle`, `fetch-registrations`, `send-sms`, `send-notification`), and documented all required environment variables/secrets in `.env.example` and `deploy-functions.sh`.

---

### 2. Supabase Edge Functions & Authentication Security

7. **Service-role client overridden by caller's `Authorization` header**
   - **Root Cause**: `admin-auth`, `fetch-registrations`, `fetch-venues`, and `register-vehicle` all initialized Supabase with `createClient(url, serviceRoleKey, { global: { headers: { Authorization: req.headers.get('Authorization') } } })`. Passing the caller's anon Bearer token in `global.headers.Authorization` overrode the service-role credentials, causing RLS policies to apply as `anon` instead of bypassing RLS.
   - **Fix**: Removed the `global.headers.Authorization` override in all Supabase Edge Functions so the `SUPABASE_SERVICE_ROLE_KEY` client executes privileged queries reliably server-side.

8. **Unsalted SHA-256 SQL equality check & unauthenticated admin endpoints**
   - **Root Cause**:
     - `admin-auth` hashed passwords with bare SHA-256 and queried `.eq('password_hash', hash)` directly in Postgres.
     - `admin-auth` issued no authentication token or session secret.
     - `fetch-registrations` and admin SMS operations had zero authentication enforcement beyond the public Supabase anon key bundled in the frontend.
   - **Fix**:
     - Updated `supabase/functions/admin-auth/index.ts` to query `super_admins` by `username`, verify passwords in constant time (`timingSafeEqual`) using salted PBKDF2 (`pbkdf2$100000$<salt>$<hash>`), transparently upgrade legacy unsalted SHA-256 hashes to PBKDF2 on successful login, never return `password_hash`, and issue 8-hour HMAC-SHA256 signed session tokens (`token`, `expiresAt`) signed with `ADMIN_SESSION_SECRET` (or domain-separated `SUPABASE_SERVICE_ROLE_KEY`).
     - Added HMAC verification in `fetch-registrations` and `send-sms` via `x-admin-token` header, returning HTTP `401` on missing, malformed, forged, or expired tokens.

9. **Missing `send-sms` and `send-notification` Edge Functions & public `send-sms` abuse vector**
   - **Root Cause**: Both `src/App.js` and `src/AdminDashboard.js` called `/functions/v1/send-sms` and `/functions/v1/send-notification`, neither of which existed in `supabase/functions/`. Calling `send-sms` directly from the anonymous registration page would also have forced `send-sms` to remain unauthenticated (an open SMS relay vulnerability).
   - **Fix**:
     - Created `supabase/functions/send-sms/index.ts` gated by valid `x-admin-token` admin authentication, input validation/E.164 normalization, and Twilio REST API integration.
     - Created `supabase/functions/send-notification/index.ts` for blocked drivers: validates the blocking UK registration number, checks whether that vehicle has an active registration today (`Europe/London`), returns `404` if not found, looks up the venue name, and dispatches the urgent Twilio SMS without ever exposing driver phone numbers to the caller.
     - Moved driver confirmation SMS inside `supabase/functions/register-vehicle/index.ts` (server-side, non-fatal, returning `smsSent`), eliminating anonymous client access to arbitrary SMS sending.

10. **Timezone-dependent daily duplicate window & missing server-side validation/race handling in `register-vehicle`**
    - **Root Cause**:
      - `today.setHours(0, 0, 0, 0)` depended on Edge runtime timezone (UTC in Deno Deploy) rather than UK local midnight (`Europe/London`), breaking duplicate detection between 23:00–00:00 UTC during BST.
      - `register-vehicle` accepted invalid registration strings and non-UK phone numbers and threw raw internal `error.message` (`400`) on DB failures instead of mapping unique constraint violations (`23505`) to `409`.
    - **Fix**:
      - Computed day boundaries explicitly in `Europe/London` timezone (`getUkDayBoundsUtc`) in both `register-vehicle` and `send-notification` (tested across GMT/BST transitions).
      - Added server-side UK plate validation, mobile normalization (`07...` → `+447...`), HTTP method enforcement (`POST`/`GET`), and explicit `23505` → `409` conflict handling with safe error messages.

11. **`fetch-registrations` dropping `vehicle_data`, falsy `venue_id === 0`, and fabricating `created_at`**
    - **Root Cause**:
      - Response mapping omitted `vehicle_data`, causing the Admin Dashboard to always display `"No vehicle data"`.
      - `venue_id || ''` turned `venue_id = 0` into `""`, and `if (venueId)` skipped filtering `venue_id=0`.
      - `created_at || new Date().toISOString()` replaced missing timestamps with "now", making old rows appear freshly registered.
      - Method check was missing (`GET` only) and `error.message` was leaked on failures.
    - **Fix**: Preserved `vehicle_data: reg.vehicle_data ?? null`, `venue_id: reg.venue_id ?? ''`, filtered `venueId !== null && venueId !== ''`, preserved `created_at ?? null`, enforced `GET`, and returned safe `500` error responses.

---

### 3. Vercel DVLA Proxy (`api/vehicle-enquiry.js`)

12. **Crash on `undefined`/string `req.body`, missing API key, and non-JSON DVLA responses**
    - **Root Cause**:
      - Destructuring `req.body` directly crashed (`TypeError`) when `req.body` was `undefined` or a raw JSON string.
      - Missing `process.env.DVLA_API_KEY` sent `x-api-key: undefined` externally to DVLA.
      - `await response.json()` threw `SyntaxError` on HTML/empty upstream gateway errors, and catch leaked `details: err.message`.
    - **Fix**: Safely parsed string/object bodies (returning `400` on invalid JSON or non-object), normalized and validated `registrationNumber` (`/^[A-Z0-9]{1,8}$/`), checked `DVLA_API_KEY` upfront (returning `500`), parsed upstream text via `response.text()` + guarded `JSON.parse`, and sanitized internal errors.

---

### 4. Frontend Application (`src/`)

13. **Vehicle lookup race conditions, `< 4` char wasted requests, and leaked timers**
    - **Root Cause**: Both `DriverRegistration` and `BlockedDriverInput` duplicated DVLA lookup code without `AbortController`, request sequence checking, minimum length enforcement (`< 4` chars still fetched after 600ms), or unmount timer cleanup. Fast typing could cause older slow responses to overwrite newer vehicle info.
    - **Fix**: Extracted `useVehicleLookup()` hook in `src/App.js` and `lookupVehicleByReg()` in `src/utils/vehicleUtils.js` with 500ms debounce, `< 4` char early skip, `AbortController`, monotonic `requestIdRef` staleness guard, and unmount cleanup.

14. **Double submission on confirmation & blocked-driver screens**
    - **Root Cause**: `DetailsConfirmationScreen` did not receive `loading`, so clicking `"Yes, they're correct"` twice while `register-vehicle` was in flight sent concurrent duplicate requests; similarly `BlockedDriverInput` could trigger overlapping `send-notification` calls and navigate mid-request.
    - **Fix**: Passed `loading` into `DetailsConfirmationScreen` to disable confirm/edit/close buttons during submit, guarded `handleConfirmSubmit` & `handleSubmit` with early `if (loading) return`, and disabled `BackButton` while submitting.

15. **Silent venue loading failures & strict `===` venue ID mismatch**
    - **Root Cause**:
      - If `fetch-venues` failed, the venue dropdown stayed empty without an error message or retry action.
      - HTML `<select>` values are strings (`"1"`), while database IDs may be numbers (`1`), causing `venues.find(v => v.id === selectedVenue)` to show `"Unknown"` on the confirmation screen, confirmation SMS, and Admin Dashboard.
    - **Fix**: Added `venuesError` alert + inline `Retry` button (`fetchVenues`) in `DriverRegistration`, and standardized all venue ID comparisons to `String(v.id) === String(...)` across `App.js` and `AdminDashboard.js`.

16. **Admin login & session state bugs**
    - **Root Cause**:
      - `AdminLogin` used `<div>` instead of `<form>`, breaking `Enter` key submission, and lacked an in-flight guard and top-level error alert container.
      - Logged-in admin state disappeared on browser refresh and never handled expired tokens.
    - **Fix**: Converted `AdminLogin` to `<form onSubmit>`, added `loading` guard, `autoComplete` attributes, and alert banner; persisted `{ admin, token, expiresAt }` in `sessionStorage` with expiration check and automatic `401` session-expiry redirect back to `AdminLogin`.

17. **Venue dropdown stale-closure double fetch & search wipe in `AdminDashboard`**
    - **Root Cause**:
      - `handleVenueChange` called `setSelectedVenue(venueId)` followed immediately by `fetchRegistrations()` on the stale `selectedVenue` closure, issuing an immediate request with the *old* venue before the `useEffect` fired a second request with the new venue.
      - `filteredRegistrations` duplicated state manually, fell out of sync on refresh, and failed to match spaced plates (`"AB12 CDE"`) or local `07...` numbers against `+447...`.
      - `NaN` timestamps (`created_at: null`) broke sorting.
    - **Fix**: Removed the stale direct call from `handleVenueChange`, added `AbortController` + monotonic `fetchSeqRef` in `fetchRegistrations`, replaced redundant state with `useMemo(() => ...)` sorting/filtering via `matchesSearchTerm` (preserving `searchTerm` across refreshes/venue switches), and guarded `new Date(...)` with `Number.isNaN`.

18. **Shared phone number collisions, unchecked `response.ok` on SMS, and privacy exposure**
    - **Root Cause**:
      - Single & Bulk SMS keyed `sentSMS` and `selectedRecipients` by raw `phone`, so registering two cars under one mobile caused `Select All` toggle mismatches and misattributed `Sent` badges; `07...` vs `+447...` variants of the same phone also sent duplicate bulk SMS texts.
      - `sendNotification` ignored non-2xx HTTP status codes (`!response.ok`) and marked failed SMS attempts as `"Sent"`.
      - Driver phone numbers were shown in plaintext by default despite an unused `maskPhoneNumber` helper.
    - **Fix**: Keyed row selection and `sentSMS` status by `getRegKey(reg)` (`reg.id`), deduplicated bulk SMS recipients by normalized E.164 phone number (`formatPhoneNumber`), checked `response.ok` explicitly in both single and bulk SMS sends (checking `401` as well), masked phone numbers by default (`***XXX`) with a `Show Numbers` / `Hide Numbers` toggle, and replaced the corner `window.location.reload()` button with `handleRefresh`.

19. **Toast timer resets, unassociated form labels & modal keyboard/backdrop traps**
    - **Root Cause**:
      - `Toast` included `[onClose]` in its `useEffect` dependency array; every parent state update passing a new callback reset the 3-second timer (causing toasts to linger forever while bulk sending or typing).
      - `InputField`, venue `<select>`, and consent `<input type="checkbox">` lacked `id`/`htmlFor` associations.
      - `Modal` didn't close on `Escape` and `BulkSMSModal` allowed clicking the backdrop to close/wipe progress mid-send.
      - `BackButton` omitted `type="button"` and mutated inline `e.currentTarget.style` even when CSS hover existed.
    - **Fix**: Stored `onClose` in `onCloseRef` inside `Toast`, added `useId()` + `htmlFor` in `InputField` and labels on venue/consent controls, added `Escape` handling and `!confirmDisabled` / `!bulkSending` backdrop locks, and cleaned up `BackButton`.

---

### 5. CSS & UI Styling (`src/AppStyles.css`)

20. **Layout overrides, broken table row alignment, hidden toasts, and missing component styles**
    - **Root Cause**:
      - `.content-wrapper` had `max-width: 100vw` on line 50 overriding `max-width: 500px` on line 46, stretching narrow forms full-width on desktop.
      - `.admin-container` had `max-width: 600px` on line 614 overriding `max-width: 1200px`, squashing the 7-column admin table.
      - `td.actions-cell` used `display: flex`, breaking `<table>` cell alignment/borders.
      - `.home-admin-cta` and `.admin-settings-corner` had `z-index: 1000`, tying with `.modal-overlay` (`1000`), and `.toast` had `z-index: 1000` (rendering behind open modals).
      - Lookup spinner was rendered outside `.input-wrapper`, causing layout shifts.
      - Bulk SMS modal classes (`.bulk-sms-modal`, `.recipients-list`, `.recipient-item`, `.message-textarea`, `.progress-bar`, etc.) had no CSS rules defined anywhere.
    - **Fix**: Removed `max-width: 100vw` from `.content-wrapper` and `max-width: 600px` from `.admin-container`; centered form buttons with `margin: 0 auto 1rem auto`; moved flex layout into inner `.actions-cell-inner`; lowered corner CTAs to `z-index: 100` and raised `.toast` to `z-index: 1100`; placed `rightAdornment` inside `.input-wrapper` with proper right padding; added CSS for `.header-row`, `.spinner`, vehicle lookup feedback, admin top bar, and the full Bulk SMS modal UI.

---

## Verification

- **Production Build**: `CI=true npm run build` — **Passed** (0 errors, 0 ESLint warnings).
- **ESLint**: `npx eslint src/ api/` — **Passed** (0 errors, 0 warnings).
- **Unit & Integration Tests (Jest + React Testing Library)**: `CI=true npm test -- --watchAll=false` — **4 test suites, 29 tests passed**:
  - `src/utils/vehicleUtils.test.js` (12 tests)
  - `src/vehicleEnquiryApi.test.js` (7 tests)
  - `src/App.test.js` (5 tests)
  - `src/AdminDashboard.test.js` (5 tests)
- **Supabase Edge Functions Test Suite (`node --test`)**: `npm run test:functions` — **6 tests passed** covering `admin-auth`, `fetch-registrations`, `fetch-venues`, `register-vehicle`, `send-sms`, and `send-notification`.
- **Local Proxy Smoke Test**: Verified `src/setupProxy.js` mounts cleanly onto Express 5.
- **TypeScript Transpile Diagnostics**: Verified all 6 `supabase/functions/*/index.ts` files transpile cleanly with zero TypeScript syntax/semantic diagnostics.
