# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js 16 (App Router).** Antes de escribir cualquier código de Next.js, lee la guía relevante en `node_modules/next/dist/docs/` (ver `01-app/`). Las APIs difieren de versiones anteriores.

## Comandos

```bash
npm run dev      # servidor de desarrollo (next dev)
npm run build    # prisma generate && next build
npm run lint     # eslint
npm start        # producción (next start)

npx prisma studio          # inspeccionar la BD
npx prisma generate        # regenerar el cliente Prisma tras editar schema.prisma
```

- **No hay suite de tests** ni framework configurado. La verificación se hace con `npm run lint` y `npm run build`.
- **Nunca** corras migraciones destructivas contra producción. `npm run db:push:LOCAL_ONLY_NEVER_IN_PROD` (`prisma db push --accept-data-loss`) es solo para BD local. La BD de producción es Neon serverless; los cambios de schema en producción se hacen con cuidado (ver "Migraciones lazy" abajo).
- Deploy en Vercel (`buildCommand: prisma generate && next build`).

## Stack

Next.js 16.2.3 (App Router) · React 19.2.4 · TypeScript 5 · PostgreSQL (Neon serverless) + Prisma 5.22 (~147 modelos) · Tailwind 4 + shadcn/ui · Zustand · React Hook Form + Zod · Anthropic SDK · Vercel Blob · Sentry. Alias de imports: `@/*` → `./src/*`.

## Arquitectura

Es un CRM/ERP monolítico para una empresa de producción de eventos (audio/iluminación/video). ~139 páginas y ~435 endpoints. Ocho áreas de negocio: CRM/Ventas, Cotizaciones, Proyectos, Inventario, Finanzas, RRHH, Marketing, Admin.

### Grupos de rutas (`src/app/`)
- `(dashboard)/` — páginas internas protegidas, organizadas por módulo (`crm`, `finanzas`, `inventario`, `proyectos`, `marketing`, `rrhh`, `admin`, etc.).
- `(forms)/` — formularios públicos.
- Portales públicos sin auth en la raíz: `portal/`, `aprobacion/`, `propuesta/`, `brief/`, `confirmar/`, `trade/`, `presentacion/`, `contratos/`, `f/[token]`, etc. Se acceden por **token** (ver `src/lib/tokens.ts`, `presentacion-token.ts`).
- `api/` — endpoints REST. `api/cron/*` los dispara Vercel Cron (ver `vercel.json`, ~10 jobs).

### Autenticación y autorización (crítico)
- Auth es **JWT custom con `jose`**, NO NextAuth a pesar de la dependencia. Todo vive en `src/lib/auth.ts`: cookie HTTP-only `auth-token` (30 días), password con bcrypt. Roles: `ADMIN | USER | READONLY`.
- **`src/middleware.ts` NO hace auth** — solo aplica headers de seguridad y `Cache-Control: no-store`. La autenticación se aplica en dos lugares:
  1. **Páginas**: `(dashboard)/layout.tsx` llama `getSession()` y redirige a `/login`.
  2. **Cada endpoint API**: debe llamar `getSession()`/`requireAuth()`/`requireAdmin()` y devolver 401 manualmente. No hay protección automática — si añades un endpoint interno, agrega el chequeo tú mismo.
- **Control de acceso por módulo**: los no-admin ven solo los módulos en su fila de `ModuloAcceso`, o un preset por `area` (`AREA_MODULES` en `(dashboard)/layout.tsx`). Áreas: `DIRECCION | ADMINISTRACION | MARKETING | VENTAS | PRODUCCION | RRHH | GENERAL`. ADMIN ve todo.

### Convenciones de datos
- **Soft delete** vía campo `activo`/`active` — filtra por él, no borres filas.
- **Audit trail** en `ActividadUsuario` (helper en `src/lib/actividad.ts`).
- **Migraciones lazy**: algunos endpoints ejecutan `prisma.$executeRawUnsafe('ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...')` la primera vez que corren, como parche idempotente en producción sin migración formal (ej. `ensureVendedorId` en `api/tratos/route.ts`). Patrón intencional para Neon.
- Lógica de negocio compleja fuera de rutas, en `src/lib/` (`cotizador.ts`, `reportes.ts`, `kpi-calculators.ts`, `rider-accesorios.ts`, `proyecto-avance.ts`, `versiones.ts`, etc.). Prefiere extender estos módulos antes que inline en la página/endpoint.
- Instancia única de Prisma en `src/lib/prisma.ts` (singleton global).

### Otros detalles operativos
- **PWA con offline**: service worker + `OfflineProvider`; el middleware fuerza `no-store` y `next.config.ts` pone `staleTimes` en 0. Nada se cachea.
- **Rutas legacy**: los renombres de rutas se manejan con `redirects()` en `next.config.ts` — al renombrar una página, agrega el redirect ahí.
- **Sentry**: configurado en `src/instrumentation.ts` y `next.config.ts` (tunnel en `/monitoring`). Solo activo si hay DSN.
- **PDFs**: se generan con `@react-pdf/renderer` (componentes `*PDF.tsx` en `src/components/`).
