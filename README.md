# BarberShop IA MVP

Aplicación web tipo dashboard para gestión integral de barbería, preparada para demo comercial y futura evolución a SaaS.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Recharts
- date-fns

## Ejecutar

```bash
npm install
npm run dev
```

## Qué incluye

- Dashboard operativo con KPIs y próxima cita
- Agenda diaria con walk-ins, cierres de agenda y acciones rápidas
- CRM de clientes con historial, LTV y riesgo de abandono
- Centro de campañas con segmentos y previsualización de mensajes
- Estadísticas con gráficas y exportación CSV
- Configuración de negocio, servicios, horarios, roles y soporte por WhatsApp

## Arquitectura

- `src/lib`: modelos, seed, lógica de negocio y utilidades
- `src/components`: shell, cards, modales y UI reutilizable
- `src/app`: páginas principales

## Datos

El MVP arranca con datos mock realistas persistidos en `localStorage`.

## Backend futuro

La capa de negocio está separada para reemplazar `localStorage` por Supabase, PostgreSQL, Firebase o una API propia sin reescribir la UI.