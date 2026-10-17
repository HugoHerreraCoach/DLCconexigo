# 0018 — El chat flotante es un formulario de registro («Registrarme ahora»)

**Fecha:** 2026-10-17 · **Rama:** `Jheferson`

## Qué se pidió

> «En el botón flotante agrega también los campos del formulario nombre y apellidos - el numero, y quita
> lo de continuar con Whatsapp y colócale Registrarme ahora»

## Qué se hizo

El chat que se abre con «ASESOR EN LÍNEA · ¡Hablemos!» deja de abrir WhatsApp. Ahora es un formulario
de registro con los mismos campos que el del hero y funciona igual que él:

1. **Campos:** «Nombre y apellidos*», «Tu número de celular*» (con 🇵🇪 +51), «¿Con cuánto cuentas de
   inicial?» y «¿Cuándo quieres comprar?». Los cuatro son obligatorios, sin opción marcada de entrada, y
   tienen los mismos mensajes de error que el hero.
2. **Botón «Registrarme ahora»** (verde, con ícono `UserPlus`) en lugar de «Continuar en WhatsApp».
   Mientras envía muestra «Registrando tus datos…», al confirmarse «¡Listo! Un asesor te contactará
   pronto» y, si falla, «Intentar de nuevo» con el mismo aviso de error que el hero.
3. **Destino:** misma hoja de cálculo que el hero, a través de `/api/formulario`. En la columna
   **K · ORIGEN** sale `Landing · Chat flotante · formulario de registro` (el hero sigue saliendo como
   `Landing · Formulario de solicitud de información de terreno`).
4. **«Cliente potencial»** (Meta `Lead` / TikTok `SubmitForm`): solo cuando Google confirma la fila, con el
   ID REGISTRO como id del evento, igual que el hero. Se retira la regla provisional de 0016: **ningún clic
   a WhatsApp vuelve a enviar conversión**.
5. **Texto de apoyo:** «Opciones rápidas para hablar por WhatsApp:» pasa a «Déjanos tus datos y un asesor
   te escribirá por WhatsApp:». Se mantienen el saludo de la asesora y «⚡ Te atenderemos directamente por
   WhatsApp sin compromiso».
6. **Panel:** el registro se guarda en `eventos` como `lead` con origen `chat-flotante-registro`, y el panel
   lo muestra como «Chat flotante · formulario de registro».

### Lógica compartida

Para que los dos formularios no se separen con el tiempo, el estado y el envío pasan a un solo hook,
`useRegistro(origen)` (`src/views/home/components/useRegistro.ts`). Contiene la validación, el id del envío
(se mantiene en los reintentos y se renueva al cambiar un dato), el envío a la hoja y el «Cliente potencial»
después de la confirmación. `FormularioContacto` y `WhatsAppFlotante` solo dibujan los campos.

### API

`POST /api/formulario` acepta un campo nuevo, `origen`, que debe estar en `FORMULARIOS`
(`src/shared/lib/formulario.ts`: `formulario-hero`, `chat-flotante-registro`). Si falta, se toma
`formulario-hero`, así que el formulario del hero sigue funcionando igual. Cualquier otro valor responde 400
sin tocar la hoja.

### Lo que se retira

- El rastro `chat-flotante-preguntas` (0017), `MENSAJES.chat` y `mensajeChat()`: nunca se publicaron, así que
  no tienen histórico.
- `CHAT_FLOTANTE` y el parámetro `datos` de `rastrearContacto()` (0016). `rastrearContacto` vuelve a registrar
  solo la intención.
- Los rastros del chat anterior (`chat-flotante-visita`, `-asesor`, `-mensaje`) siguen en el catálogo por el
  histórico.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/views/home/components/useRegistro.ts` | **Nuevo.** Estado, validación y envío de los formularios de registro. |
| `src/views/home/components/WhatsAppFlotante.tsx` | Campos de nombre y celular (`CampoChat`), errores en las preguntas, `<form>` y botón «Registrarme ahora». Ya no usa WhatsApp. |
| `src/views/home/components/FormularioContacto.tsx` | Usa `useRegistro("formulario-hero")`; mismo aspecto y comportamiento. |
| `src/shared/lib/formulario.ts` | `FORMULARIOS`, `IdFormulario` y `origen` en `enviarFormulario()`. |
| `src/app/api/formulario/route.ts` | Valida `origen` y lo usa en la columna ORIGEN y en `eventos.origen`. |
| `src/config/rastros.ts` | Alta de `chat-flotante-registro` (lead); baja de `chat-flotante-preguntas`; guía actualizada. |
| `src/shared/lib/pixeles.ts` | Sin `CHAT_FLOTANTE`; regla de conversión actualizada. |
| `src/shared/lib/whatsapp.ts`, `src/shared/lib/plantillas.ts` | Sin `MENSAJES.chat` ni `mensajeChat()`; comentario. |
| `test/formulario.spec.ts` | Pruebas del chat como formulario y de `origen`. |

## Cómo se verificó

- `pnpm test`: **37/37**. Las pruebas nuevas o cambiadas comprueban:
  - el chat escribe la fila con ORIGEN «Landing · Chat flotante · formulario de registro» y guarda
    `chat-flotante-registro` en `eventos`;
  - sin `origen` se usa el del hero;
  - un `origen` que no es de `FORMULARIOS` (por ejemplo, `header-agendar-visita`) responde 400 sin tocar la hoja;
  - `enviarFormulario` manda el `origen`;
  - el `Lead` / `SubmitForm` del chat lleva el id del registro;
  - los clics a WhatsApp (los ids del chat anterior y `sin-identificar`) ya no envían conversión.
- `pnpm typecheck` y `pnpm lint`: sin errores.
- Servidor local: la página compila (200) y `POST /api/formulario` con `origen: "chat-flotante-registro"`
  responde **503**. Es lo esperado sin las variables `GOOGLE_SHEETS_*` en `.env.local`: no se escribe nada.
- Sin prueba en el navegador: la página local carga los píxeles reales.

## Pendientes

- Revisar en el navegador, sobre todo en celular, el chat abierto. Ahora tiene más contenido; si no cabe,
  el área de mensajes se desplaza y el botón «Registrarme ahora» queda siempre visible abajo.
- En producción, después de publicar: enviar un registro de prueba desde el chat y comprobar que en la hoja
  sale con su ORIGEN y que en Meta llega `Lead` con el mismo ID REGISTRO.
- Siguen vigentes los pendientes de 0015 (cuenta de servicio, variables en Vercel y encabezados K–M).
