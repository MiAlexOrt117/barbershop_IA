# BarberShop IA MVP

Aplicación web tipo dashboard para gestión integral de barbería, preparada para demo comercial y futura evolución a SaaS con integraciones reales (Google Calendar, Make, WhatsApp Business API).

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript (strict)
- **State**: Zustand + localStorage (MVP, migrate to backend)
- **UI**: Tailwind CSS, Lucide icons
- **Charts**: Recharts
- **Calendar logic**: date-fns
- **Integraciones**: Arquitectura preparada para Google Calendar, Make webhooks, WhatsApp

## Ejecutar

```bash
# Setup environment (copy template)
cp .env.example .env.local

# Install & run
npm install
npm run dev

# Build for production
npm run build
npm run start

# Type checking
npm run lint
```

## Qué incluye

## Estado actual

- ✅ **Fase 2 completada**: agenda diaria real por horas, columnas por barbero, slots vacíos clicables, bloqueos visuales y acciones rápidas.
- ✅ **Fase 3 completada**: OAuth 2.0 real con Google Calendar, cookie cifrada para sesión, sync create/update/cancel y fallback local.
- ✅ **Fase 4 completada**: domain events conectados a Make vía webhook dispatcher con retry, HMAC, idempotencia y logs consultables.
- ✅ **Preparación de persistencia**: tipos de migración en `src/lib/persistence-types.ts` y propuesta SQL en `DATABASE_SCHEMA.md`.
- ✅ **Despliegue preparado**: guía en `DEPLOYMENT.md` para Vercel y evolución a backend persistente.

### Core Features
- ✅ Dashboard con KPIs y próxima cita
- ✅ Agenda diaria tipo Google Calendar
- ✅ CRM de clientes con LTV y riesgo de abandono
- ✅ Centro de campañas con segmentación
- ✅ Analytics con gráficas y exportación CSV
- ✅ Configuración de negocio, servicios, horarios, roles y WhatsApp

### Nuevas Capas de Integración (Fase 1)
- ✅ **Domain Events**: Estructura completa para `appointment.created`, `appointment.completed`, `payment.confirmed`, etc.
- ✅ **Calendar Provider Abstraction**: Interface preparada para Google Calendar, Outlook, local
- ✅ **Webhook Infrastructure**: Dispatcher con retry logic y idempotency para Make
- ✅ **Enhanced Audit Trail**: Appointments trackean `createdBy`, `updatedAt`, `statusHistory`, `syncStatus`
- ✅ **Multibarber Conflict Fix**: Validación de conflictos ahora es por barbero, no global

## Arquitectura

```
src/
├── app/                         # Pages & routes
│   ├── page.tsx                # Dashboard
│   ├── agenda/page.tsx          # Agenda (lista, será grilla)
│   ├── clientes/page.tsx        # CRM
│   ├── campanas/page.tsx        # Campaigns
│   ├── estadisticas/page.tsx    # Analytics
│   ├── configuracion/page.tsx   # Settings
│   ├── api/                      # Backend APIs (future)
│   └── layout.tsx               # Root layout
│
├── lib/                          # Business logic & integrations
│   ├── types.ts                  # Domain models
│   ├── store.ts                  # Zustand state (localStorage)
│   ├── seed.ts                   # Demo data
│   ├── metrics.ts                # Business calculations
│   ├── export.ts                 # CSV export
│   ├── utils.ts                  # Helper functions
│   ├── whatsapp.ts               # WhatsApp building
│   │
│   # NEW: Integration architecture
│   ├── domain-events.ts          # Business events (appointment.created, etc)
│   ├── calendar-provider.ts      # Calendar abstraction (Google, local, etc)
│   ├── webhooks.ts               # Webhook dispatcher for Make integration
│   └── ...
│
└── components/                   # UI components
    ├── app-shell.tsx             # Navigation
    ├── appointment-card.tsx      # Cita card
    ├── kpi-card.tsx              # Métrica
    ├── stats-charts.tsx          # Analytics visualizations
    ├── modals.tsx                # Dialogs
    └── ui.tsx                    # Primitives
```

## Datos

El MVP arranca con datos mock realistas (30+ clientes, 50+ citas) persistidos en `localStorage` con estructura de:

```typescript
{
  role: "owner",
  settings: { name, phone, hours, ... },
  barbers: [ { id, name, color, ... } ],
  services: [ { id, name, price, duration, ... } ],
  clients: [ { id, name, phone, lastVisit, LTV, ... } ],
  appointments: [ { id, clientId, barberId, start, end, syncStatus, ... } ],
  campaignTemplates: [ { id, name, message, ... } ]
}
```

## Integraciones Preparadas

### Google Calendar (Fase 3)
- ✅ CalendarProvider abstraction ready
- ✅ OAuth 2.0 via `/api/integrations/google/connect` + callback
- ✅ Bidirectional base sync (create, update, delete events)
- ⏳ Watch channels for real-time updates (estructura lista, no activado por defecto)

**Environment vars needed:**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_CALENDAR_ID=...
```

### Make Webhook (Fase 4)
- ✅ WebhookDispatcher + IdempotencyStore ready
- ✅ Domain events emitted from store actions
- ✅ POST real a webhook de Make mediante `/api/integrations/events/dispatch`
- ✅ Logs de entrega consultables en `/api/integrations/webhooks/logs`

**Environment var:**
```bash
NEXT_PUBLIC_MAKE_WEBHOOK_URL=https://hooks.make.com/your_hook
```

**Make can then trigger:**
- WhatsApp message when appointment completed
- Payment confirmation link
- Reactivation campaigns
- SMS reminders

### WhatsApp Business API (Fase 5)
- ✅ buildWhatsAppLink() exists for manual links
- ⏳ Integration with Meta WhatsApp Business API
- ⏳ Automatic message sending from Make

**Environment vars needed:**
```bash
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCESS_TOKEN=...
```

## Cambios Fase 1: Quick Wins ✅

### 1. Multibarber Conflict Fix
**Problem**: Two barbers couldn't work simultaneously - conflicts checked globally
**Solution**: Refactored `hasConflict()` → `hasConflictForBarber(barberId)` in store.ts
**Result**: Luis 10:00 + Diego 10:00 now both succeed ✅

### 2. Enhanced Appointment Model
**Added fields:**
```typescript
externalEventId?: string;        // Google Calendar event ID
provider?: "local" | "google";   // Sync provider
syncStatus?: "pending" | "synced" | "failed";
syncError?: string;
createdBy?: string;              // Who created
updatedAt?: string;              // Last modification
completedAt?: string;            // When done
cancelledAt?: string;            // When cancelled
statusHistory?: [{               // Full audit trail
  status,
  timestamp,
  reason
}];
```

### 3. Domain Events Infrastructure
Created `src/lib/domain-events.ts` with events:
- `appointment.created` → Make knows new booking
- `appointment.completed` → Trigger payment & WhatsApp
- `appointment.cancelled` → Send cancellation link
- `payment.confirmed` → Send confirmation
- `client.created` → Add to CRM automation
- etc.

### 4. Calendar Provider Abstraction  
Created `src/lib/calendar-provider.ts` with:
- `ICalendarProvider` interface
- `LocalCalendarProvider` (MVP-ready)
- `GoogleCalendarProvider` (stubs for OAuth)
- Factory pattern for provider selection

### 5. Webhook Infrastructure
Created `src/lib/webhooks.ts` with:
- `WebhookDispatcher` (sends events to Make)
- Retry logic + exponential backoff
- Delivery logging
- `IdempotencyStore` (prevent duplicate events)

### 6. Environment Setup
- Created `.env.example` template
- All future integrations have documented variables

## Checklist: ¿Qué sigue?

### Fase 2: Agenda como Google Calendar
- [ ] Instalar FullCalendar o React Big Calendar
- [ ] Convertir agenda a vista por horas (hourly grid)
- [ ] Columnas por barbero
- [ ] Slots visuales (disponibilidad)
- [ ] Click en slot para agendar
- [ ] Drag & drop (opcional)

### Fase 3: Google Calendar Sync
- [ ] npm install googleapis google-auth-library
- [ ] Setup OAuth 2.0 endpoint (`POST /api/auth/google`)
- [ ] Implementar GoogleCalendarProvider
- [ ] Sync create/update/delete events
- [ ] Setup Watch API (real-time)

### Fase 4: Make Integration
- [ ] Integrar WebhookDispatcher en store
- [ ] Emitir eventos en createAppointment, markCompleted, etc
- [ ] Setup Make webhook URL
- [ ] Test: Create appointment → Make receives → WhatsApp sent

### Fase 5: Backend & Database
- [ ] Crear PostgreSQL database
- [ ] Implementar API routes (src/app/api)
- [ ] Migrar localStorage → Supabase/PostgreSQL
- [ ] Implementar authentication (OAuth)

## Docs

- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Paso a paso para cada fase
- **[Google Calendar API Docs](https://developers.google.com/calendar)**
- **[Make Docs](https://www.make.com/en/help)**
- **[WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)**

## Backend futuro

Actualmente: **localStorage frontend** (MVP)

Recomendación arquitectura:
```
Frontend (Next.js + React)
    ↓
API Routes (src/app/api)
    ↓
Backend (Node.js + Express / Fastify / Next.js API)
    ↓
Database (PostgreSQL recomendado)
    ↓
Integrations:
  - Google Calendar
  - Make webhooks
  - WhatsApp Business API
```

**Database choice rationale:**
- **Supabase** (recomendado): PostgreSQL + auth + realtime + API built-in
- NOT Firebase: No tienes relaciones complejas (appointments ← barbers, clients)
- NOT MongoDB: NoSQL innecesario para schedule estructurado

**Deployment options:**
- **Frontend**: Vercel (Next.js native, preview deployments)
- **Backend**: Railway + PostgreSQL (simple, pipes integrations)
- Alternative: Render (all-in-one)

## Desarrollo

```bash
# Development
npm run dev          # http://localhost:3000

# Production build
npm run build
npm run start

# Lint & type check
npm run lint

# Clean (next cache)
rm -rf .next
```

## Demo Data

El seed.ts genera:
- 4 barberos (Luis, Diego, Mateo, Sofía)
- 6 servicios (cortes, barba, tratamiento)
- 30 clientes con historiales variables
- 50+ citas en los últimos 10 días
- VIP status, pagos, no-shows

Para resetear datos: Limpiar localStorage en DevTools.

## Notas importantes

### Multibarber NOW WORKS ✅
Previously: Global conflict check = imposible multibarber  
Now: Per-barber conflict check = multibarber funciona

### Ready for Google Calendar
Structure exists for bidirectional sync  
Just need: OAuth credentials + API implementation

### Ready for Make
Events emitted with proper structure  
Just need: Connect emitters + webhook URL

### Ready for Production?
No: localStorage is NOT production-safe  
Plan: Backend + Database en Fase 5
