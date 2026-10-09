# 0007 — Mensajes de WhatsApp realmente recibidos (Fase 1: landing)

**Fecha:** 2026-09-25 · Commit `7bf1c41` (local)

> **Cambio 2026-09-25 (misma fecha): el formato de la referencia pasó de
> "Ref: FA-7K3QX" al final a un número correlativo en la PRIMERA LÍNEA:
> `L-1`, `L-2`, `L-3`…** Ver la sección "Formato definitivo: L-N en la primera
> línea" al final; lo anterior sobre `FA-XXXXX` describe la primera versión.

## Objetivo

Hasta ahora el panel contaba **intenciones** (clic a WhatsApp, formulario
enviado), pero no si el mensaje **llegó de verdad**: al abrirse WhatsApp la
persona puede no enviarlo. Objetivo: saber cuántos mensajes llegan y de qué
campaña, fuente, formulario o botón vienen, y que el **asesor lo vea en el CRM**.

## Diseño (3 fases)

```
① Landing: clic → código "Ref: FA-7K3QX" en el mensaje → se guarda con campaña/fuente/botón
② El cliente envía → el mensaje llega al CRM ConexiGO (WhatsApp Cloud API, coexistencia)
③ ConexiGO detecta el código → POST firmado a la landing → la landing lo marca recibido
   y le devuelve la atribución → el CRM la guarda en el lead (el asesor la ve)
```

- **Fase 1 (este documento, landing):** código por clic, guardado, receptor del
  aviso y "Mensajes recibidos" en el panel. ✅
- **Fase 2 (CRM `D:\Conexipema\conexigo`, rama `jefferson`):** detectar el código
  en cada mensaje entrante de WhatsApp, llamar a la landing y mostrar la
  atribución en la ficha del lead.
- **Fase 3:** prueba real con el número de DLC.

Hallazgos del CRM (para la Fase 2): recibe WhatsApp por la **Cloud API oficial
de Meta** en modo **coexistencia**; punto de enganche natural justo después de
`ingresarMensaje` en `apps/api/src/modules/business/ventas/integraciones/integraciones.service.ts`
(~L5008); los leads no tienen hoy columnas de atribución; no hay webhooks de
salida (hay que crearlos).

## Fase 1 — qué se hizo

### Código de referencia
- `src/shared/lib/whatsapp.ts`: `nuevaReferencia()` → `FA-` + 5 caracteres de
  `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (sin 0/O/1/I/L para que no se confundan);
  `conReferencia(mensaje, codigo)` añade `\n\nRef: FA-XXXXX`;
  `PATRON_REFERENCIA` = `/^[A-Z]{2,4}-[2-9A-HJKMNP-Z]{5}$/` (el prefijo admite
  2–4 letras para futuras landings).
- Botones/enlaces: el oyente de `src/shared/ui/Pixeles.tsx` (fase de captura)
  reescribe el `href` **antes** de que se abra WhatsApp con un código nuevo por
  clic; guarda el enlace original en `data-base` para no acumular referencias.
- Formulario: `FormularioContacto.tsx` añade la referencia al mensaje.
- `rastrearContacto(id, codigo)` / `rastrearLead(id, codigo, datos)` →
  `registrar(..., { codigo })`.

### Base de datos (`eventos`)
- Columnas nuevas `codigo text` (índice único parcial) y `recibido_en timestamptz`,
  añadidas por `asegurarEsquema` con `ADD COLUMN IF NOT EXISTS` (la tabla de
  producción las recibe sola en el primer evento tras el despliegue).
- `/api/eventos` valida `codigo` con el patrón; `ON CONFLICT DO NOTHING` si se
  repitiera.

### Receptor del aviso: `POST /api/whatsapp/recibido`
Contrato completo en la cabecera de `src/app/api/whatsapp/recibido/route.ts`:
- Cabecera `X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo>` con
  el secreto `CONEXIGO_WEBHOOK_SECRET` (comparación en tiempo constante).
- Cuerpo `{ "codigo": "FA-7K3QX", "recibido_en": "<ISO>" }`.
- Respuesta `{ ok, encontrado, atribucion: { tipo, origen, origen_nombre,
  fuente, campana, clic_en } }` → el CRM guarda esto en el lead.
- Idempotente (conserva la primera hora). 400 inválido · 401 firma · 503 sin
  secreto/base.

### Panel
- Nueva cifra **"Mensajes recibidos"** con "% de clics y formularios que
  llegaron a WhatsApp".
- Columna **Recibidos** en "¿De dónde vienen?" y "Campañas"; "¿Qué generó cada
  contacto?" muestra "· N recibidos" por elemento.

### Variables
- **`CONEXIGO_WEBHOOK_SECRET`** (nueva): generada (32 bytes hex) y guardada en
  `.env.local`. Debe ir **igual** en Vercel (landing) y en el CRM.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/whatsapp.ts` | `nuevaReferencia`, `conReferencia`, `PATRON_REFERENCIA` |
| `src/shared/lib/registro.ts` | `registrar` acepta `codigo` |
| `src/shared/lib/pixeles.ts` | `rastrearContacto(id, codigo)`, `rastrearLead(id, codigo, datos)` |
| `src/shared/ui/Pixeles.tsx` | Reescribe el enlace con la referencia en cada clic |
| `src/views/home/components/FormularioContacto.tsx` | Referencia en el mensaje del formulario |
| `src/server/db.ts` | Columnas `codigo`, `recibido_en` + índice único |
| `src/app/api/eventos/route.ts` | Guarda `codigo` validado |
| `src/app/api/whatsapp/recibido/route.ts` | **Nuevo.** Receptor firmado del CRM |
| `src/server/metricas.ts` | `recibidos` en totales, fuentes, campañas y elementos |
| `src/views/panel/PanelView.tsx` | Cifra y columnas de recibidos |

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm build` sin errores (ruta `/api/whatsapp/recibido` generada).
- Prueba con Postgres local en memoria (PGlite; no se tocó Supabase) y build de producción, en Brave:
  - Dos clics en el botón flotante → `...Finca Algarrobo.\n\nRef: FA-UF5GT` y
    luego `...\n\nRef: FA-SXX8A` (código nuevo, sin acumular); guardados con su código.
  - Formulario → mensaje termina en `Ref: FA-EDG6J`; evento `lead` con ese código.
  - Aviso firmado simulado del CRM: 200 con atribución completa (formulario,
    fuente meta, campaña `prueba-ref`); repetido → misma respuesta y se conserva
    la primera hora; firma incorrecta → 401; código ajeno → `encontrado:false`;
    código inválido → 400.
  - Panel: "Mensajes recibidos 1 · 33.3% de clics y formularios llegaron a WhatsApp".
- No probado aún: la migración de columnas sobre la tabla real de Supabase
  (ocurre sola al primer evento tras desplegar; es `ADD COLUMN IF NOT EXISTS`).

## Formato definitivo: `L-N` en la primera línea (pedido del usuario)

Mensaje que llega:
```
L-27
Hola Grupo DLC, quiero información sobre Finca Algarrobo.
```

- El número es **correlativo** y lo asigna el **servidor**: `/api/eventos` con
  `reservar: true` inserta el clic y guarda `codigo = 'L-' || nextval('eventos_referencia_seq')`
  (secuencia creada por `asegurarEsquema`), y responde `{ "codigo": "L-27" }`.
  Las visitas y los bots no consumen números.
- `abrirWhatsApp(enlace, pedirCodigo)` (`src/shared/lib/whatsapp.ts`), usado por
  el oyente de clics (`Pixeles.tsx`) y por el formulario:
  - Escritorio: abre la pestaña **dentro del clic** (`window.open("")`, para
    que el bloqueador de ventanas no la frene) y le pone la dirección cuando
    llega el número.
  - Celular: navega directo a wa.me (abre la app).
  - Si el servidor no responde en **2,5 s** o falla, WhatsApp se abre igual,
    **sin número** (se pierde solo la atribución de ese mensaje).
- Los números se consumen al hacer clic: un número que nunca llega al CRM es un
  clic cuyo mensaje no se envió (justo lo que mide el panel).
- `PATRON_REFERENCIA` = `/^L-[1-9]\d{0,9}$/`; `/api/whatsapp/recibido` pone el
  código en mayúsculas antes de validar (acepta `l-2`).
- El CRM detecta el código **solo si es la primera línea** del mensaje (ver su
  ficha `docs/sistema/de-que-anuncio-viene-un-lead.md`, prefijo `L` para DLC).

Verificado (Postgres local PGlite + build de producción, Brave):
- 3 clics (flotante, menú, flotante) → `L-1`, `L-2`, `L-3` en la primera línea;
  la landing no navega.
- Formulario → `L-4` en la primera línea, evento `lead` con ese código.
- Aviso firmado `L-4` → atribución del formulario; `l-2` (minúscula) →
  atribución del botón del menú; `L-99` → `encontrado:false`; `FA-7K3QX` → 400.
- Base apagada → WhatsApp se abre en 0,2 s sin número.
- Límite: la ruta de celular (navegar directo) no se probó en un teléfono real.

## Pendientes

- Fase 2 en el CRM (rama `jefferson`), ajustada al formato `L-N`: **hecha y
  subida** a `origin/jefferson` (`004d1685d..fc012da24`, 2026-09-25). Commits
  `e12108f81`, `dd4f6e348`, `c200ebe52`, `6172fb1a8`, `5971844f2`, `fc012da24`.
  Sin aplicar en producción: falta unir a la rama de publicación, aplicar la
  migración `20260925160000`, publicar API y web, y dar de alta DLC con
  `scripts/configurar-landing-atribucion.mjs alta --prefijo L --endpoint https://grupodlc.conexigo.com/api/whatsapp/recibido`
  y el mismo secreto que `CONEXIGO_WEBHOOK_SECRET`.
- Landing **subida a producción** el 2026-09-25 (`d6f2e26..64fda47`). Falta
  cargar `CONEXIGO_WEBHOOK_SECRET` en Vercel.
- Cargar `CONEXIGO_WEBHOOK_SECRET` en Vercel (landing) y en el CRM.
- Subir la landing a producción (commit local `7bf1c41`).
