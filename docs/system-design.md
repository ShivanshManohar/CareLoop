# CareLoop System Design & Concurrency Architecture

CareLoop is architected to guarantee strict data integrity, zero double-bookings under concurrent patient traffic, graceful doctor absence resolution, and reliable background notification delivery.

---

## 1. Concurrency & Double-Booking Prevention

### The Problem
When multiple patients attempt to book the exact same doctor and time slot simultaneously, naive `read-then-write` application checks suffer from race conditions where two overlapping transactions see the slot as available and both insert bookings.

### Technical Architecture
CareLoop enforces concurrency safety across two discrete layers:

1. **Database-Level Unique Constraint**:
   ```prisma
   model Appointment {
     doctorId  String
     slotStart DateTime
     ...
     @@unique([doctorId, slotStart])
   }
   ```
   At the database level, the compound unique index `(doctorId, slotStart)` guarantees that regardless of application thread concurrency, only a single record can ever be committed for any given doctor slot.

2. **Atomic Transaction Isolation**:
   The booking flow in `/api/appointments` wraps slot verification, doctor profile existence, appointment creation, and hold cleanup inside a single atomic `prisma.$transaction`.
   - If an existing active appointment (`CONFIRMED`) is detected, the transaction aborts with a explicit domain error.
   - If a parallel race reaches the database insert, Prisma's `P2002` unique constraint violation is caught immediately and translated into an HTTP `409 Conflict` response:
     ```json
     {
       "error": "This slot was just booked by another user. Please select another convenient time slot.",
       "code": "SLOT_TAKEN"
     }
     ```
   - The application never returns an unhandled 500 error on concurrent collisions.

---

## 2. 5-Minute Slot Hold Mechanism

### The Problem
During patient intake, users take 1–3 minutes filling in symptom descriptions, duration, and severity scales. Without a locking mechanism, two users might fill the form concurrently, resulting in one user getting rejected only after spending time filling the form.

### Technical Architecture
- When a patient selects a time slot on `/patient/book`, a `POST /api/slots/hold` request attempts to acquire a temporary row in the `SlotHold` table with `expiresAt = now() + 5 minutes`.
- The compound unique key `@@unique([doctorId, slotStart])` on `SlotHold` ensures only one patient can hold a slot at any time.
- **Frontend Synchronization**: The `<SlotCountdown />` component visualizes the 5:00 timer, transitioning to amber at 2 minutes and red with pulse under 60 seconds.
- **Slot Availability Resolution**: The `/api/slots/available` route queries both `Appointment` and active `SlotHold` records. If a slot is held by user *A*, user *B* sees the slot marked as `"Held"` (disabled). If user *A* confirms the booking, the hold is removed and converted to a confirmed appointment. If user *A* abandons the form, the hold naturally expires.

---

## 3. Doctor Leave Conflict Handling & 1-Click Rebooking

### The Problem
When a physician marks unexpected emergency leave or planned CME absence, existing patient appointments scheduled in that date window must not remain in limbo or get silently dropped.

### Technical Architecture
1. **Batch Atomic Invalidation**:
   When a leave is registered via `/api/doctor/leave`, a transaction:
   - Creates the `DoctorLeave` record.
   - Updates all overlapping `CONFIRMED` appointments to `CANCELLED_LEAVE`.
   - Clears any active temporary `SlotHold` records in that window.

2. **Patient Notification & Priority Rebooking Link**:
   For every affected appointment, CareLoop enqueues an `EMAIL_LEAVE_CANCELLATION` job and a `CALENDAR_DELETE` job into `NotificationJob`.
   The email payload and patient dashboard surface a direct 1-click rebooking link:
   `/patient/rebook/[appointmentId]`
   When opened, this view retains the patient's original symptom intake description, duration, and severity scale, allowing the patient to pick the doctor's next open slot and confirm in one click.

---

## 4. Resilient Notification Queue & Exponential Backoff

### The Problem
Third-party notification providers (Resend, Google Calendar API) experience rate limits, transient network partitions, or temporary service outages. Directly awaiting external email APIs inside HTTP request handlers causes slow user requests and silent failure drops.

### Technical Architecture
CareLoop uses an asynchronous, resilient job table pattern:

```prisma
model NotificationJob {
  id          String   @id @default(cuid())
  type        String   // EMAIL_BOOKING, EMAIL_LEAVE_CANCEL, CALENDAR_SYNC, etc.
  recipient   String
  payload     String   // JSON payload
  status      String   @default("PENDING") // PENDING, SENT, FAILED
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  nextRetryAt DateTime?
  lastError   String?
}
```

1. **Decoupled Enqueueing**:
   User actions (booking, consultation completion, leave creation) write a `PENDING` job to `NotificationJob` in microseconds.
2. **Exponential Backoff Retries**:
   The background worker `/api/cron/process-jobs` sweeps pending jobs and failed jobs where `nextRetryAt <= now()`.
   On transient failure, `attempts` increments, the error message is recorded in `lastError`, and `nextRetryAt` is calculated using exponential backoff:
   $$\text{Backoff Minutes} = 2^{\text{attempts}} \quad (2\text{m}, 4\text{m}, 8\text{m})$$
3. **Dead-Letter Visibility & Manual Dispatch**:
   Jobs reaching `maxAttempts = 3` remain flagged as `FAILED` and are surfaced on `/admin/notifications`. Administrators can inspect exact error strings and trigger a 1-click manual re-dispatch.
