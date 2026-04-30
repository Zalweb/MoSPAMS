# Google Authentication Design

**Date:** 2026-04-30  
**Project:** MoSPAMS  
**Status:** Approved

---

## Overview

Add Google OAuth sign-in to MoSPAMS using a frontend-first approach. The React app uses `@react-oauth/google` to obtain a Google ID token, which is sent to the Laravel backend for verification. New users are prompted with a sign-up modal to enter credentials and choose a role. Staff and Mechanic role requests require admin approval; the user starts as Customer in the meantime.

---

## Database Schema Changes

### Modify `users` table (new migration)

- Add `email` — `string(100)`, nullable, unique — Google-provided email; also used to look up existing users
- Add `google_id` — `string(100)`, nullable, unique — Google `sub` claim; links a user account to a Google identity
- `password_hash` remains **NOT NULL** — all users (including Google sign-ups) must set a password during registration

### New `role_requests` table (same migration)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id_fk` | FK → users | The user requesting a role upgrade |
| `requested_role_id_fk` | FK → roles | Staff or Mechanic only |
| `status` | enum: `pending`, `approved`, `denied` | Default: `pending` |
| `reviewed_by_fk` | nullable FK → users | Admin who acted on the request |
| `reviewed_at` | nullable timestamp | |
| `created_at` / `updated_at` | timestamps | |

---

## Backend

### New Public Endpoints (no Sanctum middleware)

#### `POST /api/auth/google`
- **Input:** `{ credential: string }` — Google ID token from frontend
- **Verification:** JWT verified against Google's public key certificates using `firebase/php-jwt`
- **Extracts:** `sub` (google_id), `name`, `email` from verified payload
- **Existing user** (matched by `google_id` or `email`): return Sanctum token + user object (same shape as `/api/login`)
- **New user:** return `{ needs_registration: true, google_data: { name, email, google_id } }`

#### `POST /api/auth/google/register`
- **Input:** `{ google_id, name, email, phone?, password, requested_role }`
- **Always** creates user with **Customer role** + **ACTIVE status**
- Hashes password and stores it — user can also log in via email+password
- Creates a linked `customers` record (name, email, phone)
- If `requested_role` is `staff` or `mechanic`: inserts a `role_requests` row with status `pending`
- Returns Sanctum token (user is immediately logged in as Customer)

### Update Existing Endpoint

#### `POST /api/login`
- Update user lookup to check `email` column in addition to `username` — allows Google-registered users to log in with email + password

### New Admin Endpoints (auth:sanctum + role:Admin)

| Method | Path | Action |
|---|---|---|
| `GET` | `/api/role-requests` | List requests; supports `?status=pending` filter; includes user name, email, requested role, date |
| `PATCH` | `/api/role-requests/{id}/approve` | Set status = approved; update `user.role_id_fk` to requested role; create `mechanics` record if role is Mechanic; log activity |
| `PATCH` | `/api/role-requests/{id}/deny` | Set status = denied; user remains Customer; log activity |

---

## Frontend

### Login Page (`Frontend/src/features/auth/pages/Login.tsx`)

- Add a "Continue with Google" button **above** the existing form (ScrewFast `GoogleBtn` style — `border border-neutral-200 bg-neutral-50 hover:bg-neutral-200` with Google SVG)
- "Or" divider between Google button and email/password form
- On Google credential received: call `/api/auth/google`
  - If token returned → log in immediately
  - If `needs_registration: true` → open sign-up modal with `google_data` pre-filled

### Sign-up Modal (`Frontend/src/features/auth/components/GoogleSignUpModal.tsx`)

ScrewFast `RegisterModal.astro` layout ported to React:

**Fields:**
- Full name — pre-filled from Google, editable
- Email — pre-filled from Google, read-only
- Phone — optional text input
- Password — required, min 8 characters
- Confirm password — required, must match

**Role Selector (below fields):**
Three cards (`rounded-xl border border-neutral-200`):
- **Customer** — "Instant access" badge (`bg-yellow-400` pill)
- **Staff** — "Requires admin approval" notice; note: "You'll start as Customer"
- **Mechanic** — same notice as Staff

Submit button: ScrewFast `AuthBtn` style (`bg-yellow-400 hover:bg-yellow-500 font-bold rounded-lg`)

On submit: `POST /api/auth/google/register` → close modal → user is logged in as Customer

### Admin — Pending Requests Tab (Users Page)

- New "Pending Requests" tab alongside existing user list
- Tab shows orange badge with pending count when > 0
- Table columns: Name, Email, Requested Role, Date Submitted, Actions (Approve / Deny buttons)
- Approve/Deny call the respective PATCH endpoints; optimistic UI removes row on action

### Admin — Approvals Page (`Frontend/src/features/users/pages/Approvals.tsx`)

- New route: `/approvals`
- Sidebar entry with notification dot when pending count > 0
- Same table as the Users page tab
- Shows empty state ("No pending requests") when queue is clear

---

## Auth Flow Summary

```
User clicks "Continue with Google"
  └─ Google returns ID token
       └─ POST /api/auth/google
            ├─ Existing user → Sanctum token → logged in
            └─ New user → needs_registration: true
                  └─ Sign-up modal opens (pre-filled name + email)
                        └─ User fills: phone?, password, role
                              └─ POST /api/auth/google/register
                                    ├─ Creates user (Customer role, ACTIVE)
                                    ├─ Creates customers record
                                    ├─ If Staff/Mechanic → inserts role_request (pending)
                                    └─ Returns Sanctum token → logged in as Customer
```

---

## Design Reference (ScrewFast)

All new auth components use ScrewFast design tokens:

- **Google button:** `inline-flex w-full items-center gap-x-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm hover:bg-neutral-200`
- **Inputs:** `block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm focus:ring-3 focus:ring-neutral-400`
- **Modal container:** `rounded-xl border border-neutral-200 bg-neutral-100 shadow-xs dark:border-neutral-700 dark:bg-neutral-800`
- **Primary button (submit):** `bg-yellow-400 hover:bg-yellow-500 rounded-lg font-bold text-neutral-700`
- **Accent / links:** `text-orange-400`
- **Pending badge:** `bg-yellow-400 text-neutral-800 text-xs font-bold rounded-full px-2`

---

## Out of Scope (v1)

- Password reset / forgot password via email
- Unlinking a Google account from an existing email+password account
- Admin-initiated role upgrade (outside the request flow)
- Email notifications on approval/denial
