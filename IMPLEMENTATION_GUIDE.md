# IMPLEMENTATION GUIDE - Barbershop IA MVP Refactor

## Overview

This document guides the implementation of:
1. ✅ Fixed multibarber conflict validation (COMPLETE)
2. ✅ Enhanced Appointment model with sync fields (COMPLETE)
3. ✅ Domain events infrastructure (COMPLETE)  
4. ✅ Calendar provider abstraction (COMPLETE)
5. ✅ Webhook infrastructure for Make (COMPLETE)
6. ⏳ Integration of these components into the app (NEXT PHASE)

---

## Phase 1: Quick Wins ✅ COMPLETE

### What was fixed:

#### 1. **Multibarber Conflict Validation**
- **File**: `src/lib/store.ts`
- **Change**: Replaced `hasConflict()` with `hasConflictForBarber(barberId)`
- **Impact**: Two barbers can now work simultaneously without interfering
- **Before**: Barbero Luis 10:00 + Barbero Diego 10:00 = CONFLICT
- **After**: Each barbero has independent slot validation

**Code snippet:**
```typescript
function hasConflictForBarber(appointments: Appointment[], barberId: string | null, start: string, end: string) {
  if (!barberId) return false;
  // Only check conflicts with SAME barber
  return appointments.some((appointment) => {
    if (appointment.barberId !== barberId) return false;
    // ... overlap check
  });
}
```

#### 2. **Enhanced Appointment Model**

**File**: `src/lib/types.ts`

**New fields added:**
```typescript
// Calendar sync
externalEventId?: string;        // Google Calendar ID
provider?: "local" | "google";   // Where it's synced
syncStatus?: "pending" | "synced" | "failed" | "conflict";
syncError?: string;

// Audit trail
createdBy?: string;              // Who created this
updatedAt?: string;              // Last modification
completedAt?: string | null;     // When finished
cancelledAt?: string | null;     // When cancelled

// Status tracking
statusHistory?: Array<{
  status: AppointmentStatus;
  timestamp: string;
  reason?: string;
}>;

// Metadata
tags?: string[];                 // VIP, urgent, etc
```

**Impact**: Appointments now track:
- Who created each appointment
- When it was last modified
- Full history of status changes
- Integration sync state

#### 3. **Environment Variables Setup**

**File**: `.env.example`

Prepared variables for future integrations:
```bash
# Google Calendar
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Make webhooks
NEXT_PUBLIC_MAKE_WEBHOOK_URL=...
MAKE_API_KEY=...

# WhatsApp Business API
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCESS_TOKEN=...

# Database
DATABASE_URL=...
```

---

## Phase 2: Domain Event Infrastructure ✅ COMPLETE

### New files created:

#### `src/lib/domain-events.ts`
Defines business events that trigger integrations:

**Event types:**
- `appointment.created`
- `appointment.updated`
- `appointment.completed`
- `appointment.cancelled`
- `appointment.no_show`
- `payment.confirmed`
- `client.created`
- `calendar.sync_*`

**Event structure:**
```typescript
interface DomainEvent {
  id: string;
  type: DomainEventType;
  timestamp: string;
  aggregateId: string;          // appointment.id, client.id
  aggregateType: string;
  data: Record<string, unknown>; // Event payload
  metadata?: {
    userId?: string;
    source?: "local" | "google_calendar";
    idempotencyKey?: string;
  };
}
```

**Factory functions provided:**
- `createAppointmentCreatedEvent()`
- `createPaymentConfirmedEvent()`
- `createAppointmentCompletedEvent()`
- `createAppointmentCancelledEvent()`
- `createNoShowEvent()`
- `createClientCreatedEvent()`

**Usage in store**:
When you call `markCompleted(appointmentId)`, you should also emit:
```typescript
const event = createAppointmentCompletedEvent({
  appointmentId,
  clientId,
  clientName,
  barberId,
  barberName,
  serviceName,
  amount,
  completedAt: new Date().toISOString()
});
// Dispatch event to webhooks/integrations
```

---

## Phase 3: Calendar Provider Abstraction ✅ COMPLETE

### New file: `src/lib/calendar-provider.ts`

Defines interface for calendar integrations (Google, Outlook, local, etc.):

```typescript
interface ICalendarProvider {
  name: string;
  isAuthenticated(): boolean;
  authenticate(credentials): Promise<void>;
  createEvent(event: CalendarEvent): Promise<CalendarSyncResult>;
  updateEvent(externalEventId, event): Promise<CalendarSyncResult>;
  deleteEvent(externalEventId): Promise<CalendarSyncResult>;
  listEvents(startTime, endTime): Promise<CalendarEvent[]>;
  getEvent(externalEventId): Promise<CalendarEvent | null>;
  watchChanges?(calendarId): Promise<string>;  // Real-time sync
  unwatchChanges?(watchChannelId): Promise<void>;
}
```

**Implementations provided:**
- `LocalCalendarProvider` (MVP - in-memory, no external sync)
- `GoogleCalendarProvider` (stubs for future implementation)

**How to use:**
```typescript
import { CalendarProviderFactory } from "@/lib/calendar-provider";

const provider = CalendarProviderFactory.create("local");  // or "google"
const result = await provider.createEvent({
  title: "Haircut - John Doe",
  startTime: "2024-04-15T10:00:00Z",
  endTime: "2024-04-15T10:30:00Z",
  busy: true
});
// result.externalEventId = Google event ID if synced
```

---

## Phase 4: Webhook Infrastructure ✅ COMPLETE

### New file: `src/lib/webhooks.ts`

Handles sending events to Make and other external systems:

```typescript
class WebhookDispatcher {
  async dispatch(event: DomainEvent): Promise<WebhookDeliveryLog>;
  // Sends HTTP POST to Make webhook with:
  // - Event payload
  // - Idempotency key (prevents duplicates)
  // - Retry logic (exponential backoff)
  // - Delivery logging
}

class IdempotencyStore {
  isProcessed(idempotencyKey): boolean;
  markProcessed(idempotencyKey, result): void;
  // Prevents Make from processing same event twice
}
```

**Webhook payload format:**
```json
{
  "id": "evt-16134210200",
  "type": "appointment.completed",
  "timestamp": "2024-04-15T14:30:00Z",
  "aggregateId": "appt-123",
  "aggregateType": "appointment",
  "data": {
    "appointmentId": "appt-123",
    "clientId": "client-001",
    "clientName": "John Doe",
    "clientPhone": "+521234567",
    "barberId": "barber-luis",
    "barberName": "Luis",
    "serviceName": "Fade premium",
    "amount": 180,
    "completedAt": "2024-04-15T14:30:00Z"
  },
  "metadata": {
    "source": "local",
    "idempotencyKey": "appt-123"
  }
}
```

---

## Phase 2 (Next): Integration into Store

### TODO: Update `src/lib/store.ts`

Add event emission to store actions:

```typescript
// In createAppointment:
set((state) => {
  // ... create appointment
  
  // Emit event
  const event = createAppointmentCreatedEvent({
    appointmentId: appointment.id,
    // ...
  });
  // Dispatch to webhooks/handlers
  // TODO: integrate eventBus.publish(event)
  
  return { appointments };
});

// Same for: markCompleted, cancelAppointment, markPaid, etc.
```

---

## Phase 3 (Next): Google Calendar Integration

### Steps to implement Google Calendar sync:

#### 1. Install dependencies:
```bash
npm install googleapis google-auth-library
```

#### 2. Setup OAuth 2.0:
Create `src/app/api/auth/google/route.ts`:
```typescript
// Endpoint for Google OAuth callback
// Exchanges auth code for refresh token
// Stores token securely
```

#### 3. Implement `GoogleCalendarProvider`:
In `src/lib/calendar-provider.ts`, fill in:
```typescript
export class GoogleCalendarProvider {
  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    // Call: calendar.events.insert()
    // Return: externalEventId from Google
  }
  
  async listEvents(startTime, endTime): Promise<CalendarEvent[]> {
    // Call: calendar.events.list() with time filter
    // Return: array of events
  }
  
  // ... other methods
}
```

#### 4. Add sync reconciliation:
```typescript
// When appointment is created:
1. Create in local store
2. Call calendar.createEvent()
3. Save externalEventId
4. Set syncStatus = "synced"

// When Google Calendar event changes:
1. Fetch via calendar.events.watch() or polling
2. Find matching local appointment
3. Update if needed
4. Handle conflicts
```

#### 5. Handle Watch channels (real-time sync):
```typescript
// Instead of polling every 5 minutes:
// Use Google Calendar Watch API for push notifications
// When event changes, webhook from Google → barbershop app
```

---

## Phase 4 (Next): Make Integration

### How Make will consume events:

#### 1. Webhook URL:
```
NEXT_PUBLIC_MAKE_WEBHOOK_URL = "https://hooks.make.com/your_custom_hook_url"
```

#### 2. Make will receive POST requests like:
```json
{
  "type": "appointment.completed",
  "data": {
    "appointmentId": "appt-123",
    "clientPhone": "+521234567",
    "clientName": "John Doe"
  }
}
```

#### 3. Make will trigger workflows:
- Send WhatsApp message confirmation
- Send payment link
- Update CRM
- Send reactivation campaigns to inactive clients
- Schedule follow-up SMS

#### 4. Implement webhook dispatcher in store:
```typescript
// In markCompleted:
const event = createAppointmentCompletedEvent({...});
const dispatcher = new WebhookDispatcher({
  url: process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL,
  retryCount: 3
});
await dispatcher.dispatch(event);
```

---

## Phase 5 (Next): Backend Migration

When you build real backend (Node.js + PostgreSQL):

```
Current (frontend only):
┌─────────────────┐
│  React App      │
│  Zustand Store  │
│  localStorage   │
└─────────────────┘

Future (frontend + backend):
┌─────────────────┐       ┌─────────────────┐
│  React App      │──────→│  Next.js API    │
│  Client Store   │       │  (src/app/api)  │
└─────────────────┘       │  PostgreSQL     │
                          │  Webhooks       │
                          └─────────────────┘
                                │
                                ↓
                          ┌─────────────────┐
                          │  Make           │
                          │  Google Cal     │
                          │  WhatsApp       │
                          └─────────────────┘
```

API routes to build:
- `POST /api/appointments` - create appointment
- `POST /api/appointments/:id/complete` - mark completed
- `POST /api/webhooks/make` - receive Make webhooks
- `POST /api/webhooks/google` - receive Google Calendar changes
- `GET /api/calendar/availability` - check barber availability

---

## Testing the changes

### 1. Verify multibarber works:
```typescript
// Open agenda today
// Create appointment for Luis at 10:00
// Create appointment for Diego at 10:00
// ✅ Both should succeed now (not conflict)
```

### 2. Check timestamps:
```typescript
// Open DevTools → Application → localStorage → barbershop-mvp
// Find an appointment
// ✅ Should have: createdAt, updatedAt, statusHistory, syncStatus
```

### 3. Test status transitions:
```typescript
// Create appointment → status = "pending"
// Click "Completar" → status = "completed", completedAt = now
// ✅ Check statusHistory has both entries
```

---

## Git commits for Phase 1

Suggested commits (after testing):

```bash
git add .
git commit -m "refactor: fix multibarber conflict validation per barberId"
git commit -m "refactor: enhance Appointment model with sync and audit fields"
git commit -m "feat: add domain events infrastructure for Make integration"
git commit -m "feat: add CalendarProvider abstraction for Google Calendar integration"
git commit -m "feat: add webhook infrastructure for Make automation"
git commit -m "chore: setup environment variables template for integrations"
git push origin main
```

---

## Next steps

1. **Integrate event dispatching into store** (Fase 2)
2. **Implement calend UI as hour-based grid** (Fase 2)
3. **Complete GoogleCalendarProvider implementation** (Fase 3)
4. **Setup Make webhook receiver** (Fase 4)
5. **Migrate to PostgreSQL backend** (Fase 5)

---

## Resources

- **Google Calendar API**: https://developers.google.com/calendar
- **Make (formerly Zapier)**: https://make.com
- **Meta WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Domain-Driven Design**: https://martinfowler.com/bliki/DomainDrivenDesign.html
- **Event Sourcing**: https://martinfowler.com/eaaDev/EventSourcing.html
