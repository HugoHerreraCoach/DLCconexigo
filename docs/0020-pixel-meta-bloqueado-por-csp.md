# 0020 — El píxel de Meta tenía bloqueado su envío por formulario (CSP `form-action`)

**Fecha:** 2026-10-19 · **Rama:** `Jheferson`

## Qué se pidió

> «Revisa porque estoy probando y los pixel de meta no están registrando los eventos»

## Qué se encontró

### El píxel sí recibe datos

Consultas de solo lectura a la API de Meta sobre el píxel `Pixel_DLC-CONEXIPEMA_FINCAALGARROBO`
(`1409214864656514`), el 2026-10-19:

- Activo. Último evento recibido el 2026-10-19 a las 09:46 (hora de Lima). Ese dato tarda horas en
  actualizarse: una visita de prueba hecha a las 12:25 todavía no figuraba.
- En los últimos 7 días llegaron `PageView` todos los días, y todos desde `grupodlc.conexigo.com`.
  No llegó nada desde `localhost` ni desde una URL de vista previa de Vercel.
- Cada evento llega dos veces: una del navegador y otra del «servidor». La del servidor no la envía
  la landing. La envía el propio `fbevents.js` a `mpc2-prod-…run.app/events` (configuración
  automática de Meta) con el mismo `event_id`, así que Meta las deduplica.
- `Lead` («Cliente potencial»): desde que el formulario guarda en la hoja (17-oct por la tarde), solo
  llegó uno, el 18-oct entre las 18:00 y las 19:00. Coincide con la fila de prueba «isa prueba» de la
  hoja (18-oct, 18:37). O sea, el flujo completo (fila confirmada → `Lead`) **funcionó en producción**.
- En la hoja «LEADS DLC_ FINCA ALGARROBO AUTOMATIZACIÓN - CRM» no hay ninguna fila de la landing del
  19-oct. La última modificación es de las 07:20 y corresponde a un lead del formulario instantáneo de
  TikTok. Si el 19-oct se probó el formulario, ningún envío llegó a guardarse, y sin fila no se envía
  `Lead` (es la regla de 0015/0018).

### Defecto: la CSP bloqueaba uno de los envíos del píxel

Al abrir la landing de producción en un Chrome limpio, sin bloqueadores, la consola mostraba:

```
Sending form data to 'https://www.facebook.com/tr/' violates the following Content Security Policy
directive: "form-action 'self'". The request has been blocked.
```

Así decide `fbevents.js` (versión 2.9.419, módulo `signalsFBEventsFireEvent`) cómo mandar cada
evento:

1. Si la URL del evento mide menos de 2048 caracteres, la manda como imagen GET. En los navegadores
   internos de Facebook e Instagram el límite sube a 32 KB.
2. Si no cabe y el navegador **no** es Chrome (Safari, Firefox…), usa `sendBeacon`.
3. Si no cabe y el navegador **es Chrome**, usa un **formulario oculto** (POST a `facebook.com/tr`
   dentro de un iframe).

Los `PageView` y `Lead` de la landing pasan de 2048 caracteres: el `PageView` medía unos 2.800 con
los datos automáticos de la página. Por eso, en Chrome de escritorio y en Chrome de Android fuera de
la app de Facebook/Instagram, caían en el caso 3. La cabecera `form-action 'self'` de
`next.config.ts`, que existe desde el proyecto inicial (2026-09-23), bloqueaba ese formulario.

Hoy el evento igual llega, pero solo porque Meta tiene activado para este píxel un reintento
(`shopify_sandbox_fetch_fallback`): si el formulario no confirma en **5 segundos**, lo reenvía por
`fetch` (en la petición se ve `rqm=fetch&ie[i]=1`). Esto tiene tres consecuencias:

- cada evento de Chrome llega con 5 s de retraso;
- si la persona cierra o recarga la página antes de esos 5 s, el evento se pierde (justo lo que pasa
  cuando se prueba rápido);
- si Meta desactiva ese reintento, Chrome deja de enviar eventos largos.

## Qué se hizo

`next.config.ts`: `form-action 'self'` → `form-action 'self' https://www.facebook.com`, con un
comentario que explica por qué. No cambia nada más. Los formularios propios siguen enviando por
`fetch` a `/api/formulario`, y el resto de la CSP queda igual.

## Archivos tocados

- `next.config.ts`
- `docs/0020-pixel-meta-bloqueado-por-csp.md` (este documento)
- `docs/README.md`

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (41 pruebas) y `pnpm build`: todo en verde.
- `next start` local con una base de datos inválida (`127.0.0.1:1`) y sin hoja, para no escribir
  nada en producción. La cabecera servida queda
  `form-action 'self' https://www.facebook.com`.
- En Chrome (contexto aislado, sin extensiones) se abrió la versión compilada: no aparece el error de
  CSP, y el `PageView` sale al instante como `rqm=formPOST` (iframe) a `https://www.facebook.com/tr/`
  con respuesta 200. Antes del cambio, en producción, salía como `rqm=fetch&ie[i]=1`, 5 s después.
- Esa prueba local envió **un `PageView` real** al píxel desde `localhost:3199` (sin `Lead`). La
  visita al `/api/eventos` local falló a propósito (500) porque la base apuntaba a una dirección
  inválida, y no se escribió nada.
- No se probó un `Lead` real. Habría agregado una fila a la hoja de producción y una conversión falsa
  al píxel. El camino del `Lead` usa el mismo mecanismo de envío que el `PageView`, y ya está probado
  en producción con «isa prueba» (18-oct).

## Cómo probar el píxel (para quien prueba)

- Solo el **formulario «Registrarme»** (el del inicio o el del chat flotante), con datos válidos y la
  fila ya guardada en la hoja, envía `Lead`. Los botones de WhatsApp y abrir el chat **no envían
  ningún evento** (0018). Al cargar la página se envía solo `PageView`.
- Para verlo al momento: Administrador de eventos → píxel → **«Probar eventos»**, abriendo la landing
  desde ahí, o con la extensión **Meta Pixel Helper**. La vista general y la API tardan de minutos a
  horas.
- Sin bloqueadores: Brave (escudos), uBlock, AdGuard, Firefox en modo estricto o Safari con
  protección avanzada bloquean `connect.facebook.net` y no se envía nada.
- Cada prueba deja una fila real en la hoja: conviene poner «prueba» en el nombre y borrarla después.

## Revisión del píxel de TikTok (mismo día)

> «Revisa si hay problema con el pixel de tiktok también»

El píxel de TikTok no tiene ningún defecto técnico, y no hizo falta cambiar código:

- `Pixel_DLC-CONEXIPEMA_FincaAlgarrobo` (`DAQ48QRC77U77GG14PMG`, id `7688841512808890386`) figura como
  **ACTIVE** en la cuenta «ads dlc inmobiliaria», que lo tiene compartido desde el BC.
- En Chrome limpio, sobre producción, carga `events.js` y envía `Pageview`, `LandingPageView` y
  `EngagedSession` a `analytics.tiktok.com/api/v2/pixel`, todos con respuesta 200 y sin errores en
  consola. TikTok envía por `fetch`/`sendBeacon`, no con formularios, así que la CSP de arriba no le
  afectaba.
- `SubmitForm` (lo que envía `clientePotencial()`) es un evento estándar. El grupo de anuncios de la
  campaña de landing optimiza justamente `FORM` sobre ese mismo píxel.
- **Por qué no hay conversiones de TikTok desde la landing:** la campaña
  `C_01_CONEXIPEMA_FINCAALGARROBO_LANDING` (`1877891583735969`) está **desactivada** desde el
  2026-10-16 a las 22:48. Gasto y clics: 0 el 17, el 18 y el 19 de octubre. Las demás campañas activas
  (`…FORM_MANUAL…`) usan el formulario instantáneo de TikTok y no pasan por la landing ni por el píxel.
- No se pudo leer el conteo por evento del píxel (`/pixel/event/stats/`): en `.env.local`,
  `TIKTOK_ACCESS_TOKEN` está vacío. El MCP de TikTok no tiene ese endpoint.
- Nota: el píxel tiene activada la **coincidencia avanzada automática** (nombre, teléfono, correo…).
  TikTok puede leer, cifrados, los campos del formulario aunque `clientePotencial()` no le pase datos
  personales. Meta tiene una opción equivalente. Es una decisión de configuración, no un fallo.

Para probar TikTok: Administrador de eventos de TikTok → píxel → «Probar eventos», o la extensión
TikTok Pixel Helper.

## Pendientes

- **Publicar el cambio.** Hasta que esté en producción, Chrome sigue con el retraso de 5 s y el
  riesgo de perder eventos.
- Después de publicar: abrir la landing en Chrome y confirmar en «Probar eventos» o en Pixel Helper
  que `PageView` llega sin el error de CSP en la consola. Después, enviar un registro de prueba y
  confirmar el `Lead`.
