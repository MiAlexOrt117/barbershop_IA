# Architecture Decision Record (ADR) - Barbershop IA

## System Design for Calendar + Integrations

---

## 1. Multibarber Conflict Resolution

### Decision
Validate appointment conflicts **per-barberId** instead of globally across all appointments.

### Rationale
**Before (BROKEN)**:
```typescript
// This prevented TWO BARBERS from working simultaneously
function hasConflict(appointments: Appointment[], start: string, end: string) {
  return appointments.some(appt => overlaps(appt.start/end with start/end));
}
// Result: Luis 10:00-10:30 + Diego 10:00-10:30 = CONFLICT ❌
```

**After (FIXED)**:
```typescript
function hasConflictForBarber(appointments: Appointment[], barberId: string | null, start: string, end: string) {
  return appointments.some(appt => appt.barberId === barberId && overlaps(...));
}
// Result: Luis 10:00-10:30 + Diego 10:00-10:30 = NO CONFLICT ✅
```

### Implementation
- File: `src/lib/store.ts`
- Changed: `createAppointment()` now filters conflicts by barberId
- Impact: Multibarber scheduling now works correctly
- Backward compat: Yes, no schema changes

---

## 2. Appointment Model with Sync Support

### Decision
Add fields to Appointment for Google Calendar sync + audit trail.

### Design

```typescript
interface Appointment {
  // Core (unchanged)
  id: string;
  clientId: string | null;
  barberId: string | null;
  start: string;
  end: string;
  status: AppointmentStatus;
  
  // NEW: Calendar sync
  externalEventId?: string;           // Google Event ID
  provider?: "local" | "google";      // Data source
  syncStatus?: "pending" | "synced" | "failed" | "conflict";
  syncError?: string;
  
  // NEW: Audit trail
  createdAt: string;
  createdBy?: string;                 // Who created
  updatedAt?: string;                 // When last modified
  completedAt?: string | null;
  cancelledAt?: string | null;
  
  // NEW: Status history
  statusHistory?: Array<{
    status: AppointmentStatus;
    timestamp: string;
    reason?: string;
  }>;
  
  // Metadata
  tags?: string[];                    // VIP, urgent, follow-up
}
```

### Rationale
- **externalEventId**: Links local appointment to Google event
- **syncStatus**: Tracks sync state (pending = not yet synced, synced = confirmed, failed = retry)
- **statusHistory**: Full audit trail for compliance & debugging
- **createdBy**: Identifies operator (needed for multi-user)
- **Timestamps**: Required for proper ordering & auditing

### Example flow
```
1. User creates appointment
   → appointment created with syncStatus = "pending"
   
2. Store tries to sync with Google Calendar
   → externalEventId = "google123abc"
   → syncStatus = "synced"
   
3. User updates time in Google Calendar
   → Webhook from Google arrives
   → syncStatus = "conflict" (local vs external differ)
   → Admin must resolve
   
4. User completes appointment
   → status = "completed"
   → completedAt = now
   → statusHistory gets entry
```

---

## 3. Domain Events Architecture

### Decision
Implement domain event pattern for loose coupling between store and integrations.

### Design

```
Store (Zustand)
    ↓ emits
DomainEvent (appointment.created)
    ↓ published to
EventBus / WebhookDispatcher
    ↓ triggers
Make Webhooks / Calendar Sync / Email / SMS
```

### Events defined

```typescript
type DomainEventType =
  | "appointment.created"
  | "appointment.updated"
  | "appointment.completed"
  | "appointment.cancelled"
  | "appointment.no_show"
  | "appointment.blocked"
  | "walkin.created"
  | "client.created"
  | "payment.confirmed"
  | "payment.pending"
  | "calendar.sync_started"
  | "calendar.sync_completed"
  | "calendar.sync_failed";

interface DomainEvent {
  id: string;                          // event-unique-id
  type: DomainEventType;
  timestamp: string;
  aggregateId: string;                 // appointment.id
  aggregateType: string;               // "appointment"
  data: Record<string, unknown>;       // Event payload
  metadata?: {
    userId?: string;
    source?: "local" | "google_calendar";
    idempotencyKey?: string;           // Prevents duplicates
  };
}
```

### Rationale
- **Decoupling**: Store doesn't know about integrations
- **Event sourcing ready**: Can replay events for audit log
- **Make-friendly**: Structured payloads for Zapier-like automation
- **Idempotency**: idempotencyKey prevents duplicate processing

### Example: appointment.created event

```json
{
  "id": "evt-1234567890",
  "type": "appointment.created",
  "timestamp": "2024-04-15T14:30:00Z",
  "aggregateId": "appt-001",
  "aggregateType": "appointment",
  "data": {
    "appointmentId": "appt-001",
    "clientId": "client-001",
    "clientName": "John Doe",
    "clientPhone": "+52-5512345678",
    "serviceId": "svc-fade",
    "serviceName": "Fade premium",
    "barberId": "barber-luis",
    "barberName": "Luis",
    "start": "2024-04-15T15:00:00Z",
    "end": "2024-04-15T15:45:00Z",
    "amount": 180
  },
  "metadata": {
    "source": "local",
    "idempotencyKey": "appt-001"
  }
}
```

---

## 4. Calendar Provider Abstraction

### Decision
Define ICalendarProvider interface to support multiple calendar backends.

### Design

```typescript
interface ICalendarProvider {
  // Check auth state
  isAuthenticated(): boolean;
  authenticate(credentials): Promise<void>;
  
  // CRUD operations
  createEvent(event: CalendarEvent): Promise<CalendarSyncResult>;
  updateEvent(id: string, event: CalendarEvent): Promise<CalendarSyncResult>;
  deleteEvent(id: string): Promise<CalendarSyncResult>;
  
  // Querying
  listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]>;
  getEvent(externalEventId: string): Promise<CalendarEvent | null>;
  
  // Real-time sync (optional)
  watchChanges?(calendarId: string): Promise<string>;
  unwatchChanges?(channelId: string): Promise<void>;
}
```

### Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| LocalCalendarProvider | ✅ Complete | In-memory, no external sync (MVP) |
| GoogleCalendarProvider | ⏳ Stubs | Need OAuth + API calls |
| OutlookProvider | - | Future |
| CalDavProvider | - | Future |

### Rationale
- **Plugin architecture**: Easy to add new providers
- **Testability**: Mock providers for unit tests
- **Bidirectional sync**: Interface supports pulling + pushing changes
- **Real-time**: watchChanges() for Google Calendar Watch API

### Usage example

```typescript
// MVP: Use local provider
const provider = CalendarProviderFactory.create("local");

// Production: Use Google Calendar
const provider = CalendarProviderFactory.create("google");

// Create an event
const result = await provider.createEvent({
  title: "Haircut - John Doe",
  startTime: "2024-04-15T10:00:00Z",
  endTime: "2024-04-15T10:45:00Z",
  color: "#72f0c4",  // Barber's color
  busy: true
});

// Save external ID for syncing
if (result.success) {
  appointment.externalEventId = result.externalEventId;
  appointment.syncStatus = "synced";
}
```

---

## 5. Webhook Infrastructure for Make

### Decision
Implement WebhookDispatcher to send events to Make with retry logic.

### Design

```
Store emits DomainEvent
    ↓
WebhookDispatcher.dispatch(event)
    ↓
HTTP POST to Make webhook URL
    ↓
Make receives structured payload
    ↓
Make triggers workflows:
  - Send WhatsApp message
  - Send payment link
  - Update CRM
  - Schedule SMS
```

### Features

**WebhookDispatcher:**
- Sends HTTP POST with event payload
- Retry logic: exponential backoff (1s, 2s, 4s, 8s)
- Idempotency: eventId + idempotencyKey prevent duplicates
- Delivery logging: tracks success/failure/retries
- Timeout: 10s default

**IdempotencyStore:**
- Check if idempotencyKey already processed
- Return cached result if duplicate
- Prune old entries (24h default) to save memory

**Make webhook format:**

```bash
POST https://hooks.make.com/YOUR_CUSTOM_HOOK_ID
Content-Type: application/json
X-Event-Type: appointment.completed
X-Event-ID: evt-1234567890
X-Timestamp: 2024-04-15T14:30:00Z
X-Signature: sha256=... (if secret configured)

{
  "id": "evt-1234567890",
  "type": "appointment.completed",
  "timestamp": "2024-04-15T14:30:00Z",
  "aggregateId": "appt-001",
  "aggregateType": "appointment",
  "data": {
    "appointmentId": "appt-001",
    "clientPhone": "+52-5512345678",
    "clientName": "John Doe",
    "barberName": "Luis",
    "serviceName": "Fade premium",
    "amount": 180,
    "completedAt": "2024-04-15T14:30:00Z"
  },
  "metadata": {
    "source": "local",
    "idempotencyKey": "appt-001"
  }
}
```

### Rationale
- **Push model**: Make pulls from webhook (not polling)
- **Retry resilience**: Handles Make downtime gracefully
- **Signature verification**: Make can verify authenticity
- **Structured format**: Easy to parse in Make workflows

---

## 6. Sync State Machine

### Decision
Define clear states for appointment sync status.

### States

```
LOCAL ONLY
    ↓
PENDING (waiting to sync with Google Calendar)
    ↓
SYNCED (successfully synced, externalEventId set)
    ↓
CONFLICT (local ≠ Google, needs resolution)
    ↓
FAILED (last sync attempt failed, retry)
```

### Transitions

```
created → pending (not synced yet)
pending → synced (sync success)
synced → pending (user updated locally)
pending → failed (sync error)
failed → pending (retry)
[any] → conflict (detected mismatch with Google)
```

### Implementation

```typescript
interface Appointment {
  syncStatus?: "pending" | "synced" | "failed" | "conflict";
  syncError?: string;
  externalEventId?: string;
  provider?: "local" | "google";
}
```

### Conflict resolution strategy

```
Scenario 1: Time conflict in Google Calendar
  - Google: 10:00-10:30 moved to 11:00-11:30
  - Local: Still 10:00-10:30
  → Admin notification: "Appointment was moved in Google Calendar"
  → Options: Accept Google version OR push local version back

Scenario 2: Concurrent updates
  - Local: Status marked "completed"
  - Google: Event duration extended (more time)
  → syncStatus = "conflict"
  → Log the mismatch
  → Admin UI shows: "Local vs Google differ, review"
```

---

## 7. Database Choice Recommendation

### Decision
**PostgreSQL** (via Supabase for MVP, self-hosted for production)

### Comparison

| Aspect | PostgreSQL | Firebase | MongoDB |
|--------|------------|----------|---------|
| **Relational** | ✅ Perfect for appointments (has barber, client) | ❌ Messy | ❌ Not designed for it |
| **Realtime** | ⏳ Needs polling | ✅ Built-in | ⏳ Needs polling |
| **Querying** | ✅ SQL powerful | ❌ Limited | ❌ Limited |
| **Transactions** | ✅ ACID | ❌ Eventual | ⚠️ Limited |
| **Webhooks** | ✅ Via API layer | ⏳ Requires Firestore | ⏳ Requires integration |
| **Cost** | 💰 Cheap | 💰 Can be expensive | 💰 Cheap |
| **Scaling** | ✅ Enterprise ready | ✅ Auto | ⚠️ Cluster management |

### Why PostgreSQL wins
- **Appointments ← Barber + Client**: Natural foreign keys
- **Scheduling**: Complex queries (availability, conflicts)
- **Audit trail**: statusHistory = JSONB column
- **Integrations**: Easy webhooks from API layer
- **Standards**: SQL = less learning curve

### Implementation path
```
MVP:    Zustand + localStorage
↓
Phase 2: Supabase (PostgreSQL + Auth + Realtime)
↓
Production: Self-hosted PostgreSQL + Node.js backend
```

---

## 8. Deployment Architecture

### Decision
Vercel (frontend) + Railway (backend + DB)

### Rationale

| Component | Provider | Why |
|-----------|----------|-----|
| **Frontend (Next.js)** | Vercel | Native support, preview deployments, edge functions |
| **Backend API** | Railway | Simple setup, PostgreSQL included, ENV injection |
| **Database (PostgreSQL)** | Railway | Managed, automatic backups, simple |
| **Webhooks** | Both | Vercel API routes + Railway cron jobs |

### Architecture

```
┌─────────────────────────────────────┐
│  GitHub (repo)                      │
└─────────────────────────────────────┘
    ↓ push
┌─────────────────────────────────────┐
│  Vercel (Frontend deployment)       │
│  - Next.js frontend                 │
│  - API routes (src/app/api)         │
│  - Webhooks receiver                │
│  - CLIENT state (Zustand+localStorage)
└─────────────────────────────────────┘
    ↓ API calls
┌─────────────────────────────────────┐
│  Railway (Backend + Database)       │
│  - Node.js backend (Express/Fastify)│
│  - PostgreSQL database              │
│  - SERVER state management          │
│  - Cron jobs (sync Google Calendar) │
└─────────────────────────────────────┘
    ↓ webhooks
┌─────────────────────────────────────┐
│  Make (Automation)                  │
│  - Receives: appointment.completed  │
│  - Triggers: WhatsApp, SMS, email   │
└─────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│  Google Calendar API               │
│  - Sync appointments               │
│  - Watch for changes               │
└────────────────────────────────────┘
```

---

## 9. Implementation Phases

### ✅ Phase 1: Quick Wins (COMPLETE)
- [x] Fix multibarber conflict
- [x] Enhance Appointment model
- [x] Domain events structure
- [x] Calendar provider abstraction
- [x] Webhook infrastructure
- [x] Environment variables

### ⏳ Phase 2: Calendar UI (NEXT)
- [ ] Migrate to FullCalendar or React Big Calendar
- [ ] Hour-based grid view
- [ ] Columns per barber
- [ ] Visual availability
- [ ] Click-to-book slots

### ⏳ Phase 3: Google Calendar Integration
- [ ] OAuth 2.0 setup
- [ ] GoogleCalendarProvider implementation
- [ ] Bidirectional sync (create/update/delete)
- [ ] Watch API for real-time

### ⏳ Phase 4: Make Integration
- [ ] Connect WebhookDispatcher to store
- [ ] Emit events on appointment state changes
- [ ] Setup Make webhook URL
- [ ] Test workflows (WhatsApp, SMS, CRM)

### ⏳ Phase 5: Backend Migration
- [ ] Design PostgreSQL schema
- [ ] Setup Railway + Supabase
- [ ] Build API routes
- [ ] Migrate state from localStorage
- [ ] Implement authentication

---

## 10. Tech Debt & Future Improvements

### Short term (before production)
- [ ] Implement event emitter in store
- [ ] Add proper error handling
- [ ] Create unit tests for domain events
- [ ] Setup CI/CD (GitHub Actions)

### Medium term (1-3 months)
- [ ] Multi-user support (roles + perms)
- [ ] Encryption for sensitive data
- [ ] Data backup & disaster recovery
- [ ] Analytics/monitoring

### Long term (3+ months)
- [ ] Mobile app (React Native)
- [ ] Advanced scheduling (AI-based)
- [ ] Advanced analytics (ML)
- [ ] Multi-location support

---

## Links

- Google Calendar API: https://developers.google.com/calendar
- Make Docs: https://www.make.com/en/help
- Supabase: https://supabase.com
- Railway: https://railway.app
- Vercel: https://vercel.com
