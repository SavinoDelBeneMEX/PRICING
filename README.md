# Portal de Pricing SBM

Portal interno de Savino del Bene México para solicitar cotizaciones especiales de servicios (Marítimo, Aéreo, Terrestre, Despacho aduanal, Seguros), cotizar al cliente con control de markup, e integrar y dar de alta al proveedor operador (documentación legal, operativa y de seguros), con revisión de Legal y alta final en Finanzas.

Mismo stack y estética que el [Portal de Crédito SBM](https://github.com/SavinoDelBeneMEX/sbm-portal): Next.js 13 (App Router) + Supabase + Resend, tema navy/gold.

## Ciclo de negocio

1. **Vendedor** crea una solicitud, selecciona uno o varios servicios y describe qué necesita cotizar.
2. **Pricing** cotiza cada servicio (sube PDF + monto).
3. **Vendedor** usa la calculadora de markup (alerta si el markup es menor al 8%, no bloqueante), sube la evidencia de aceptación del cliente y confirma a Pricing.
4. **Pricing** invita al proveedor operador (correo + tipo de proveedor).
5. **Proveedor** crea su cuenta, sube su expediente según checklist por tipo de proveedor, y lo envía a revisión legal.
6. **Legal** aprueba o rechaza documento por documento (los comentarios llegan al proveedor y a Pricing).
7. Cuando todos los documentos obligatorios están aprobados, **Finanzas** recibe la notificación y marca el alta como completada.

Cada transición dispara un correo (Resend) y queda registrada en `/auditoria`.

## Stack

- Next.js 13 (App Router, Server Actions)
- Supabase (Postgres, Auth, Storage, RLS)
- Resend (notificaciones por correo)
- Tailwind CSS (tema navy `#132a4c` / gold `#c9a227`)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con las credenciales de tu proyecto Supabase y Resend
```

1. Crea un proyecto en Supabase y ejecuta `supabase/migrations/0001_init.sql` (SQL editor o `supabase db push`).
2. Crea manualmente en Supabase Auth los primeros usuarios internos (uno por rol) y, para cada uno, una fila en `profiles` con su `role` (`vendedor`, `pricing`, `legal`, `finanzas`).
3. Los proveedores no se crean manualmente: se registran ellos mismos desde el link de invitación que envía Pricing.
4. `npm run dev` y entra por `/login` (interno) o `/proveedor/login` (proveedores).

## Variables de entorno

Ver `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor (server actions y `lib/supabase/admin.ts`) — nunca se expone al cliente.

## Estructura

- `app/(login, vendedor, pricing, legal, finanzas, proveedor, auditoria)` — una carpeta por rol/flujo.
- `lib/supabase/` — clientes de browser, server (SSR) y admin (service role).
- `lib/markup.ts` — cálculo de markup y umbral de alerta (8%).
- `lib/notifications.ts` — plantillas y envío de correo por evento.
- `lib/audit.ts` — helper para escribir en la bitácora.
- `supabase/migrations/0001_init.sql` — esquema completo, RLS, buckets de storage y seed del checklist documental.
- `middleware.ts` — protege rutas internas por rol; las rutas `/proveedor/*` validan sesión dentro de cada página.
