# 0026 — `CompleteRegistration` también desde el servidor (Meta y TikTok)

**Fecha:** 2026-10-24 · **Rama:** `Jheferson`

## Qué se pidió

> «En src/app/api/formulario/route.ts, justo después de que agregarFila() guarda el lead en Google Sheets en
> el servidor, enviar también el evento CompleteRegistration por servidor (TikTok Events API POST
> https://business-api.tiktok.com/open_api/v1.3/event/track/ con el píxel DAQ48QRC77U77GG14PMG y Meta
> Conversions API con el píxel 1409214864656514), usando exactamente el mismo event_id: id que ya genera el
> backend para que haga deduplicación con el píxel del navegador, y pasando el ttclid / fbp / fbc, IP
> (x-forwarded-for), user-agent y el teléfono hasheado en SHA-256.»

Motivo, según el pedido: en la hoja había 16 leads de TikTok y el píxel de TikTok recibió 13 (~19 %
menos). La cifra viene del pedido; no se volvió a contar en esta sesión.

## Cómo estaba

Desde 0021/0023, con la fila confirmada en la hoja, el navegador enviaba `CompleteRegistration` a los dos
píxeles (`clientePotencial`) y **800 ms después** abría WhatsApp. En celular, la misma pestaña navega a
`wa.me` y salta a la app. Si la petición del píxel no terminó en ese momento, se cancela y la conversión se
pierde, aunque el lead esté en la hoja.

En Meta ya existía una copia automática del servidor de Meta (`mpc2-prod-…run.app`), deduplicada con el
`eventID`. En TikTok no había ninguna copia por servidor.

## Qué se hizo

### Servidor: `src/server/pixeles-servidor.ts` (nuevo)

`/api/formulario`, **después de que Google confirma la fila**, programa con `after()` (de `next/server`)
el envío de la conversión a las dos plataformas. `after()` corre cuando el visitante ya recibió la
respuesta, así que:

- el formulario no tarda más (el visitante no espera a Meta ni a TikTok);
- el envío **no depende del navegador**: Vercel mantiene viva la función hasta que termina, aunque la
  página ya se haya ido a WhatsApp.

Un reintento del mismo id (fila ya escrita) y un registro que Google rechaza **no** envían nada.

| | Meta (API de conversiones) | TikTok (Events API 2.0) |
| --- | --- | --- |
| Destino | `POST graph.facebook.com/v26.0/1409214864656514/events` | `POST business-api.tiktok.com/open_api/v1.3/event/track/` |
| Token | `META_CAPI_TOKEN`, en el cuerpo como formulario (no en la URL) | `TIKTOK_EVENTS_API_TOKEN`, cabecera `Access-Token` |
| Evento | `event_name: "CompleteRegistration"`, `action_source: "website"` | `event: "CompleteRegistration"`, `event_source: "web"`, `event_source_id: "DAQ48QRC77U77GG14PMG"` |
| Id del evento | `event_id` = id del registro | `event_id` = id del registro |
| Hora | `event_time` = la misma de la columna FECHA (segundos Unix) | ídem |
| Página | `event_source_url` = `Referer` del pedido (la URL de la landing con sus utm) | `page.url` = ídem |
| Teléfono | `ph: [sha256("51" + 9 dígitos)]` (Meta: código de país, solo dígitos) | `phone: sha256("+51" + 9 dígitos)` (TikTok: E.164, con «+») |
| IP | `client_ip_address` = primera IP de `x-forwarded-for` (o `x-real-ip`) | `ip` = ídem |
| Navegador | `client_user_agent` | `user_agent` |
| Cookies / clic | `fbp` (cookie `_fbp`), `fbc` (cookie `_fbc`; si no está, el que arma el navegador con el `fbclid`) | `ttp` (cookie `_ttp`), `ttclid` (de la URL de entrada) |
| Datos | `custom_data` = lo mismo que el navegador (`datosRegistroMeta`) | `properties` = lo mismo que el navegador (`datosRegistroTikTok`) |
| Éxito | HTTP 200 y `events_received: 1` | `code: 0` (TikTok responde los errores con HTTP 200) |

**Deduplicación:** el navegador y el servidor mandan el mismo nombre de evento y el mismo id (el id del
registro, columna «TikTok Lead ID» de la hoja). Meta y TikTok se quedan con una sola copia; en TikTok la
ventana es de 48 h. Si el navegador alcanzó a enviar, la copia del servidor se descarta; si no alcanzó,
la del servidor es la que cuenta.

**Campos vacíos o raros no se envían:** una cookie que no tiene el formato de Meta (`fb.1.<ms>.<id>`), un
`ttclid` con espacios o de más de 500 caracteres, etc. Sin el token de una plataforma, a esa plataforma
no se le envía nada (la otra sí).

**Fallos:** nunca afectan al visitante (el lead ya está en la hoja). Quedan en el registro de Vercel como
`[pixeles-servidor] Meta|TikTok no aceptó CompleteRegistration del registro <id>` con el mensaje de la
plataforma. Cada registro deja además una línea
`[pixeles-servidor] CompleteRegistration <id>: Meta enviado|sin token|falló, TikTok …`, útil para
cruzar con la hoja. No hay reintento automático.

**Datos personales:** el navegador sigue sin enviar nombre ni celular. El servidor envía **solo el hash
SHA-256 del celular** (nunca el nombre), como se pidió.

### Navegador: ids de clic

- `src/shared/lib/registro.ts`: al entrar (la primera vez en la sesión, junto con la atribución) guarda
  en `sessionStorage` (`dlc_c`) el `ttclid` de TikTok y el `fbc` de Meta, armado con el `fbclid` y la
  hora de llegada (`fb.1.<ms>.<fbclid>`). Nueva función `idsDeClic()`.
- `src/shared/lib/formulario.ts`: `enviarFormulario()` los manda a `/api/formulario`. Solo el formulario;
  `/api/eventos` (visitas y clics) no los recibe y no crece.
- `src/app/api/formulario/route.ts`: el cuerpo admite `ttclid` y `fbc` y su límite pasa de 2000 a 4000
  caracteres, para que un id largo nunca haga rechazar un lead.
- `src/shared/lib/pixeles.ts`: los datos del evento salen de `datosRegistroMeta()` y
  `datosRegistroTikTok()`, que usan el navegador y el servidor: las dos copias son iguales.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/server/pixeles-servidor.ts` | **Nuevo.** `visitaDe()` (IP, navegador, página, cookies, ids de clic) y `registroPorServidor()` (envío a Meta y TikTok en paralelo, tiempo límite de 8 s cada uno; nunca lanza). |
| `src/app/api/formulario/route.ts` | Tras `agregarFila()`: `after(() => registroPorServidor(...))`. La fecha de la fila es la del evento. Límite del cuerpo 4000. Contrato actualizado. |
| `src/shared/lib/pixeles.ts` | `datosRegistroMeta()` / `datosRegistroTikTok()` compartidos; `clientePotencial()` los usa (mismo resultado que antes). Regla del encabezado actualizada. |
| `src/shared/lib/registro.ts` | Guarda `ttclid` y `fbc` al entrar; `idsDeClic()`. |
| `src/shared/lib/formulario.ts` | `enviarFormulario()` agrega `...idsDeClic()` al cuerpo. |
| `test/formulario.spec.ts` | `after` simulado. 4 pruebas nuevas de la conversión por servidor y 1 del `fbc`; el ejemplo de TikTok comprueba el `ttclid`; un 502 o un reintento no programan envío. |

## Cómo se verificó

- `npx vitest run`: **53 pruebas, 4 archivos, todo verde**. Las nuevas comprueban, con `fetch` simulado:
  - nada sale antes de responder; después, una llamada a cada API con el mismo `event_id` y la misma
    `event_time` que la fila;
  - URL, token (Meta en el cuerpo, no en la URL; TikTok en `Access-Token`) y cuerpo completo de cada una;
  - hash del teléfono en el formato de cada plataforma, IP de `x-forwarded-for`, navegador, `_fbp`,
    `_fbc`, `_ttp`, `ttclid`, página del `Referer`;
  - ni el nombre ni el celular en claro;
  - la cookie `_fbc` manda sobre el `fbc` del navegador; los valores raros no se envían;
  - sin token, esa plataforma no se llama; un error de Meta (HTTP 400), de TikTok (`code` ≠ 0) o de red
    no cambia la respuesta (200) y queda en el log.
- `npx tsc --noEmit` y `eslint` sobre los archivos tocados: sin errores ni avisos.
- `npx next build`: compila; `/api/formulario` sigue como ruta dinámica.
- Token de TikTok de `.env.local` (`TIKTOK_EVENTS_API_TOKEN`, generado el 2026-09-24): un pedido **sin
  eventos** (`data: []`) al endpoint de TikTok respondió `40002 Number of events must be between 1 and
  1000` (el token pasó la autenticación), mientras que un token inventado da `40105 Access token is
  incorrect or has been revoked`. No se envió ningún evento.
- **No se envió ninguna conversión real ni de prueba** (pedido del usuario: verificar solo con datos
  reales). Meta y TikTok se verifican con los primeros registros reales después de publicar.

## Pendientes (para el dueño)

1. **Meta — token de la API de conversiones:** Administrador de eventos → píxel
   `Pixel_DLC-CONEXIPEMA_FINCAALGARROBO` (`1409214864656514`) → Configuración → API de conversiones →
   «Generar token de acceso». Cargarlo en Vercel como **`META_CAPI_TOKEN`** (Production). Sin él, Meta no
   recibe la copia del servidor (sigue la del navegador y la automática de Meta).
2. **TikTok — token de Events API:** cargar en Vercel **`TIKTOK_EVENTS_API_TOKEN`** (Production) con el
   valor que ya está en `.env.local` (válido al 2026-10-24), si no está cargado. No se pudo revisar Vercel
   desde aquí (sin CLI ni sesión de Vercel).
3. **Publicar:** merge de `Jheferson` a `main` y despliegue. Las variables nuevas solo se leen en un
   despliegue posterior a cargarlas.
4. **Comprobar con los primeros registros reales:**
   - Vercel → Logs: por cada registro, `[pixeles-servidor] CompleteRegistration <id>: Meta enviado, TikTok
     enviado`. Un «falló» trae el mensaje de la plataforma en la línea anterior.
   - Meta → Administrador de eventos → `CompleteRegistration` («Registro completado»): aparece la fuente
     **Servidor** además de Navegador, con deduplicación.
   - TikTok → Administrador de eventos → «Complete registration»: aparece la conexión **Events API**
     además de Pixel.
   - Contar de nuevo hoja contra píxel de TikTok (antes 16 contra 13).
5. **Privacidad:** ahora Meta y TikTok reciben el hash del celular de cada registro. Conviene que el aviso
   de privacidad de la landing lo mencione.
6. Las pestañas abiertas antes de publicar no guardaron `ttclid`/`fbc` al entrar: sus registros igual
   salen por servidor, con teléfono, IP, navegador y cookies, y con el `ttclid`/`fbclid` solo si siguen en
   la URL.
