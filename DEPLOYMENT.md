# Deployment Recommendation

## Recomendación para demo con cliente

**Frontend + API Routes en Vercel**

- Este proyecto ya está en App Router y `next build` queda limpio, así que el camino más corto para demo es desplegarlo directamente en Vercel.
- La agenda, las rutas OAuth de Google, el sync de calendario y los endpoints de webhooks funcionan como rutas Next.js estándar.
- Usa Preview Deployments para validar ramas antes de enseñar cambios al cliente.

## Variables que debes cargar en Vercel

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `APP_ENCRYPTION_SECRET`
- `MAKE_WEBHOOK_URL`
- `MAKE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MAKE_WEBHOOK_URL`
- `NEXT_PUBLIC_TIMEZONE`

## Cuándo Vercel solo sí alcanza

Vercel sirve bien para:

- Demo comercial
- Agenda operativa
- OAuth y sync básico con Google Calendar
- Envío de webhooks hacia Make

## Cuándo conviene sumar backend persistente

Si el producto pasa de demo a operación diaria con reintentos persistentes, auditoría duradera y colas, la arquitectura recomendada es:

1. UI + rutas públicas en Vercel.
2. PostgreSQL/Supabase como fuente de verdad.
3. Worker/backend persistente para retries, inbound webhooks y reconciliación de Google Calendar.

## Opción recomendada para evolución SaaS

- **Vercel + Supabase**: mejor equilibrio entre velocidad de salida, Postgres real y facilidad operativa.
- **Vercel + backend Node dedicado + PostgreSQL**: mejor si esperas integraciones más complejas, colas o multi-sucursal con procesos largos.
