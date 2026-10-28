# 0027 — Origen de la landing en el CRM (los registros dejan de salir como «Directo»)

**Fecha:** 2026-10-28 · **Rama:** `Jheferson` → `main`

## Qué se pidió

> «Mira ahora cuando los leads que llegan de la landing por cualquiera de las dos rutas de meta o tiktok,
> en el CRM se muestran con origen directo, me gustaría que muestren L-tiktok y L-Meta, ¿Hay algo que
> hacer desde aquí o todo se hace en el CRM Conexigo?»

> «El mensaje que nos llega a Whatsapp ese no va a cambiar, solamente el origen»

Después: «Lo que hiciste en la landing sube a Jheferson y haz el merge a main; por lo que hay que hacer en
el crm no te preocupes el otro agente ya se encargó de eso».

## Cómo funciona la atribución entre el CRM y la landing

1. El visitante se registra (formulario del inicio o chat «Asesor en línea»). `/api/formulario` guarda la
   fila en la hoja y un evento `lead` en la tabla `eventos` con su fuente (`meta`, `tiktok`…), campaña y
   formulario.
2. El navegador abre WhatsApp con `mensajeRegistro(nombre, inicial)`: «L - » + el mensaje `general` + la
   inicial + «Mi nombre es: …» (0023, 0025).
3. Cuando ese primer mensaje llega al CRM ConexiGO, el CRM (`atribucion.landing.ts`) pregunta a la landing
   `POST /api/whatsapp/mensaje` (firmado) de dónde vino, con el texto del mensaje.
4. La landing (0013) reconoce el texto por su **plantilla** (`plantillaDe` → `general`) y busca en
   `eventos` una fila con **esa plantilla**, sin recibir, creada entre 2 h antes y 5 min después del
   mensaje. Si hay varias, gana la que tiene la misma **huella del nombre** (`nombreDe` + `huellaNombre`).
5. Si la encuentra, responde `encontrado: true` con `atribucion.fuente`; el CRM llena el origen del lead
   con esa fuente («Anuncio de Meta · landing» / «Anuncio de TikTok · landing»). Si no, responde
   `encontrado: false` y el CRM deja **«Directo»**.

## Causa

Desde que el registro termina en WhatsApp (0023), el evento `lead` del formulario se guardaba con la
huella del nombre y la del teléfono, pero **sin `plantilla`**. El paso 4 filtra por plantilla, así que
nunca lo encontraba: la landing respondía `encontrado: false` y el CRM mostraba «Directo» aunque la fila
de la hoja sí tuviera FUENTE `meta` o `tiktok`.

## Qué se hizo

`src/app/api/formulario/route.ts`: el `INSERT` del evento `lead` guarda además la columna **`plantilla`**
= `plantillaDe(mensajeRegistro(nombre, inicial))` → `general`, la misma que la landing saca del mensaje
cuando el CRM pregunta. `nombre_huella` (para elegir el registro correcto cuando hay varios en las mismas
2 h) y `telefono_huella` ya se guardaban y no cambian.

Ni el nombre ni el celular se guardan en claro (solo sus huellas, como en 0013).

**El mensaje de WhatsApp no cambia** (pedido del usuario): se calcula con la misma función
`mensajeRegistro` que usa el navegador (`useRegistro.ts`), solo para saber su plantilla.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/app/api/formulario/route.ts` | El evento `lead` guarda también `plantilla`. Imports de `plantillaDe` y `mensajeRegistro`. |
| `test/formulario.spec.ts` | Prueba nueva: el `INSERT` lleva la plantilla `general`, la huella del nombre que la landing saca del texto del enlace de WhatsApp y la fuente `tiktok`. |

## Cómo se verificó

- `npx vitest run`: **54 pruebas, todo verde**. La nueva arma el texto con
  `enlaceWhatsApp(mensajeRegistro("Ana Pérez", "Desde S/.5 mil"))` (el que abre el navegador) y comprueba
  que la plantilla y la huella guardadas son las que `/api/whatsapp/mensaje` buscará con ese texto.
- `npx tsc --noEmit` y `eslint` sobre los archivos tocados: sin errores ni avisos.
- Antes del merge se revisaron los dos commits nuevos de `main` (Isa, 2026-10-24: `b038f94` carrusel y
  chat, `419dd04` nombres de campañas de Meta): no tocan `route.ts` ni el mensaje de WhatsApp.
- **No se hizo ningún registro de prueba** (pedido del usuario: verificar solo con datos reales).

## Pendientes

1. **Solo cuentan los registros nuevos**, desde que se publique: los leads que ya entraron siguen como
   «Directo» en el CRM (sus eventos no tienen plantilla y el CRM pregunta una sola vez, con el primer
   mensaje).
2. **CRM:** el usuario indicó que el otro agente se encargó de lo del lado del CRM (texto «L-Meta» /
   «L-TikTok» y configuración). Para que pregunte a la landing, el negocio DLC necesita **una sola landing
   activa** con endpoint `https://grupodlc.conexigo.com/api/whatsapp/recibido` y el mismo secreto
   (`CONEXIGO_WEBHOOK_SECRET`).
3. **Comprobar con los primeros registros reales:** en el CRM, el origen del lead debe dejar de ser
   «Directo»; en la hoja, la fila del mismo registro tiene la FUENTE que debería verse.
4. `telefono_huella`: la landing la guarda con 32 caracteres y `/api/whatsapp/mensaje` solo busca por
   teléfono si el CRM manda una de 64 (hoy no la manda). No afecta este arreglo, que empareja por
   plantilla y nombre; si algún día el CRM la envía, hay que igualar el formato.
5. Siguen los pendientes de 0026 (`META_CAPI_TOKEN` y `TIKTOK_EVENTS_API_TOKEN` en Vercel).
