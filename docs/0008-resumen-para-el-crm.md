# 0008 — Resumen firmado para el reporte de atribución del CRM

**Fecha:** 2026-09-26

## Contexto

- **Prueba real superada (Fase 3 de [0007](0007-mensajes-recibidos-whatsapp.md))**:
  el usuario envió un WhatsApp desde la landing con primera línea `L-6`
  (formulario). El CRM lo recibió a las 10:30:16 (Lima), lo encoló, consultó a la
  landing y a las 10:31:01 guardó la atribución en el lead 56284 ("Formulario de
  solicitud de información de terreno", fuente directo). La landing marcó `L-6`
  como recibido. Antes se dio de alta DLC en producción del CRM
  (`scripts/configurar-landing-atribucion.mjs alta --prefijo L`, empresa
  `8fc42ab6-9519-433b-a223-1c2e2d9ec5fb`) y se verificó el receptor con firma
  real (200) y falsa (401), y un clic de prueba (`L-5`, borrado después).
- Siguiente paso pedido: que **ConexiGO** tenga pantalla para asociar landings
  y un **reporte** de atribución. El CRM solo ve los mensajes que llegan; los
  **clics** solo los conoce la landing. Por eso la landing expone un resumen.

## Qué se hizo

`POST /api/whatsapp/resumen` (`src/app/api/whatsapp/resumen/route.ts`):
clics, formularios, visitas y mensajes recibidos por **fuente**, **campaña** y
**elemento** (nombre del catálogo de rastros), para un rango de días en hora de
Lima. Contrato completo en la cabecera del archivo:

- Firma igual que `/api/whatsapp/recibido`: `X-Conexigo-Firma: sha256=<HMAC del cuerpo crudo>`
  con `CONEXIGO_WEBHOOK_SECRET`. La verificación se movió a
  `src/server/firma-conexigo.ts` y la usan las dos rutas.
- Cuerpo `{ "desde": "YYYY-MM-DD", "hasta": "YYYY-MM-DD", "ts": <segundos Unix> }`;
  `ts` con tolerancia de 5 min (evita repetir llamadas viejas); rango máx. 366 días.
- Solo lectura y datos agregados (sin teléfonos ni nombres).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/server/firma-conexigo.ts` | **Nuevo.** `firmaValida()` compartida |
| `src/app/api/whatsapp/recibido/route.ts` | Usa la firma compartida (sin cambio de comportamiento) |
| `src/app/api/whatsapp/resumen/route.ts` | **Nuevo.** Resumen firmado |

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm build` (ruta `/api/whatsapp/resumen`).
- PGlite local + build de producción: 2 visitas, 3 clics (flotante, menú,
  formulario), aviso de recibido del formulario → resumen: totales
  `visitas 2 · clics 3 · formularios 1 · recibidos 1`, por fuente/campaña/origen
  correctos con nombres del catálogo. Firma falsa → 401; `ts` de hace 1 h → 401;
  rango > 366 días → 400; día sin datos → ceros.

## Añadido: datos del panel para Marketing → Pixel del CRM

`POST /api/conexigo/panel` (`src/app/api/conexigo/panel/route.ts`, commit
`dfcb3da`): devuelve exactamente lo que ve `/panel` — `metricas`
(ResultadoMetricas), `meta` (campañas), `tiktok`, `rastros` (catálogo) y
`sitio` — para `dias` 1/7/30/90, con la misma firma y `ts` (5 min). El usuario
pidió ver este mismo panel dentro de ConexiGO en el menú lateral, sección
Marketing → «Pixel»; esa vista se construye en el CRM (rama `jefferson`) y la
consume con la landing ya registrada en `atribucion_landings` (URL derivada de
`…/api/whatsapp/recibido` → `…/api/conexigo/panel`).

## Publicado

- Subido a producción el 2026-09-26 (`b7f2881..dfcb3da`, incluye `1094848` y `dfcb3da`).
- Verificado en producción con firma real: `/api/conexigo/panel` 200 (métricas
  ok, 2 campañas de Meta, TikTok sin configurar, 17 rastros); `/api/whatsapp/resumen`
  200; sin firma → 401; `dias: 5` → 400.

## Pendientes

- ~~Subir a producción~~ (hecho).
- En el CRM (otra sesión, rama `jefferson`): pantalla de landings, reporte que
  consuma este resumen y etiqueta de fuente en la lista real de leads.
