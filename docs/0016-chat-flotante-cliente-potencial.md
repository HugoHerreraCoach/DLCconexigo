# 0016 — El chat flotante envía «Cliente potencial» (provisional)

**Fecha:** 2026-10-17 · **Rama:** `Jheferson`

## Qué se pidió

Sobre el botón flotante «ASESOR EN LÍNEA · ¡Hablemos!» (`/html/body/div[2]/button`):

> «Vamos a cambiar el formulario de ese botón, poero quiero que registre el mismo evento de cliente
> potencial realiza ese cambio por ahora. Luego te diré qué cambios vamos a realizar otros cambios»

## Qué se hizo

Mientras se rehace el formulario de ese chat, sus **tres acciones que abren WhatsApp** envían el
mismo evento que el formulario del hero (`clientePotencial`): Meta `Lead` («Cliente potencial») y
TikTok `SubmitForm`.

| Acción | Rastro | Antes (rama) | Ahora |
| --- | --- | --- | --- |
| Opción «Agendar visita este fin de semana» | `chat-flotante-visita` | Solo `contacto` en el panel | `contacto` + `Lead` / `SubmitForm` |
| Opción «Quiero que me contacte un asesor» | `chat-flotante-asesor` | Solo `contacto` | `contacto` + `Lead` / `SubmitForm` |
| Escribir un mensaje y enviar (botón o Enter) | `chat-flotante-mensaje` | Solo `contacto` | `contacto` + `Lead` / `SubmitForm` |
| Tocar la píldora para abrir o cerrar el chat | — | Nada | Nada (no cuenta) |

- El id del evento (`eventID` / `event_id`) es el `intencion_id` del `contacto` que se guarda en
  `eventos`, así que cada evento del píxel se puede cruzar con su fila del panel.
- La lista vive en `CHAT_FLOTANTE`, en `src/shared/lib/pixeles.ts`, y se aplica en `rastrearContacto()`.
  Por ahí pasan tanto el oyente global de enlaces `wa.me` (`Pixeles.tsx`) como el envío con Enter
  del chat. Cualquier otro enlace de WhatsApp sigue sin conversión.
- No se escribe nada en la hoja de cálculo: el chat no pide nombre ni celular.
- Abrir o cerrar el chat **no** cuenta, porque inflaría los leads con cada visitante curioso.

### Corrección incluida: `intencion_id` se perdía

Al probar el cambio apareció un bug de `registrar()` (`src/shared/lib/registro.ts`) que venía de la
fase 1. El cuerpo se armaba como `{ intencion_id, ...extra }`, y `rastrearContacto` pasa
`intencion_id: undefined` cuando no recibe uno. Ese `undefined` borraba el id generado y el envío a
`/api/eventos` salía **sin** `intencion_id`. Por eso los clics a WhatsApp quedaban en `eventos` sin id:
sin deduplicación en el servidor y sin forma de cruzarlos con el evento del píxel. Ahora
`intencion_id` va después de `...extra`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/pixeles.ts` | `CHAT_FLOTANTE` y `rastrearContacto()` llama a `clientePotencial(id, intencion)` para esos rastros. Se actualiza la regla del encabezado. |
| `src/shared/lib/registro.ts` | `intencion_id` después de `...extra` (corrección del bug). |
| `src/config/rastros.ts` | Comentario: Meta y TikTok también reciben el nombre del rastro desde el chat flotante. |
| `test/formulario.spec.ts` | 4 pruebas nuevas: las tres acciones del chat envían `Lead` / `SubmitForm` con el `intencion_id` y lo registran; un enlace fuera del chat no envía conversión. |

## Cómo se verificó

- `pnpm test`: **35/35** pruebas (4 nuevas). La prueba del chat fue la que detectó el bug del `intencion_id`.
- `pnpm typecheck` y `pnpm lint`: sin errores.
- No se probó en el navegador, para no mandar eventos de prueba al píxel real.

## A tener en cuenta

- Este es un **clic** que abre WhatsApp, no un mensaje confirmado ni una fila en la hoja. En Meta y
  TikTok se sumará a los «Clientes potenciales» del formulario. En móvil, el evento se envía justo antes
  de salir hacia WhatsApp, igual que antes de la fase 1, así que alguno puede perderse.
- `docs/0014` y el panel tratan el `Lead` del píxel como «clic a WhatsApp». Con 0015 y 0016, ese `Lead`
  mezcla formularios guardados en la hoja con clics del chat.
- **Pendiente:** el usuario indicará cómo será el nuevo formulario del chat. Cuando se cambie, revisar si
  `CHAT_FLOTANTE` sigue teniendo sentido o si el chat pasa a la hoja de cálculo como el hero.
