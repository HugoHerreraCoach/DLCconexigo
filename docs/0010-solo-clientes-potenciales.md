# 0010 — Un solo evento: «Cliente potencial», sin código en los mensajes

**Fecha:** 2026-10-01

## Contexto

Entre el 30/09 y el 01/10 entraron 6 commits de **Isa Belcan** (diseño, panel
gerencial, chat flotante, formulario). En la medición dejaron:

- Por cada clic a WhatsApp y cada formulario, **4 eventos en Meta** (`Lead`,
  `Lead` y `lead` personalizados y `Contact`) y **3 en TikTok** (`Contact`,
  `Lead`, `SubmitForm`).
- El código **fijo `L-1`** en la misma línea del saludo (`L-1 - Hola…`), que
  el CRM no detecta y no permite atribuir.
- En `src/server/db.ts`, un `DELETE FROM eventos WHERE creado < '2026-09-30 23:25'`
  y el reinicio de la secuencia, ejecutados en cada arranque del servidor
  (borró todo el historial anterior: visitas desde el 23/09, la prueba `L-6`,
  el tráfico de prueba del 30/09).
- En el panel, un botón «Vaciar datos de prueba» (`TRUNCATE TABLE eventos`)
  sin confirmación.
- El chat flotante: pulsar Enter en el cuadro de texto abría WhatsApp sin medir
  nada.

**Consenso del usuario con Isa:**
1. Solo existe **«Cliente potencial»**: todo lo que se capturaba se cuenta ahí,
   incluido el chat flotante.
2. Los mensajes salen **sin código**.
3. **No se miden los mensajes recibidos** (decisión del usuario al preguntarle
   cómo detectar sin código).
4. Quitar el **borrado** y el **reinicio de la numeración**.

## Qué se hizo

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/pixeles.ts` | `clientePotencial()`: **un** `fbq("track","Lead")` y **un** `ttq.track("SubmitForm")` (TikTok lo muestra como «Lead») por acción. Sin `Contact` ni personalizados. El registro propio sigue distinguiendo `contacto` (botón) de `lead` (formulario) |
| `src/shared/lib/whatsapp.ts` | `abrirWhatsApp(enlace, medir)` sin código: mide y abre (pestaña en escritorio, navegación directa en celular). Se eliminan `CODIGO_FIJO`, `PREFIJO_REFERENCIA`, `conReferencia`. Se conserva `PATRON_REFERENCIA` solo para `/api/whatsapp/recibido` |
| `src/shared/lib/registro.ts` | Se elimina `registrarConCodigo` (todo pasa por `registrar`, con `sendBeacon`) |
| `src/app/api/eventos/route.ts` | Ya no reserva ni devuelve códigos |
| `src/server/db.ts` | **Sin `DELETE`, sin `RESTART`, sin secuencia.** Comentario de advertencia: esa función corre en cada arranque |
| `src/app/panel/acciones.ts` + `PanelView.tsx` | Se elimina `limpiarMetricasPrueba` (TRUNCATE) y su botón |
| `src/views/panel/PanelView.tsx` | Se quitan la tarjeta y el paso del embudo «Leads en CRM» (recibidos); rejillas ajustadas (5 y 4 columnas) |
| `src/config/rastros.ts` | Nuevos: `chat-flotante-visita`, `chat-flotante-asesor`, `chat-flotante-mensaje` |
| `src/views/home/components/WhatsAppFlotante.tsx` | Cada opción del chat con su id; **Enter** en el cuadro de texto ahora mide (`abrirWhatsApp` + `rastrearContacto`) |
| `src/shared/ui/Pixeles.tsx`, `FormularioContacto.tsx` | Llamadas a la nueva `abrirWhatsApp` |

No se tocó: `/api/whatsapp/recibido` (de Isa, con su lógica de ventas), las
columnas `codigo`/`recibido_en`/`venta_en` (se conservan), el resto del panel.

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint` (0 errores; 4 avisos de variables sin usar que
  ya estaban en el panel), `pnpm build`.
- Local (Postgres en memoria + build de producción, Brave), con `fbq`/`ttq`
  sustituidos por un registrador:

| Acción | Eventos | Mensaje | Registro propio |
| --- | --- | --- | --- |
| Botón «Agenda tu visita» del menú | `Lead` + `SubmitForm` | «Hola, quiero más información…» (sin código) | contacto `header-agendar-visita` |
| Chat · Agendar visita | `Lead` + `SubmitForm` | texto de visita | contacto `chat-flotante-visita` |
| Chat · Asesor | `Lead` + `SubmitForm` | texto de asesor | contacto `chat-flotante-asesor` |
| Chat · botón enviar | `Lead` + `SubmitForm` | «Hola Grupo DLC, quiero saber el precio» | contacto `chat-flotante-mensaje` |
| Chat · Enter | `Lead` + `SubmitForm` | igual | contacto `chat-flotante-mensaje` |
| Formulario | `Lead` + `SubmitForm` | «…Mi nombre es: Prueba Local» | lead `formulario-hero` |

- Observación de la prueba: con el chat abierto en escritorio, su ventana tapa
  el botón del formulario (un clic cayó en «Agendar visita» del chat). Es de
  diseño, no de medición; se informa a Isa.

## Pendientes / avisos

- El historial anterior al 01/10 04:00 ya fue borrado por la versión anterior;
  no se puede recuperar desde la app.
- «Ventas cerradas» del panel depende del aviso del CRM con código: sin código
  quedará en 0.
- En Meta/TikTok, las campañas deben optimizar por **Cliente potencial** (Meta)
  / **Submit form** (TikTok).
