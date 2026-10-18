# 0019 — Nombre de la campaña (Meta o TikTok) en la hoja de leads; ID REGISTRO en «TikTok Lead ID»

**Fecha:** 2026-10-17 · **Rama:** `Jheferson`

## Qué se pidió

> «Tengo campañas de tiktok y campañas de meta, varias de esas campañas van a la landing y algunos de
> esos que van a la landing llenan el formulario y esos registros llegan al google sheets; y que esos
> registros guarden en un campo(columna) el Nombre o ID de esa campaña de la cual vinieron Tiktok o Meta»

Luego, al revisar la hoja:

> «ya tengo las columnas NOMBRE DE CAMPAÑA FECHA NOMBRE NUMERO INICIAL TIEMPO DE COMPRA TikTok Lead ID
> TikTok Lead Status Lead creation time Lead update time; si te das cuenta ya tengo NOMBRE CAMPAÑA, creo que
> ya no es necesario agregar el campo […] y en cuanto al origen, fuente si lo voy a agregar, pero ID
> REGISTRO quiero que se guarde en TikTok Lead ID, por el nombre no te preocupes es tema más interno.»

## Cómo estaba

La columna A (que en la hoja se llama **«NOMBRE DE CAMPAÑA»**) recibía el `utm_campaign` de la visita (0015),
pero en la práctica:

- **Meta** sí manda la campaña: sus anuncios llevan a la landing con `utm_campaign` = **id** de la campaña.
  En los últimos 30 días, 3.710 de las 3.728 visitas de Meta lo traían (sobre todo `120253059641580494` =
  `C_04_CONEXIPEMA_FINCAALGARROBO_LANDING`). Solo llegaba el número, sin el nombre.
- **TikTok** no manda nada: las 8.327 visitas de TikTok del mismo período llegaron sin `utm_campaign`. Los
  anuncios de la campaña `C_01_CONEXIPEMA_FINCAALGARROBO_LANDING` apuntan a `https://grupodlc.conexigo.com/`
  sin parámetros, y TikTok solo agrega `ttclid`, que no dice de qué campaña viene.

(Consultas de solo lectura a la tabla `eventos` y a las APIs de Meta y TikTok, el 2026-10-17.)

## Qué se hizo

### Fila de la landing en la hoja

Se usan las columnas que la hoja ya tiene. La landing solo agrega **K y L**:

| Col. | Encabezado | Valor desde la landing |
| --- | --- | --- |
| A | NOMBRE DE CAMPAÑA | **Nombre de la campaña** de Meta o TikTok. Si no se pudo saber el nombre, su id; vacío si la visita no vino de un anuncio. |
| B | FECHA | Segundos Unix, como TikTok |
| C | NOMBRE | Nombre escrito |
| D | NUMERO | `+51 9XX XXX XXX` |
| E | INICIAL | Opción elegida |
| F | TIEMPO DE COMPRA | Opción elegida |
| G | TikTok Lead ID | **ID REGISTRO** de la landing: el id del envío, que también es el id del evento del píxel. Los ids de la landing tienen formato `xxxxxxxx-xxxx-…`; los de TikTok son números. |
| H | TikTok Lead Status | Vacío |
| I | Lead creation time | Segundos Unix (igual que FECHA) |
| J | Lead update time | Vacío |
| K | **ORIGEN** | «Landing · Formulario de solicitud de información de terreno» o «Landing · Chat flotante · formulario de registro» |
| L | **FUENTE** | `meta`, `tiktok`, `google`, `otro` o `directo` |

Ya no se escriben las columnas M «ID REGISTRO» (0017) ni N.

### De dónde sale el nombre de la campaña

La landing lee del enlace del anuncio `utm_campaign` y, ahora también, `utm_id`. Se guardan al entrar y se
mantienen toda la sesión, así que valen aunque la persona llene el formulario minutos después.

| Plataforma | Qué trae el enlace | Qué va en «NOMBRE DE CAMPAÑA» |
| --- | --- | --- |
| Meta (como está hoy) | `utm_campaign` = id | El nombre, que se pide a la API de Meta con `META_ACCESS_TOKEN` (el mismo token que ya usa el panel) |
| TikTok (con los parámetros de abajo) | `utm_campaign` = nombre, `utm_id` = id | `utm_campaign` |

- Un `utm_campaign` numérico (de 6 a 25 dígitos) se trata como id; uno de texto, como nombre. Un `utm_id` que no
  es numérico se descarta.
- **El nombre de Meta nunca frena ni rompe el registro.** La consulta corre mientras se revisa si el envío está
  repetido y tiene un límite de 2,5 s. Si no hay token, Meta no responde, el token venció o la campaña es de otra
  cuenta, la fila se escribe igual, con el id de la campaña. Cada nombre se guarda en memoria una hora, así que
  los siguientes registros de la misma campaña no vuelven a consultar a Meta. Los errores no se guardan.
- Solo se aceptan campañas de la cuenta de DLC (`act_1107857613612617`).
- `eventos.campana` (el panel) sigue guardando `utm_campaign` tal como llega. El panel cruza ese valor con el id
  de las campañas de Meta, así que no cambia. No hay cambios en la base de datos.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/registro.ts` | La atribución de la visita guarda también `campana_id` (`utm_id`). |
| `src/server/plataformas.ts` | `nombreCampanaMeta(id)`: nombre de una campaña de la cuenta de Meta, con caché de una hora y límite de 2,5 s. |
| `src/server/hoja-calculo.ts` | `COLUMNAS` = encabezados reales A–J + ORIGEN y FUENTE. El id del registro va en «TikTok Lead ID». `LeadHoja.campana` = nombre de la campaña (o su id). |
| `src/app/api/formulario/route.ts` | Acepta `campana_id`, decide el nombre o el id y pide el nombre a Meta cuando hace falta. |
| `src/shared/lib/pixeles.ts` | Comentario: el id del evento es el de «TikTok Lead ID». |
| `test/formulario.spec.ts` | 4 pruebas nuevas; las de columnas y de la fila, actualizadas. |

## Cómo se verificó

- `pnpm test`: **41/41** (4 nuevas). Comprueban:
  - columnas en el orden de la hoja; el id del registro en «TikTok Lead ID»; la landing solo agrega ORIGEN y FUENTE;
  - Meta: con el id en `utm_campaign`, la fila lleva el **nombre**, y un segundo registro de la misma campaña no
    vuelve a consultar a Meta;
  - Meta: sin token, si su API falla o si la campaña es de otra cuenta, la fila igual se escribe, con el id;
  - TikTok: el nombre sale de `utm_campaign` sin llamar a ninguna API; con solo `utm_id` queda el id, y un `utm_id`
    que no es numérico se descarta;
  - `enviarFormulario` manda `fuente`, `campana` y `campana_id` tomados del enlace del anuncio.
- `pnpm typecheck` y `pnpm lint`: sin errores.
- Consulta real de solo lectura a la API de Meta con el token local: `GET /120253059641580494?fields=name,account_id`
  → `C_04_CONEXIPEMA_FINCAALGARROBO_LANDING`, cuenta `1107857613612617`. Es el formato que espera el código.

## Pendientes

1. **Encabezados de la hoja (dueño):** solo **K1 `ORIGEN`** y **L1 `FUENTE`**. Ya no hacen falta M1 ni N1.
2. **Hasta que se publique este cambio**, producción sigue con el formato de 0017: en la A pone el `utm_campaign`
   tal cual (el id en Meta), deja G vacía y escribe el ID REGISTRO en la M, que no tiene encabezado. ORIGEN y
   FUENTE ya caen en K y L.
3. **Anuncios de TikTok que llevan a la landing:** sin esto, los registros de TikTok siguen llegando sin
   campaña. URL de destino («URL del sitio web» del anuncio), sin usar además «Crear parámetros de URL»:

   ```
   https://grupodlc.conexigo.com/?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_id=__CAMPAIGN_ID__
   ```

   `__CAMPAIGN_NAME__` y `__CAMPAIGN_ID__` son macros de TikTok: las reemplaza por el nombre y el id al hacer
   clic (la «Previsualización» no las reemplaza). Cambiar la URL vuelve a mandar el anuncio a revisión. El
   2026-10-17 el anuncio `ads-17octcasadetusueño` estaba solo como borrador: ningún anuncio ni campaña se había
   creado o modificado en la cuenta desde el 16 de octubre.
4. **Anuncios de Meta:** no hay que cambiar nada. En campañas nuevas, mantener el mismo parámetro de URL
   (`utm_campaign={{campaign.id}}`). No pasarlo al nombre: el panel cruza ese valor con el id de la campaña.
5. Las filas que escribe TikTok desde sus formularios instantáneos no pasan por la landing y siguen como siempre.
6. En producción, después de publicar: un registro de prueba desde un anuncio de Meta y otro desde uno de TikTok.
