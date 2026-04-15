# Database Schema Recommendation

## Recomendación principal

**Primera opción: Supabase (PostgreSQL)**

- Mantiene modelo relacional fuerte para citas, barberos, clientes, servicios y logs.
- Simplifica auth, storage y futuras suscripciones en tiempo real.
- Permite empezar con Postgres estándar y evita lock-in severo.

**Segunda opción: PostgreSQL gestionado (Railway, Neon, Render)**

- Útil si quieres backend Node/Next más controlado o workers dedicados.
- Mejor cuando Make, Google Calendar y webhooks crecen y necesitas colas/retries persistentes.

**No recomendado para este dominio: Firebase**

- El modelo de agenda multi-barbero, conflictos por recurso, historial de estados y sync logs se resuelve mejor en SQL.
- Las consultas operativas por rango horario y joins de citas/clientes/barberos son más naturales y auditables en PostgreSQL.

## Tablas base

```sql
create table barbers (
  id text primary key,
  name text not null,
  role text not null check (role in ('owner', 'barber')),
  color text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table services (
  id text primary key,
  name text not null,
  price numeric(10,2) not null,
  duration_minutes integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clients (
  id text primary key,
  name text not null,
  phone text not null,
  internal_notes text not null default '',
  vip boolean not null default false,
  last_visit_at timestamptz,
  next_visit_at timestamptz,
  total_spent numeric(10,2) not null default 0,
  visits integer not null default 0,
  no_shows integer not null default 0,
  avg_ticket numeric(10,2) not null default 0,
  frequency_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table appointments (
  id text primary key,
  client_id text references clients(id) on delete set null,
  service_id text references services(id) on delete set null,
  barber_id text references barbers(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null check (status in ('pending', 'completed', 'cancelled', 'no-show', 'walk-in', 'blocked')),
  source text not null check (source in ('scheduled', 'walk-in', 'blocked')),
  payment_status text not null check (payment_status in ('pending', 'paid')),
  amount numeric(10,2) not null default 0,
  google_event_id text,
  provider text not null default 'local' check (provider in ('local', 'google')),
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed', 'conflict')),
  sync_error text,
  notes text not null default '',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index appointments_barber_time_idx on appointments (barber_id, start_at, end_at);
create index appointments_status_idx on appointments (status, start_at);

create table appointment_status_history (
  id text primary key,
  appointment_id text not null references appointments(id) on delete cascade,
  status text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table webhook_delivery_logs (
  id text primary key,
  event_id text not null,
  event_type text not null,
  webhook_url text not null,
  status text not null check (status in ('pending', 'delivered', 'failed', 'retrying')),
  status_code integer,
  error text,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table calendar_connections (
  id text primary key,
  provider text not null check (provider = 'google'),
  calendar_id text not null,
  refresh_token_encrypted text not null,
  access_token_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Estrategia de migración

1. Mantener el dominio actual y mover solo persistencia detrás de una capa `repository`.
2. Persistir primero `appointments`, `clients`, `barbers`, `services`.
3. Mover luego `statusHistory`, `webhook_delivery_logs` y `calendar_connections`.
4. Dejar `localStorage` como caché offline o semilla demo, no como fuente de verdad.
