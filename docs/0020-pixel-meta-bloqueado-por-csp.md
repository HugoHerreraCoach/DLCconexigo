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

- la copia del navegador de cada evento de Chrome llega con 5 s de retraso;
- si la persona cierra o recarga la página antes de esos 5 s, se pierde la copia del navegador (justo
  lo que pasa cuando se prueba rápido). La copia automática del «servidor» (`mpc2-prod-…run.app`, ver
  arriba) sale al instante y no depende del formulario, así que Meta igual recibe el evento por esa
  vía mientras esa configuración automática siga activa (corregido en la verificación de la tarde);
- si Meta desactiva ese reintento, la copia del navegador deja de llegar para los eventos largos.

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
- En «Probar eventos» también aparecen `SubscribedButtonClick` al pulsar las opciones y
  «Registrarme». Los envía la detección automática de eventos de Meta, no la landing. No son
  conversiones.

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
  *(Corregido esa noche: hay una segunda campaña de landing, activa y sin entregas. Ver «Registros de
  TikTok que no llegan a la hoja».)*
- No se pudo leer el conteo por evento del píxel (`/pixel/event/stats/`): en `.env.local`,
  `TIKTOK_ACCESS_TOKEN` está vacío. El MCP de TikTok no tiene ese endpoint.
- Nota: el píxel tiene activada la **coincidencia avanzada automática** (nombre, teléfono, correo…).
  TikTok puede leer, cifrados, los campos del formulario aunque `clientePotencial()` no le pase datos
  personales. Meta tiene una opción equivalente. Es una decisión de configuración, no un fallo.

Para probar TikTok: Administrador de eventos de TikTok → píxel → «Probar eventos», o la extensión
TikTok Pixel Helper.

## Verificación en producción (2026-10-19, tarde)

> «Revisa si es que está en producción ya los cambios, y verifica que ambos pixel registren
> correctamente los eventos»

### ¿Está publicado? No

- `main` (`1035939`, Hugo) **no** incluye `c626dcd`. Solo `origin/Jheferson` lo tiene.
- Vercel (estados del commit en GitHub): producción corre `1035939`, publicado el 17-oct a las 19:42
  (Lima). `c626dcd` solo tiene una vista previa (`dl-cconexigo-54d1edvhj-hugoherrerateam.vercel.app`),
  protegida con inicio de sesión de Vercel, así que no se pudo abrir desde aquí.
- `grupodlc.conexigo.com` sigue sirviendo `form-action 'self'`, y en Chrome se repite el error de
  CSP en la consola.

### Píxeles en producción (Chrome aislado, sin extensiones)

- **Meta `PageView`:** llega (200), pero por el reintento (`rqm=fetch&ie[i]=1`), unos 5 s después del
  intento bloqueado. `fbevents.js` ya va en la versión 2.9.423, con el mismo comportamiento.
- **TikTok:** `Pageview`, `LandingPageView` y `EngagedSession` al píxel `DAQ48QRC77U77GG14PMG`, todos
  con 200.
- **«Cliente potencial», con la hoja simulada** (elegido por el usuario, para no dejar filas): se
  interceptó `/api/formulario` en el navegador y se respondió `ok` sin llegar al servidor. Después se
  envió el formulario del inicio con «Prueba Claude simulada». Resultado, con el id
  `37388121-3e4d-4129-9d00-2e543288a493` en los tres envíos:
  - Meta `Lead` del navegador, con `inicial`, `compra`, `origen` y `rastro`: 200, por el reintento,
    5 s después.
  - Copia automática del servidor de Meta (`mpc2-prod-…run.app/events`, `event_name: Lead`): 200, al
    instante.
  - TikTok: 200, al instante. El código llama a `ttq.track("SubmitForm")`, pero `pixel.js` 2.2.1 lo
    envía con el nombre **`Lead`**: TikTok renombró ese evento estándar. En la configuración del
    píxel, el único evento de formulario es `FORM`, el mismo que optimiza el grupo de anuncios. No hace
    falta cambiar el código, pero quien prueba en TikTok debe buscar `Lead`, no `SubmitForm`.
- Ese envío deja **una conversión de prueba** en cada píxel (Meta y TikTok), y ninguna fila en la hoja.
- Hoy (19-oct) el píxel de Meta recibió solo `PageView` y ningún `Lead`, hasta donde llegan las
  estadísticas de la API (la franja de 12:00 a 13:00 de Lima; van unas 3 horas atrasadas). La hoja (pestañas «LEADS TIKTOK» y «LEADS META»,
  las dos existen) no recibió ninguna fila de la landing hoy. La última es de las 07:20 y corresponde
  al formulario instantáneo de TikTok. Las pruebas de hoy no llegaron a guardar un registro, y sin
  registro no hay `Lead`.
- Coincidencia avanzada automática de TikTok: tomó el celular del formulario (cifrado) y lo marcó
  como de país inválido porque va sin `+51`. Solo afecta la calidad de la coincidencia, no el conteo.

## Registros de TikTok que no llegan a la hoja (2026-10-19, noche)

> «Verifica, porque los que se registran que siguen el camino por tiktok no están llegando al google
> sheets»

Todo se revisó en modo de solo lectura (API de TikTok, hoja por Drive, pruebas locales). No se cambió
nada.

- **Formulario instantáneo de TikTok → hoja: funciona.** La campaña
  `TIKTOK_NVNRO.FORM_CONEXIPEMA_FINCAALGARROBO_FORM_MANUALDLC` (`1879339308336129`) reporta 9 leads el
  18-oct y 1 el 19-oct. Son exactamente las 10 filas con ese nombre en «LEADS TIKTOK» (la última,
  de las 07:20 del 19-oct).
- **Anuncio de TikTok → landing → hoja: no llega nadie.** La campaña de landing actual es
  `TIKTOK_LANDING_NVNRO_CONEXIPEMA_FINCAALGARROBO` (`1879339605026322`, Smart+, creada el 17-oct a las
  20:04 de Lima). Está activa, con presupuesto de S/ 72 al día, estado «en entrega» y 8 anuncios
  aprobados. Desde que se creó lleva **0 impresiones, 0 clics y S/ 0 de gasto**.
  - Los anuncios llevan bien el enlace
    (`https://grupodlc.conexigo.com/?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_id=__CAMPAIGN_ID__`),
    el píxel `7688841512808890386` y la optimización `FORM`.
  - **Causa:** el grupo de anuncios `Cnvnro_01_CONEXIPEMA_FINCAALGARROBO_LANDING_LAMB-CAJ_18+`
    (`1879339605026338`) tiene la programación horaria (`dayparting`, 336 medias horas de lunes a
    domingo) con un solo `1`: solo puede salir los **sábados de 20:30 a 21:00** (hora de la cuenta,
    UTC-5, la de Lima). El grupo del formulario instantáneo tiene las 336 en `1`. El único turno desde
    la creación fue el sábado 17-oct a las 20:30, apenas 15 minutos después de crear los anuncios, y
    no entregó.
- **El código de la landing para TikTok funciona:** con `utm_source=tiktok` la visita queda con
  fuente `tiktok`, y `/api/formulario` escribe en «LEADS TIKTOK» (`configHoja`). Lo cubren
  `test/formulario.spec.ts` (21 pruebas en verde) y la fila «isa prueba» del 18-oct, que cayó en esa
  misma pestaña.
- No se pudo ver si en Vercel está puesta `GOOGLE_SHEETS_HOJA`. Si lo está, manda todo a esa pestaña y
  anula la separación META/TIKTOK. Para TikTok no cambia nada, porque «LEADS TIKTOK» es también la
  pestaña por defecto.

Arreglo (en el Administrador de anuncios de TikTok, le corresponde a quien maneja la cuenta): en el
grupo de anuncios de la landing, cambiar la programación a «Todo el día». Al hacerlo, la campaña
empieza a gastar su presupuesto de S/ 72 al día.

Seguimiento:

- 16:17 (Lima): el usuario cambió la programación a «Todo el día». La API lo confirma: las 336
  medias horas en `1`, y el grupo sigue «en entrega».
- 16:34: llegó la fila de prueba «Hola prueba» a «LEADS TIKTOK», con
  `TIKTOK_LANDING_NVNRO_CONEXIPEMA_FINCAALGARROBO` en la columna A, FUENTE `tiktok` y ORIGEN «Landing ·
  Formulario de solicitud de información de terreno». El camino enlace de TikTok → landing → hoja
  funciona. Es una fila de prueba: hay que borrarla.
- 16:35: la campaña todavía no tiene impresiones (el reporte de TikTok tarda y la entrega recién
  empieza). Falta ver la primera fila de un clic real a un anuncio.
- 17:04: la campaña ya entrega (1 impresión en la franja de 16:00, sin clics ni gasto). En la hoja
  entraron 2 filas nuevas del formulario instantáneo (16:46 y 16:58), ninguna de la landing todavía.
  «Hola prueba» sigue en la hoja.

## Verificación con tráfico real (2026-10-20, 11:00)

> «Verifica que los eventos estén registrándose correctamente»

Solo lectura: API de Meta (estadísticas del píxel), API de TikTok (reportes), hoja por Drive.

- **Producción sigue sin el arreglo de la CSP:** sirve `1035939` y `form-action 'self'`.
- **Campaña de landing de TikTok, ya entregando:** el 19-oct 228 clics, 143 vistas de la landing y
  S/ 71.47; el 20-oct (hasta las 11:00) 53 clics y S/ 20.47. TikTok le atribuye 1 conversión
  (`FORM`) cada día.
- **Filas de la landing desde el cambio de horario** (todas en «LEADS TIKTOK», FUENTE `tiktok`,
  campaña en la columna A):

  | Fila | Hora (Lima) | `Lead` en Meta |
  | --- | --- | --- |
  | «Hola prueba» (celular …093 792) | 19-oct 16:34 | No |
  | «Anthony Diaz» (celular …093 792) | 19-oct 20:40 | Uno de los dos |
  | «Jck Diaz santa cruz» (chat flotante) | 19-oct 20:43 | Uno de los dos |
  | «Yuri Gutierrez» | 20-oct 00:03 | Sí |

  Meta recibió un solo `Lead` entre las 20:00 y las 21:00, y otro a las 00:00. Cada uno llegó por el
  navegador y por la copia del servidor. TikTok atribuye una conversión el 19 y otra el 20: coincide
  con Meta.
- Las dos filas que no llegaron a ningún píxel serían las del celular …093 792. «Hola prueba» fue la
  prueba del usuario con el enlace de ejemplo, y «Anthony Diaz» usa el mismo celular. Lo más probable
  es que se hicieran en un navegador que bloquea los píxeles (los escudos de Brave lo hacen por
  defecto). Falta que el usuario lo confirme. Si «Anthony Diaz» fue una prueba, todos los registros
  reales llegaron a la hoja y a los dos píxeles.
- **`PageView` de Meta: se pierde parte de la copia del navegador.** El 19-oct, de 18:00 a 22:59 (las
  horas con tráfico de TikTok), la copia del navegador sumó 316 y la del servidor 381: faltan 65
  copias (17 %). Es el efecto del bloqueo de la CSP: la copia del navegador sale 5 s tarde y se pierde
  si la persona se va antes. La copia del servidor sí llega, así que Meta cuenta la visita igual. El
  20-oct la diferencia es menor (66 contra 70). Se corrige al publicar `c626dcd`.
- Todos los eventos de Meta vienen de `grupodlc.conexigo.com`. Los 2 de `localhost` del 19-oct, a las
  12:00, son la prueba local de este documento.
- No verificado todavía: un registro que llegue desde Meta (`fbclid` o `utm_source=facebook`) debe ir
  a «LEADS META». No hubo ninguno, y no se puede ver si Vercel tiene `GOOGLE_SHEETS_HOJA`, que
  anularía esa separación.

## Pendientes

- **TikTok:** quitar la restricción horaria del grupo de anuncios de la landing (hecho el 19-oct a
  las 16:17).
- **Publicar el cambio** (le corresponde al dueño: llevar `c626dcd` a `main` o promover la vista
  previa). Hasta entonces, la copia del navegador de los eventos largos de Meta llega 5 s tarde en
  Chrome y se pierde si se cierra la página antes.
- Después de publicar: abrir la landing en Chrome y confirmar en «Probar eventos» o en Pixel Helper
  que `PageView` llega sin el error de CSP en la consola. Después, enviar un registro de prueba y
  confirmar el `Lead`.
