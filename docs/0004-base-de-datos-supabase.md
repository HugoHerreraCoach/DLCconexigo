# 0004 — Base de datos del panel en Supabase (en lugar de Neon)

**Fecha:** 2026-09-24

## Qué se hizo

El registro propio del panel (`/panel`, ver [0003](0003-panel-de-medicion.md))
usará **Supabase** como Postgres en vez de Neon. El código ya está preparado
para que, al agregar la variable en Vercel y volver a desplegar, funcione sin
más pasos: la tabla `eventos` se crea sola en la primera visita.

## Por qué hubo que tocar código

La conexión (postgres.js) ya era compatible con Postgres en general, pero con
Supabase había cuatro trampas:

| Problema | Solución en `src/server/db.ts` |
| --- | --- |
| La integración Supabase de Vercel crea `POSTGRES_URL`, no `DATABASE_URL` | Se lee `DATABASE_URL` y, si no existe, `POSTGRES_URL` |
| Esa URL trae `supa=base-pooler.x` (y la variante Prisma `pgbouncer=true&connection_limit=1`). postgres.js manda cualquier parámetro desconocido al servidor y Postgres rechaza la conexión | Se quitan `supa`, `pgbouncer` y `connection_limit` antes de conectar |
| La cadena que se copia del panel de Supabase no trae `sslmode` | Se agrega `sslmode=require` cuando el host no es local |
| Supabase publica las tablas de `public` en su API REST: sin RLS, quien tenga la *anon key* podría leer los eventos | `ALTER TABLE eventos ENABLE ROW LEVEL SECURITY` al crear el esquema. Sin políticas, la API REST no ve nada; nuestra conexión entra como dueña de la tabla y no pasa por RLS |

Además: `connect_timeout: 10` (antes 30 por defecto) para que un fallo de red
no deje colgada la función; `prepare: false` ya estaba y es obligatorio con el
pooler en modo transacción (puerto 6543). Una URL mal pegada ya no rompe el
arranque: se registra el error en los logs y el registro queda desactivado.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/server/db.ts` | `prepararUrl()`: fallback a `POSTGRES_URL`, limpieza de parámetros, SSL; RLS en el esquema; `connect_timeout` |
| `src/views/panel/PanelView.tsx` | El aviso "Falta conectar la base de datos" ahora explica Supabase en vez de Neon |
| `docs/0003-panel-de-medicion.md` | Variables y siguientes pasos actualizados a Supabase |

## Cómo conectarla (pasos para el usuario)

**Opción A — a mano (recomendada, más simple):**

1. Crear el proyecto en [supabase.com](https://supabase.com). Región sugerida:
   **South America (São Paulo)**, la más cercana a Perú. Guardar la contraseña de
   la base de datos.
2. En el proyecto: botón **Connect** (arriba) → pestaña **Connection string**
   → **Transaction pooler** (puerto **6543**). Copiar la URI y reemplazar
   `[YOUR-PASSWORD]` por la contraseña. Si la contraseña tiene símbolos
   (`@ # / ? %`…), deben ir codificados (`@` → `%40`, `#` → `%23`) o, más
   fácil, resetear la contraseña a una sin símbolos.
   Ejemplo de forma: `postgresql://postgres.<ref>:<clave>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
3. Vercel → proyecto → **Settings → Environment Variables** → `DATABASE_URL` =
   esa URI (entornos Production y Preview).
4. Agregar también `PANEL_PASSWORD` si aún no está.
5. **Deployments → Redeploy**.

**Opción B — integración de Vercel:** Vercel → **Storage** / Marketplace →
**Supabase** → conectar al proyecto. Crea `POSTGRES_URL` y otras variables
solas; el código ya usa `POSTGRES_URL` si no hay `DATABASE_URL`. Luego redeploy.

**No usar** la conexión *Direct connection* (puerto 5432, `db.<ref>.supabase.co`):
es solo IPv6 y las funciones de Vercel no siempre llegan a ella.

### Comprobación tras el redeploy

1. Entrar a `https://grupodlc.conexigo.com/panel` con la contraseña.
2. En otra pestaña (sin bloqueador), abrir la landing.
3. Recargar el panel: la visita aparece. En Supabase → **Table Editor** se ve la
   tabla `eventos` con RLS activo.

Si el panel muestra "No se pudo leer la base de datos", revisar los logs de la
función en Vercel; casi siempre es la contraseña mal copiada o el puerto 5432
en vez de 6543.

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint` y `pnpm build` sin errores.
- Normalización de URLs probada con formas reales de Supabase: URI del panel
  (se agrega `sslmode=require`), URL de la integración con `supa=…` (se quita),
  variante Prisma con `pgbouncer`/`connection_limit` (se quitan), contraseña con
  `%40` (se conserva), localhost con `sslmode=disable` (intacta), texto que no
  es URL (registro desactivado sin romper).
- Prueba de punta a punta con Postgres local (PGlite) y build de producción,
  usando **`POSTGRES_URL` con `supa=base-pooler.x`** (el caso de la integración):
  - `POST /api/eventos` visita, contacto y lead → 204, las 3 filas guardadas.
  - `relrowsecurity = true` en `eventos` y aun así la app inserta y lee.
  - `/panel` en Brave: login correcto, KPIs, fuentes, botón `hero`, campaña
    `prueba` y el formulario de TikTok se muestran bien.
- **No verificado:** conexión contra un Supabase real (no hay proyecto creado
  aún). La prueba real es el paso "Comprobación tras el redeploy".

## Conexión real y `.env.local` (2026-09-24)

- Proyecto Supabase creado: ref `twfcxvnnqwwhlvjaxoab`, región `sa-east-1`
  (São Paulo), PostgreSQL 17.6.
- Se creó **`.env.local`** (ignorado por git vía `.env*.local`) con:
  `DATABASE_URL` (pooler transacción 6543, trae `pgbouncer=true`, que `db.ts`
  quita), `DIRECT_URL` (pooler sesión 5432, no lo usa la app),
  `PANEL_PASSWORD` (generada al azar, solo local), `META_ACCESS_TOKEN`,
  `TIKTOK_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID` **vacíos** (aún no existen) y
  las claves de la API de Supabase (`SUPABASE_URL`, anon, secret, service_role)
  solo como referencia: la app no las usa.
- Verificado contra el Supabase real con `pnpm start` local: login en `/panel`,
  el panel lee sin error, la tabla `eventos` se creó sola con
  `relrowsecurity = true`, y un `INSERT` de prueba dentro de una transacción
  revertida funcionó (la tabla quedó con 0 filas).
- **Ojo:** local y producción usan la **misma base**. Abrir la landing en
  local (`pnpm dev`/`start`) registra visitas reales en las estadísticas.

## Pendientes

- En Vercel: `DATABASE_URL` (la misma URI del pooler 6543) y `PANEL_PASSWORD`
  (elegir una propia para producción), luego redeploy. **No** subir a Vercel
  las claves `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: no hacen falta.
- ~~Subir el commit `341f5e6` a `main`~~ — subido el 2026-09-24; Vercel lo publica solo.
- El proyecto de Vercel **no** está en la cuenta `jhefersonchalansanchez-4272`
  (equipo JhefDev); las variables las carga el usuario desde la cuenta que tiene
  la landing, o invita a esa cuenta al equipo para que Claude las cargue por CLI.
- Resto de pasos del panel (tokens de Meta/TikTok, UTM en anuncios): ver
  "Estado al cierre" en [0003](0003-panel-de-medicion.md).
