

# Fix: "Guest name required" error in Visitor Check-In Flow

## Problem
When a visitor submits their details (first name, last name, phone, reason), the `VisitorWelcomeStep` calls `update_guest` **without sending `guest_name`**. The backend rejects this with "guest name required" because it enforces that field for all `update_guest` calls, regardless of flow type.

## Root Cause
In `VisitorWelcomeStep.tsx` (line ~88), the API call sends `visitor_first_name`, `visitor_last_name`, etc., but omits `guest_name`. The backend does not distinguish between guest and visitor flows when validating required fields on `update_guest`.

## Solution
Send a composed `guest_name` (from first + last name) alongside the visitor-specific fields. This satisfies the backend validation while keeping the visitor data intact.

## Changes

### 1. `src/components/verify/VisitorWelcomeStep.tsx`
- Add `guest_name` to the `update_guest` API call, composed from `visitor_first_name` and `visitor_last_name`
- This is a one-line addition inside the `api.verify()` payload (~line 90):
  ```
  guest_name: `${result.data.firstName} ${result.data.lastName}`.trim(),
  ```

### 2. `src/lib/api.ts` — `UpdateGuestRequest` type
- Add optional visitor fields to the type definition so TypeScript doesn't require `as any` casting:
  - `flow_type?: "guest" | "visitor"`
  - `visitor_first_name?: string`
  - `visitor_last_name?: string`
  - `visitor_phone?: string`
  - `visitor_reason?: string`

These are small, targeted changes -- no UI or flow logic changes needed.
