# 0017 — Preguntas de inicial y de compra en el formulario y el chat; botones «Registrarme»

**Fecha:** 2026-10-17 · **Rama:** `Jheferson`

## Qué se pidió

> «Cambia el nombre de los botones que cambiaste el nombre, solamente por registrarse.» Luego se
> corrigió: «no era registrarse era Registrarme».
>
> En el formulario, reemplazar «Lo quiero para» (Invertir / Casa de campo) e «Inicial estimada»
> (4 opciones) por:
> - ¿Con cuánto cuentas de inicial? → S/ 5,000 a S/ 10,000 · Más de S/ 10,000 · Pago al contado
> - ¿Cuándo quieres comprar? → Este mes · De 1 a 3 meses · Más adelante
>
> «Esas opciones también irá en el botón flotante», en lugar de «Agendar visita este fin de semana»
> y «Quiero que me contacte un asesor ahora mismo». «Y quita el cuadro para ingresar texto».

## Qué se hizo

### 1. Botones → «Registrarme»

Los cuatro botones a los que se les había cambiado el nombre ahora dicen **«Registrarme»**, con el
mismo ícono de alta de usuario (`UserPlus`). Todos llevan al formulario.

| Dónde | Nombre anterior (0015) | Ahora |
| --- | --- | --- |
| Menú superior (`Header.tsx`) | Reclamar mi bono | Registrarme |
| El proyecto, botón principal (`Proyecto.tsx`) | Separa tu lote hoy | Registrarme |
| Pie de página, Contacto (`Footer.tsx`) | Habla con un asesor hoy | Registrarme |
| Botón de envío del formulario (`FormularioContacto.tsx`) | Reclamar mi regalo | Registrarme («Intentar de nuevo» si falla) |

### 2. Formulario del hero

- Las dos preguntas nuevas sustituyen a «Lo quiero para» e «Inicial estimada». Los textos y las opciones
  viven en `src/config/contenido.ts` (`PREGUNTAS`, `INICIALES`, `TIEMPOS_COMPRA`) y los comparten el
  formulario, el chat y la validación del servidor.
- Cada pregunta muestra tres opciones en una fila (`grid-cols-3`). Si el texto no cabe, pasa a dos
  líneas y no se corta.
- **No hay opción marcada de entrada:** ahora hay que elegir una en cada pregunta («Elige con cuánto cuentas
  de inicial.» / «Elige cuándo quieres comprar.»). Antes venía marcada la primera; con «Este mes» marcado
  por defecto, la hoja se llenaría de compradores «calientes» que nadie eligió.
- **Hoja de cálculo:** la columna **F «TIEMPO DE COMPRA»** ahora se llena, con las mismas preguntas que
  el formulario de TikTok. Se elimina la columna «LO QUIERO PARA». Las columnas de la landing quedan
  **K `ORIGEN`, L `FUENTE`, M `ID REGISTRO`** (antes K–N).
- `/api/formulario` valida `inicial ∈ INICIALES` y `compra ∈ TIEMPOS_COMPRA`. Las opciones antiguas
  («Desde S/ 5,000», etc.) se rechazan con 400.
- El panel guarda `datos = { inicial, compra }` y el píxel recibe esos mismos dos parámetros.

### 3. Chat flotante («¡Hablemos!»)

- Se quitaron las dos opciones rápidas y el cuadro «Escribe tu mensaje aquí…».
- Ahora muestra las mismas dos preguntas como píldoras (una elección por pregunta) y el botón
  **«Continuar en WhatsApp»**, que se activa al responder las dos.
- Ese botón abre WhatsApp con las respuestas ya escritas:
  «Hola, quiero información para comprar un lote en Finca Algarrobo. Inicial: S/ 5,000 a S/ 10,000.
  Quiero comprar: Este mes.» Si la persona dio su nombre en el formulario, se agrega «Mi nombre es: …».
- Se mantienen el saludo de la asesora, «Opciones rápidas para hablar por WhatsApp:» y «⚡ Te
  atenderemos directamente por WhatsApp sin compromiso».
- Medición: nuevo rastro `chat-flotante-preguntas` («Chat flotante · inicial y cuándo comprar»). Registra
  el `contacto` y envía el mismo **«Cliente potencial»** (Meta `Lead` / TikTok `SubmitForm`, ver 0016) con
  `inicial` y `compra` como parámetros. Los rastros del chat anterior se conservan por el histórico.
- Nueva plantilla `MENSAJES.chat` (`src/shared/lib/whatsapp.ts`) para que el CRM reconozca el mensaje
  con `plantillaDe()`, aunque lleve las respuestas y el nombre.

### 4. Panel

La tabla «Últimos Prospectos Registrados» tenía la columna «Interés», que mostraba `motivo` y, si
faltaba, inventaba «Casa de campo». Ahora la columna se llama **«Compra / interés»**: muestra
`compra` en los registros nuevos, `motivo` en los antiguos y «—» si no hay dato.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/config/contenido.ts` | `PREGUNTAS`, `INICIALES` (3 opciones nuevas), `TIEMPOS_COMPRA` y sus tipos. Se quitan `MOTIVOS`, `Consulta` y `CONSULTA_INICIAL`, además de `UBICACIONES_LOTE` y `SIGUIENTE_PASO`, que no usaba nadie. |
| `src/views/home/components/FormularioContacto.tsx` | Componente `Opciones` reutilizable; preguntas nuevas, obligatorias y sin preselección; botón «Registrarme». |
| `src/views/home/components/WhatsAppFlotante.tsx` | `PreguntaChat`, las dos preguntas y «Continuar en WhatsApp»; sin opciones rápidas ni cuadro de texto. |
| `src/views/home/components/Header.tsx`, `Proyecto.tsx`, `Footer.tsx` | «Registrarme» con `UserPlus`. |
| `src/server/hoja-calculo.ts` | `compra` → TIEMPO DE COMPRA; sin «LO QUIERO PARA»; columnas K–M. |
| `src/app/api/formulario/route.ts` | Valida `inicial` y `compra`; guarda `{ inicial, compra }`. |
| `src/shared/lib/formulario.ts` | `DatosFormulario` con `compra` en lugar de `motivo`. |
| `src/shared/lib/whatsapp.ts` | `MENSAJES.chat` y `mensajeChat()`. |
| `src/shared/lib/plantillas.ts` | Comentario actualizado. |
| `src/shared/lib/pixeles.ts` | `chat-flotante-preguntas` en `CHAT_FLOTANTE`; `rastrearContacto(…, datos)` pasa los datos al píxel. |
| `src/config/rastros.ts` | Alta de `chat-flotante-preguntas`; los rastros del chat anterior quedan marcados como retirados. |
| `src/views/panel/PanelView.tsx` | Columna «Compra / interés» sin el valor inventado. |
| `test/formulario.spec.ts` | Pruebas actualizadas a las preguntas nuevas, más 2 pruebas del chat nuevo. |

## Cómo se verificó

- `pnpm test`: **37/37** pruebas. Entre ellas:
  - las opciones antiguas y la falta de `compra` responden 400;
  - la fila lleva INICIAL y TIEMPO DE COMPRA, y las columnas K–M son ORIGEN, FUENTE e ID REGISTRO;
  - el mensaje del chat sale tal cual y `plantillaDe` lo reconoce como `chat` aunque lleve nombre;
  - el chat envía `Lead` con `inicial`, `compra` y el `intencion_id`.
- `pnpm typecheck` y `pnpm lint`: sin errores ni advertencias.
- Servidor local con `curl` al HTML: aparecen «Registrarme» (4 veces), las dos preguntas y sus seis
  opciones. No quedan «Lo quiero para», «Inicial estimada» ni los nombres anteriores de los botones. El
  chat no se pudo ver así porque solo se dibuja al abrirlo.
- No se probó en el navegador: la página local manda eventos al píxel y a la base reales.

## Pendientes

- **Encabezados de la hoja (dueño):** K1 `ORIGEN`, L1 `FUENTE`, M1 `ID REGISTRO`. Reemplazan a los K–N de 0015.
- Las opciones de la landing están escritas como pidió el usuario y no coinciden letra por letra con las que deja
  TikTok en la hoja: «S/ 5,000 a S/ 10,000» frente a «S/5,000 a S/10,000», «Más de S/ 10,000» frente a «Más de
  S/10,000» y «De 1 a 3 meses» frente a «En 1 a 3 meses». Si la hoja se filtra o se procesa por esos textos,
  conviene unificarlos.
- Revisar en un navegador el chat abierto en celular (las píldoras deberían ocupar unas dos filas por pregunta).
