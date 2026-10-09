# 0003 — Panel de medición (`/panel`)

**Fecha:** 2026-09-23

## Qué se hizo

Una vista dentro del mismo proyecto, en `https://grupodlc.conexigo.com/panel`,
protegida con contraseña, para ver las métricas sin entrar a los
administradores de Meta o TikTok. Combina dos fuentes:

1. **Registro propio** (base de datos del proyecto): cada visita, clic a
   WhatsApp y formulario enviado se guarda en Postgres. No lo frenan los
   bloqueadores de anuncios, así que refleja el tráfico real.
2. **APIs de Meta y TikTok**: lo que reportan sus píxeles, leído por API.

## Qué muestra el panel

| Bloque | Contenido |
| --- | --- |
| KPIs | Visitas, visitantes únicos (% desde celular), clics a WhatsApp, formularios, tasa de contacto; variación vs. el período anterior |
| Visitas por día | Columnas por día (hover = detalle; "Ver datos" = tabla) |
| Contactos por día | Columnas apiladas: clics a WhatsApp + formularios |
| ¿De dónde vienen? | Meta / TikTok / Google / Otros / Directo, con visitas, contactos y tasa |
| Botón de WhatsApp más usado | Visita, cuotas, ficha, video, documentos, general |
| Campañas | Por `utm_campaign` de la URL del anuncio |
| Últimos formularios | Motivo, inicial, ubicación, siguiente paso (sin nombre ni celular) |
| Píxel de Meta / TikTok | Conteo de eventos según cada plataforma (o los pasos para conectarla) |

Períodos: Hoy, 7, 30 y 90 días. Los días se cortan en hora de Perú.

## Cómo se detecta la fuente

Al entrar se decide una vez por sesión (`sessionStorage`), en este orden:
`ttclid` / `utm_source` tiktok / referrer tiktok → **TikTok**; `fbclid` /
`utm_source` fb·ig·facebook·instagram·meta / referrer facebook·instagram →
**Meta**; `gclid` / google → **Google**; otro `utm_source` o referrer externo
→ **Otros**; nada → **Directo**. Meta y TikTok agregan `fbclid`/`ttclid` solos
al clic en el anuncio; para ver campañas por nombre, poner
`utm_campaign=<nombre>` en la URL del anuncio.

## Archivos

| Archivo | Rol |
| --- | --- |
| `src/shared/lib/registro.ts` | **Nuevo.** Cliente: visitante anónimo (UUID en `localStorage`), atribución, envío con `sendBeacon` |
| `src/shared/lib/pixeles.ts` | `rastrearLead`/`rastrearContacto` también llaman a `registrar()` |
| `src/shared/ui/Pixeles.tsx` | Registra la visita al cargar |
| `src/app/page.tsx` / `layout.tsx` | `<Pixeles />` pasa del layout a la landing, para que el panel no se mida a sí mismo |
| `src/app/api/eventos/route.ts` | **Nuevo.** `POST` público: valida contra listas cerradas, recorta textos, ignora bots, descarta cualquier campo extra (p. ej. celular) |
| `src/server/db.ts` | **Nuevo.** Conexión `postgres` (postgres.js) y creación automática de la tabla `eventos` |
| `src/server/metricas.ts` | **Nuevo.** Consultas del panel |
| `src/server/plataformas.ts` | **Nuevo.** Meta Graph API v26.0 `/{pixel}/stats` y TikTok Business API `/pixel/event/stats/`, caché 5 min |
| `src/server/sesion-panel.ts` | **Nuevo.** Contraseña única; cookie `httpOnly` con HMAC, 30 días |
| `src/app/panel/page.tsx`, `acciones.ts` | **Nuevo.** Ruta `/panel` (noindex) y acciones de entrar/salir |
| `src/views/panel/*` | **Nuevo.** `PanelView`, `GraficoColumnas` (SVG propio, sin librería), `Ingreso` |

Dependencias nuevas: `postgres`, `server-only`.

### Tabla `eventos`

`id bigserial · creado timestamptz · tipo (visita|contacto|lead) · visitante
(UUID anónimo) · fuente · campana · origen (botón) · movil bool · datos jsonb`
(solo en leads: `motivo`, `inicial`, `ubicacion`, `paso`).

## Configuración (variables en Vercel)

| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `PANEL_PASSWORD` | Contraseña del panel. Sin ella `/panel` muestra "Panel sin activar" | Sí |
| `DATABASE_URL` | Postgres en **Supabase** (Transaction pooler, puerto 6543). También vale `POSTGRES_URL` de la integración de Vercel. Pasos en [0004](0004-base-de-datos-supabase.md) | Sí, para el registro propio |
| `META_ACCESS_TOKEN` | Token de usuario del sistema (ads_read + business_management, caducidad "Nunca") con el píxel asignado | Para la tarjeta de Meta |
| `TIKTOK_ACCESS_TOKEN` + `TIKTOK_ADVERTISER_ID` | Token de larga duración de una app de TikTok for Business + id de la cuenta publicitaria | Para la tarjeta de TikTok |

Tras crear o cambiar variables hay que **volver a desplegar** (Vercel →
Deployments → Redeploy). Cambiar `PANEL_PASSWORD` cierra todas las sesiones.

## Verificación

- `tsc`, `eslint` y `pnpm build` sin errores.
- Prueba local con Postgres temporal en memoria (PGlite) y build de producción:
  - API: eventos válidos → 204; tipo inválido o sin visitante → 400; bot → no se guarda;
    fuente inválida → `directo`; un `celular` enviado a propósito **no se guardó**.
  - Panel con 315 eventos de prueba: totales cuadran con la suma por fuente
    (219 visitas, 63 WhatsApp, 33 formularios); hover del gráfico; 7 y 30 días.
  - Contraseña incorrecta → error; correcta → entra; Salir → vuelve al login.
  - Celular: sin scroll horizontal (tablas anchas se desplazan dentro de su tarjeta).
  - Landing con `?utm_source=facebook` → `POST /api/eventos` 204.
- Bug encontrado y corregido en la prueba: un fragmento `sql.unsafe()` anidado
  descuadraba parámetros; se cambió por fragmento normal. Las consultas del panel
  van en secuencia (no en paralelo) para no depender del pipelining.
- **No verificado:** las lecturas reales de las APIs de Meta y TikTok (faltan
  tokens). La forma de respuesta de Meta sale del SDK oficial; la de TikTok, de
  su documentación. Si algo no cuadra, la tarjeta muestra el error de la API.

## Límites conocidos

- Meta `/stats` solo guarda ~7 días; TikTok, máximo 30 días por consulta.
- Sin `DATABASE_URL` la landing no guarda nada (el endpoint responde 204 y no falla).
- Visitante único = por navegador; borrar datos del navegador cuenta uno nuevo.

## Cómo obtener los tokens

> ⚠️ Son credenciales: se pegan **solo en Vercel** (Settings → Environment
> Variables). Nunca en el chat, en el código ni en el repo (es público).

### `META_ACCESS_TOKEN`

Token de un **usuario del sistema** del Business Manager: no caduca y no
depende de la sesión personal de nadie.

Requisitos: ser administrador del Business de Conexipema y tener una app de
Meta conectada a ese Business.

1. **Crear la app** (si no existe): developers.facebook.com → **Mis apps →
   Crear app** → tipo **Negocios** → seleccionar el Business de Conexipema.
2. **Crear el usuario del sistema**: business.facebook.com → **Configuración
   del negocio → Usuarios → Usuarios del sistema → Agregar** → nombre (p. ej.
   `panel-dlc`), rol **Administrador**.
3. **Asignarle el píxel**: en ese usuario → **Asignar activos → Orígenes de
   datos → Conjuntos de datos / Píxeles** → píxel `24878647091813468`, acceso
   de al menos "ver".
4. **Generar el token**: en el mismo usuario → **Generar nuevo token** → elegir
   la app del paso 1 → caducidad **Nunca** → permisos **`ads_read`** y
   **`business_management`** → Generar.
5. Copiar el token (empieza con `EAA…`) → Vercel → **`META_ACCESS_TOKEN`**.

Detalle técnico: el panel llama a
`GET https://graph.facebook.com/v26.0/24878647091813468/stats?aggregation=event&start_time=<unix>`
y suma los conteos por hora. Meta solo guarda ~7 días de este dato.

### `TIKTOK_ADVERTISER_ID`

El número de la **cuenta publicitaria** (≈19 dígitos). Está en TikTok Ads
Manager → menú de cuenta arriba a la derecha, o en la URL (`aadvid=…`).

### `TIKTOK_ACCESS_TOKEN`

Requiere una **app de desarrollador** de TikTok for Business.

1. **business-api.tiktok.com** → registrarse como desarrollador → **My Apps →
   Create App**.
   - Permisos: los de **medición / píxel** (Measurement / Pixel management) y
     lectura de la cuenta publicitaria.
   - URL de redirección: `https://grupodlc.conexigo.com/` (sirve cualquiera
     propia; solo hace falta leer el `auth_code` de la URL).
   - ⏳ TikTok **revisa la app**; la aprobación puede tardar unos días.
2. Ya aprobada: abrir el **enlace de autorización** de la app → iniciar sesión
   con la cuenta dueña de la cuenta publicitaria → aceptar. Redirige a una URL
   con **`auth_code=…`** (un solo uso, vence en **1 hora**).
3. Canjear el `auth_code` por el token de larga duración (no caduca):

   ```
   POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
   Content-Type: application/json

   { "app_id": "<APP_ID>", "secret": "<SECRET>", "auth_code": "<AUTH_CODE>" }
   ```

   La respuesta trae `data.access_token` (el token) y `data.advertiser_ids`
   (confirma el advertiser id). Claude puede hacer este canje si se le pasan
   `app_id`, `secret` y `auth_code` (hacerlo dentro de la hora).
4. Guardar en Vercel → **`TIKTOK_ACCESS_TOKEN`**.

**Atajo a probar primero:** TikTok Events Manager → el píxel → **Settings →
Generate Access Token**. Ese token está documentado para *enviar* eventos
(Events API); no está confirmado que sirva para *leer* estadísticas. Si se
prueba y no sirve, la tarjeta de TikTok del panel muestra el error → usar la
app de desarrollador.

Detalle técnico: el panel llama a
`GET https://business-api.tiktok.com/open_api/v1.3/pixel/event/stats/` con
cabecera `Access-Token`, `advertiser_id`, `pixel_ids=["DAQ48QRC77U77GG14PMG"]`
y `date_range` (máx. 30 días, fechas UTC). TikTok devuelve errores con HTTP 200:
lo que manda es `code` (0 = OK). Los eventos llegan como tipos de optimización
(`ON_WEB_…`), no como "Contact"/"SubmitForm"; el panel los traduce por
aproximación.

### Después de cargar variables

Vercel → **Deployments → Redeploy** (las variables no aplican hasta un nuevo
despliegue). Luego entrar a `/panel`: cada tarjeta muestra los conteos de su
plataforma o, si falla, el mensaje exacto de la API.

## Estado al cierre — 2026-09-23 (para retomar)

### Qué está hecho y en producción

| Pieza | Estado |
| --- | --- |
| Repo `HugoHerreraCoach/DLCconexigo` (público) | ✅ Último commit `c76eec5` en `main` |
| Hosting | ✅ Vercel conectado al repo: cada push a `main` se publica solo en `grupodlc.conexigo.com` |
| Píxel de Meta `24878647091813468` | ✅ Activo en producción (ver [0002](0002-pixeles-meta-tiktok.md)) |
| Píxel de TikTok `DAQ48QRC77U77GG14PMG` | ✅ Activo en producción |
| Registro propio (`/api/eventos`) | ✅ Desplegado; responde 204, pero **no guarda nada** hasta que exista `DATABASE_URL` |
| Panel `/panel` | ✅ Desplegado; muestra **"Panel sin activar"** porque falta `PANEL_PASSWORD` |
| Lectura de APIs Meta/TikTok | ⏸️ Código listo, sin probar contra las APIs reales (faltan tokens) |

**Importante:** hasta crear la base de datos, las visitas **no se están
registrando** en el panel (los píxeles sí siguen midiendo en Meta/TikTok). El
histórico del panel empieza el día en que se conecte la base (Supabase, desde
2026-09-24 en lugar de Neon — ver [0004](0004-base-de-datos-supabase.md)).

### Siguientes pasos, en orden

1. [ ] **Supabase:** crear el proyecto, copiar la URI del *Transaction pooler*
       (puerto 6543) y guardarla en Vercel como `DATABASE_URL` (pasos en
       [0004](0004-base-de-datos-supabase.md); la tabla `eventos` se crea sola
       en la primera visita).
2. [ ] **Vercel → Settings → Environment Variables → `PANEL_PASSWORD`** (la
       contraseña que se quiera para el panel).
3. [ ] **Redeploy** y comprobar: entrar a `/panel` con la contraseña, abrir la
       landing en otra pestaña y ver que la visita aparece.
4. [ ] **Meta:** crear usuario del sistema y token → `META_ACCESS_TOKEN` → redeploy
       → revisar la tarjeta "Píxel de Meta".
       **Avance 2026-09-24 (Meta):** token del usuario del sistema `panel-dlc`
       (app "Grupo DLLC", no caduca, `ads_read` + `business_management`) en
       `.env.local`. El píxel `24878647091813468` se llama "Finca campoora", su
       dueño es el negocio "DLC inmobiliaria" (653188150218507) y está asignado a
       `panel-dlc` con ADVERTISE/UPLOAD/ANALYZE/EDIT. Aun así `/{pixel}/stats`
       responde `(#100) Permission Denied` para los 3 píxeles de la cuenta
       (restricción de la app/endpoint, no de asignación). **Sí funciona**
       `act_1107857613612617/insights` (gasto, leads, clics) y `/campaigns`,
       `/adsets`. Hallazgo: las campañas de Finca Algarrobo son de formulario
       instantáneo (`ON_AD`) y WhatsApp; ninguna manda tráfico a la landing.
       Existe un píxel nuevo sin uso, "Pixel_DLC-CONEXIPEMA_FINCAALGARROBO"
       (1409214864656514, creado 2026-09-23, nunca disparó).
5. [ ] **TikTok:** anotar `TIKTOK_ADVERTISER_ID`; probar el atajo del Events
       Manager; si no sirve, crear la app de desarrollador (esperar aprobación)
       y canjear el `auth_code` → `TIKTOK_ACCESS_TOKEN` → redeploy.
       **Avance 2026-09-24:**
       - El píxel es propiedad del Business Center CONEXIPEMA SAC
         (7687346904935596048) y no estaba vinculado a ninguna cuenta
         publicitaria. Se vinculó a **ads dlc inmobiliaria** (7433480793986580496,
         acceso "Pixel ad delivery"); ya aparece en su Events Manager.
         `TIKTOK_ADVERTISER_ID=7433480793986580496` (en `.env.local`).
       - Atajo probado: el token de **Events API** del píxel se generó
         (`TIKTOK_EVENTS_API_TOKEN` en `.env.local`), pero para leer estadísticas
         responde `40001 advertiser does not grant you /pixel/event/stats/:GET
         permission`. Sirve solo para enviar eventos (futuro). **Falta la app de
         desarrollador** para el `TIKTOK_ACCESS_TOKEN` de lectura.
       - Aviso de Events Manager "faltan eventos del embudo" (View content, Add
         to cart, Initiate checkout, Purchase): es de e-commerce, no aplica a una
         landing de leads; se puede ignorar.
6. [ ] Si una tarjeta de plataforma muestra error: pasarle el mensaje a Claude
       para ajustar `src/server/plataformas.ts` (la forma de respuesta no se pudo
       verificar sin token).
7. [ ] **Anuncios:** agregar `?utm_campaign=<nombre>` (y opcional
       `utm_source=facebook|tiktok`) a la URL de destino de cada anuncio.
8. [ ] Prueba de punta a punta desde un celular sin bloqueador: entrar desde un
       anuncio o con `?utm_source=facebook&utm_campaign=prueba`, tocar un botón de
       WhatsApp y enviar el formulario → debe verse en `/panel` y en los
       administradores de Meta/TikTok.

### Ideas para después (no iniciadas)

- Gasto y **costo por lead** en el panel: Meta Ads Insights
  (`/act_<cuenta>/insights`, necesita el id de la cuenta publicitaria y el mismo
  token con `ads_read`) y reportes de TikTok.
- API de Conversiones (Meta) / Events API (TikTok) desde el servidor, para que
  los eventos lleguen aunque el visitante use bloqueador.
- Exportar a CSV desde el panel.

### Notas de trabajo

- `docs/` está en `.gitignore` por decisión del usuario: esta documentación
  vive solo en local.
- Pruebas en navegador: con **Brave**. Su escudo bloquea los píxeles
  (`ERR_BLOCKED_BY_CLIENT`); es normal, no es un fallo del sitio. Para ver los
  píxeles en vivo, usar Chrome/Edge sin bloqueador o bajar el escudo en el sitio.
- Prueba local del panel sin base real: Postgres en memoria con PGlite
  (`pglite-server --db=memory:// --port=5433 --max-connections=5`), luego
  `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable`
  y `PANEL_PASSWORD=<cualquiera>` con `pnpm build && pnpm start`.
