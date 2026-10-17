# 0015 — El formulario va a la hoja de cálculo; «Cliente potencial» solo con la fila guardada

**Fecha:** 2026-10-17 · **Rama:** `Jheferson`

## Qué se pidió

> «ahora quiero que en vez que vayan a Whatsapp se registren en una hoja de cálculo,
> [enlace a la hoja «LEADS DLC_ FINCA ALGARROBO»],
> verifica qué se requiere. Y que el pixel que registra ese movimiento se registre cuando se agregó
> la respuesta de ese formulario en la hoja de cálculo.»

## Qué se hizo

Antes, el formulario del hero («Reclamar regalo en WhatsApp») abría WhatsApp con un mensaje
armado. Ahora:

1. El visitante llena el formulario y toca **«Reclamar mi regalo»**.
2. El navegador envía los datos a `POST /api/formulario` (servidor).
3. El servidor valida y agrega **una fila** a la hoja «LEADS DLC_ FINCA ALGARROBO AUTOMATIZACIÓN - CRM»
   (pestaña «Hoja 1») con la API de Google Sheets. Responde `ok` **solo si Google confirma
   que escribió exactamente una fila** (`updates.updatedRows === 1`).
4. Recién con ese `ok` el navegador envía **«Cliente potencial»** a los píxeles:
   Meta `Lead` (se muestra como «Cliente potencial») y TikTok `SubmitForm` (TikTok lo muestra
   como «Lead»). Son los mismos eventos que ya recibía el píxel `1409214864656514`: se revisó en Meta y
   no existe ningún evento ni conversión personalizada llamada `clientes_potenciales`. El
   evento lleva como id (`eventID` / `event_id`) el id del envío, que también queda en la
   columna **ID REGISTRO**, así que cada evento del píxel se puede cruzar con su fila.
5. Se guarda además un `lead` en la tabla `eventos` para el panel, con huellas HMAC y sin el nombre
   ni el celular en claro. Si esto falla, el lead ya está en la hoja y al visitante no se le
   muestra error.
6. Si la hoja falla, la persona ve «No pudimos registrar tus datos…» y el botón pasa a
   «Intentar de nuevo». El reintento usa el mismo id: si la fila ya se había escrito, no se duplica.

Ya **no** se abre WhatsApp desde el formulario. Los demás botones de WhatsApp no cambian: siguen
abriendo WhatsApp y registran solo la intención (`contacto`), sin conversión.

### Fila que se escribe

La hoja ya recibe los formularios instantáneos de TikTok, así que las columnas A–J usan su mismo
formato y lo propio de la landing va de la K a la N:

| Col. | Encabezado | Valor desde la landing |
| --- | --- | --- |
| A | ID CAMPAÑA | `utm_campaign` de la visita (vacío si no vino de un anuncio con UTM) |
| B | FECHA | Segundos Unix, igual que las filas de TikTok |
| C | NOMBRE | Nombre escrito (espacios repetidos colapsados) |
| D | NUMERO | `+51 9XX XXX XXX` |
| E | INICIAL | Opción elegida («Desde S/ 5,000», «S/ 10,000 a más»…) |
| F | TIEMPO DE COMPRA | Vacío: el formulario de la landing no lo pregunta |
| G–H | TikTok Lead ID / Status | Vacíos |
| I | Lead creation time | Segundos Unix (igual que FECHA) |
| J | Lead update time | Vacío |
| K | **LO QUIERO PARA** | «Invertir» o «Casa de campo» |
| L | **ORIGEN** | «Landing · Formulario de solicitud de información de terreno» |
| M | **FUENTE** | `meta`, `tiktok`, `google`, `otro` o `directo` |
| N | **ID REGISTRO** | Id del envío (= id del evento del píxel) |

Se escribe con `valueInputOption=RAW`, así que nada de lo que escribe el visitante se interpreta como
fórmula.

### Validación

- Celular: 9 dígitos que empiezan en 9, con o sin `+51` (la misma regla en el navegador y en el servidor).
- «Lo quiero para» e «Inicial» solo aceptan las opciones del formulario (`src/config/contenido.ts`).
- Cuerpo de 2000 caracteres como máximo; los robots conocidos reciben un 403.

### Botones que llevan al formulario (mismo día)

Tres enlaces seguían anunciando WhatsApp aunque llevan a `#formulario`, que ya no abre WhatsApp. Se les cambió
el texto y el ícono con un enfoque comercial: beneficio concreto, primera persona y urgencia.

| Dónde | Antes | Ahora | Ícono | Por qué |
| --- | --- | --- | --- | --- |
| Menú superior (`Header.tsx`) | Ir a WhatsApp | **Reclamar mi bono** | `Gift` | Repite la oferta del hero («Bono exclusivo: cerco vivo»); corto para el celular, donde el menú solo muestra el logo y este botón |
| El proyecto (`Proyecto.tsx`, botón principal) | Agenda tu visita | **Separa tu lote hoy** | `KeyRound` | Está justo debajo de «S/ 500 para separar»; habla de tener el lote y suma urgencia. Corto para que entre en una línea junto a «Pide la ficha» |
| Pie de página, Contacto (`Footer.tsx`) | Escríbenos por WhatsApp | **Habla con un asesor hoy** | `Headset` | Coincide con lo que pasa después del formulario: un asesor contacta a la persona |

Siguen mencionando WhatsApp, aunque llevan al formulario: la tarjeta «Escríbenos por WhatsApp» de la sección
Contacto (`Contacto.tsx`) y «Enviármelo por WhatsApp» de la Galería (`Galeria.tsx`). No se tocaron porque no se pidieron.

## Por qué así

- **Cuenta de servicio de Google y no Apps Script:** la API devuelve una confirmación explícita
  de la fila escrita, que es justo lo que se necesita para enviar el píxel «cuando se agregó la
  respuesta». No requiere publicar un script ni manejar redirecciones, y la credencial vive solo en el servidor.
- **Sin dependencias nuevas:** el token se obtiene con un JWT firmado con `node:crypto`.
- **El píxel se dispara en el navegador después de la confirmación del servidor.** Es lo que pide el cambio
  y no necesita tokens nuevos. El id del evento queda listo por si más adelante se envía también
  desde el servidor (Conversions API / Events API) y hay que deduplicar.
- Este cambio **reemplaza, solo para el formulario del hero**, la regla del plan de
  `recursos/ConexiGO_Clientes_Potenciales_WhatsApp_Plan_Implementacion.md` («completar el
  formulario no es una conversión»). Ahora el lead del formulario es la fila guardada en la hoja.
  Para los clics a WhatsApp, la regla sigue igual.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/server/hoja-calculo.ts` | **Nuevo.** Configuración por variables de entorno, `COLUMNAS`, `filaLead()` y `agregarFila()` (token JWT RS256 en caché por cuenta, append con confirmación de la fila). |
| `src/app/api/formulario/route.ts` | **Nuevo.** `POST /api/formulario`: valida, evita duplicados por id, escribe la fila y registra el `lead` del panel. 400 / 502 / 503 según el caso. |
| `src/shared/lib/formulario.ts` | **Nuevo.** `celularPeru()` (compartido entre navegador y servidor) y `enviarFormulario()` (espera la confirmación). |
| `src/shared/lib/pixeles.ts` | Nuevo `clientePotencial(id, registroId, datos)`: Meta `Lead` + TikTok `SubmitForm` con el id del evento y sin datos personales. Se actualiza la regla del encabezado. `rastrearLead` y `rastrearContacto` quedan igual. |
| `src/shared/lib/registro.ts` | Nuevo `contextoVisita()` (visitante, fuente, campaña, móvil); `registrar()` lo reutiliza. |
| `src/views/home/components/FormularioContacto.tsx` | Ya no abre WhatsApp: envía, espera la fila y recién entonces dispara el píxel. Estados: enviando / listo / error con reintento. Textos nuevos: «Déjanos tus datos para reclamar tu regalo», «Reclamar mi regalo», «Registrando tus datos…», «¡Listo! Un asesor te contactará pronto». |
| `src/config/rastros.ts` | Comentarios de la guía actualizados al nuevo flujo. |
| `test/formulario.spec.ts` | **Nuevo.** 11 pruebas (ver abajo). |

## Cómo se verificó

- `pnpm test`: **31/31** pruebas, entre ellas 11 nuevas, que verifican:
  - validación del celular;
  - orden y formato de las columnas;
  - JWT firmado y verificable con la clave pública, `scope` de Sheets y URL `append` con `RAW`;
  - error si Google no confirma la fila;
  - 400 sin tocar la hoja cuando los datos son inválidos;
  - 503 sin variables de la hoja;
  - fila escrita y luego `lead` en `eventos` sin datos personales en claro;
  - 502 sin `lead` cuando Google rechaza;
  - un reintento con el mismo id no escribe otra fila;
  - `enviarFormulario` solo resuelve con `ok` del servidor;
  - el píxel envía `Lead` y `SubmitForm` con el id y sin datos personales.
- `pnpm typecheck` y `pnpm lint`: sin errores.
- `pnpm build`: compila y lista `ƒ /api/formulario`.
- Servidor de desarrollo con `curl`: un cuerpo válido devuelve `503 hoja no configurada`
  (en local no hay credenciales de Google), un celular inválido devuelve `400` y un robot devuelve `403`.
- **No se probó contra la hoja real** porque aún no existe la cuenta de servicio. Tampoco se abrió la
  página en el navegador en local: la landing manda `PageView` al píxel real y registra la visita en
  la base de Supabase real configurada en `.env.local`.

## Pendientes para el dueño (antes de publicar)

1. **Crear la cuenta de servicio en Google Cloud:** proyecto → activar la *Google Sheets API* →
   *IAM → Cuentas de servicio* → crear → pestaña *Claves* → *Agregar clave → JSON*.
2. **Compartir la hoja con el correo de la cuenta de servicio** (`…@….iam.gserviceaccount.com`)
   como **Editor**.
3. **Cargar estas variables en Vercel (Production y Preview) ANTES de publicar esta versión.** Sin ellas,
   cada envío del formulario muestra error y el lead se pierde:
   - `GOOGLE_SHEETS_ID` = el id del enlace de la hoja (lo que va entre `/d/` y `/edit`). No se escribe
     aquí: este repositorio es público y la hoja, mientras no se restrinja (punto 5), la puede editar
     cualquiera que tenga el enlace.
   - `GOOGLE_SHEETS_CLIENT_EMAIL` = `client_email` del JSON
   - `GOOGLE_SHEETS_PRIVATE_KEY` = `private_key` del JSON (tal cual, con sus `\n`)
   - `GOOGLE_SHEETS_HOJA` (opcional; por defecto `Hoja 1`)
4. **Escribir los encabezados nuevos en la fila 1:** K1 `ORIGEN`, L1 `FUENTE` y M1 `ID REGISTRO`.
   *(Actualizado en [0017](0017-preguntas-de-inicial-y-compra.md): se quitó «LO QUIERO PARA» y ahora se llena
   la F «TIEMPO DE COMPRA». La tabla de abajo describe la versión original.)*
5. **Seguridad de la hoja:** hoy está compartida como **«Cualquier persona con el enlace puede
   editar»** y contiene nombres y celulares de prospectos. Conviene restringirla a las personas del
   equipo y a la cuenta de servicio (y confirmar que la automatización de TikTok no dependa del enlace público).
6. **Prueba en producción después de publicar:** enviar un formulario de prueba y comprobar que (a) aparece la
   fila, (b) en el Administrador de eventos de Meta llega `Lead` con el mismo id de la columna
   ID REGISTRO y (c) TikTok recibe `SubmitForm`. Después, borrar la fila de prueba.
7. **Versión publicada:** el píxel de Meta siguió recibiendo `Lead` hasta el 2026-10-16. Eso indica que
   producción corre una versión anterior a la fase 1 (que retiró esos eventos). Al publicar `Jheferson`
   salen juntas las fases 1–8 y este cambio.

**Base de datos: no hay migración que aplicar.** El formulario usa columnas de `eventos` que ya existían
(`datos`, `nombre_huella`, `telefono_huella`, `intencion_id` y su índice único). El 2026-10-17 se comprobó
con una consulta de solo lectura que la base de Supabase (`twfcxvnnqwwhlvjaxoab`) ya las tiene. De todos
modos, `asegurarEsquema()` (`src/server/db.ts`) las crea con `IF NOT EXISTS` al arrancar.

## Pendientes opcionales

- **Panel:** `docs/0014` trata el `Lead` del píxel como «clic a WhatsApp» y el panel suma los formularios a
  «Clics a WhatsApp (Web)». Con este cambio, el `Lead` del formulario es un lead real guardado en la hoja.
  Falta decidir si se ajustan las etiquetas y el costo por lead del panel.
- **Envío también desde el servidor** (Meta Conversions API / TikTok Events API) con el mismo id, para no
  perder eventos por bloqueadores de anuncios. Ya existe `TIKTOK_EVENTS_API_TOKEN` en `.env.local`. Para Meta
  hace falta un token con permiso de envío.
- **Antispam:** no hay límite de envíos por IP. Si aparecen filas basura, agregar un límite o un captcha.
- `rastrearLead()` (intención `formulario_preparado`) ya no la usa ningún componente. Se conserva por el
  histórico y las pruebas de la fase 1.
