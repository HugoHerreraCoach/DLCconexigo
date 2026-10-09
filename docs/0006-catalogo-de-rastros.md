# 0006 — Catálogo de rastros: cada botón y formulario con nombre en el panel

**Fecha:** 2026-09-24

## Qué se hizo

Cada elemento de la landing que genera un rastro (botones/enlaces de WhatsApp
y el formulario) tiene ahora un **id estable y un nombre legible**, definidos en
un único catálogo: **`src/config/rastros.ts`**. El panel muestra esos nombres.
Ejemplo: el formulario del hero se llama **"Formulario de solicitud de
información de terreno"**.

**La guía para dar de alta un elemento nuevo vive en el código**, en el
comentario de cabecera de `src/config/rastros.ts` (pedido del usuario: que
cualquiera que cree algo que deje rastro lo vea en el panel sin buscar docs).

## Por qué

Antes, el botón se identificaba por el **texto del mensaje** de WhatsApp
(`origenDeEnlace`): los botones que compartían mensaje no se distinguían
("Agenda tu visita" del menú, del menú del celular y de "El proyecto" salían
como uno solo) y el formulario no guardaba ningún nombre.

## Cómo funciona

1. `RASTROS` (catálogo): `id → { nombre, tipo: "contacto" | "lead", seccion }`.
2. Enlaces de WhatsApp: `<a {...marcaRastro("id")}>` pone `data-rastro="id"`.
   El oyente global de `src/shared/ui/Pixeles.tsx` lo lee al hacer clic. En
   listas de datos se guarda con `idRastro("id")` y se marca al renderizar.
3. Formularios: `rastrearLead("id", datos)`.
4. `rastrearContacto`/`rastrearLead` mandan el id al registro propio y el
   **nombre** a Meta (`rastro`, `origen` en Contact/Lead) y TikTok (`description`).
5. La API (`/api/eventos`) solo guarda ids del catálogo; cualquier otro valor se
   guarda como `sin-identificar`. Las visitas guardan `origen = null`.
6. El panel traduce id → nombre con el mismo catálogo.

Salvaguardas:
- **TypeScript** marca error si un componente usa un id que no está en el catálogo.
- Un enlace de WhatsApp **sin marca** se registra como "Enlace de WhatsApp sin
  identificar" y el panel lo resalta en ámbar: señal de que falta darlo de alta.
- El id no se debe cambiar (el histórico se agrupa por id); el nombre sí.

## Catálogo inicial (16 entradas)

| id | Nombre | Tipo |
| --- | --- | --- |
| `formulario-hero` | Formulario de solicitud de información de terreno | lead |
| `header-agendar-visita` | Botón «Agenda tu visita» del menú | contacto |
| `menu-movil-agendar-visita` | Botón «Agenda tu visita» del menú del celular | contacto |
| `proyecto-agendar-visita` | Botón «Agenda tu visita» de El proyecto | contacto |
| `proyecto-pedir-ficha` | Botón «Pide la ficha» | contacto |
| `financiamiento-plan-cuotas` | Enlace «Consultar mi plan de cuotas» | contacto |
| `legal-documentacion` | Enlace «Consultar la documentación» | contacto |
| `contacto-whatsapp` | Tarjeta «Escríbenos por WhatsApp» | contacto |
| `contacto-video-recorrido` | Tarjeta «Pide el video recorrido» | contacto |
| `footer-financiamiento` / `footer-ficha` / `footer-video` / `footer-documentacion` / `footer-whatsapp` | Enlaces del pie de página | contacto |
| `whatsapp-flotante` | Botón flotante de WhatsApp | contacto |
| `sin-identificar` | (reservado) Enlace de WhatsApp sin identificar | contacto |

## Cambios en el panel

- "Botón de WhatsApp más usado" → **"¿Qué generó cada contacto?"**: todos los
  elementos con actividad (WhatsApp y formularios), con nombre, tipo, sección y
  total.
- "Últimos formularios": nueva columna **Formulario** (nombre del formulario).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/config/rastros.ts` | **Nuevo.** Catálogo + guía + `marcaRastro`, `idRastro`, `esRastro`, tipos `IdRastro`/`IdMarcable` |
| `src/shared/lib/pixeles.ts` | `rastrearLead(id, datos)`, `rastrearContacto(id)` con nombre a Meta/TikTok; se elimina `origenDeEnlace` |
| `src/shared/ui/Pixeles.tsx` | El oyente lee `data-rastro` (o `sin-identificar`) |
| `src/views/home/components/*` | FormularioContacto, Header, Proyecto, PorQueDLC, Contacto, Footer, WhatsAppFlotante: marcas en los 14 enlaces + id del formulario |
| `src/app/api/eventos/route.ts` | `origen` validado contra el catálogo |
| `src/server/metricas.ts` | `origenes` agrupa contactos **y** leads por id; `leads` trae `origen` |
| `src/views/panel/PanelView.tsx` | Nombres desde el catálogo (`nombreRastro`), sección renombrada, columna Formulario |

Sin cambios de esquema en la base (se usa la columna `origen` que ya existía).
Commit: `d6f2e26` (local).

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm build` sin errores.
- Prueba en Brave contra un **Postgres local en memoria** (PGlite; no se tocó el
  Supabase real), landing con `?utm_source=facebook&utm_campaign=prueba-rastros`:
  - Los 11 enlaces wa.me visibles tienen `data-rastro`; clic en cada uno →
    11 filas con su id. Pestaña "Financiamiento" → `financiamiento-plan-cuotas`.
  - Enlace wa.me inyectado sin marca → `sin-identificar`.
  - Formulario enviado → `lead` con `origen = formulario-hero` y sus datos.
  - `POST /api/eventos` con `origen: "id-inventado"` → se guarda `sin-identificar`.
  - Panel: "¿Qué generó cada contacto?" lista los 14 nombres con tipo y sección;
    "sin identificar" en ámbar; "Últimos formularios" muestra el nombre del
    formulario.
- Nota de la prueba: el primer lote falló con `ECONNREFUSED` porque la base de
  prueba aún arrancaba; se repitió con la base lista.
- No probado en navegador: `menu-movil-agendar-visita` y `legal-documentacion`
  (no visibles sin abrir el menú móvil / otra pestaña); tipados y marcados igual.

## Pendientes

- ~~Subir a producción~~ — subido el 2026-09-25 junto con [0005](0005-campanas-meta-en-panel.md)
  (`341f5e6..d6f2e26`). Falta que el usuario cargue en Vercel `DATABASE_URL`,
  `PANEL_PASSWORD` y `META_ACCESS_TOKEN` y haga redeploy.
- Si se añaden formularios o botones nuevos: seguir la guía de `src/config/rastros.ts`.
