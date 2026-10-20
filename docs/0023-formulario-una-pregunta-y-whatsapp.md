# 0023 — Formulario de una sola pregunta que termina en WhatsApp

**Fecha:** 2026-10-20 · **Rama:** `Jheferson`

## Qué se pidió

> «Serán nada más una pregunta con dos opciones, la pregunta es "¿Con cuánto inicial te gustaría
> empezar?" y las opciones serían: - Desde S/.5 mil y la otra opción: Más de S/. 10,000. En el campo de
> teléfono cambia en vez de Tu número de celular* coloca:Tu número de whatsapp* y que esté marcada la
> opción de: Desde S/.5 mil por defecto cuando se entre o recargue a la página. Estos campos también
> aplícalos al botón flotante de whatsapp de Asesor en línea»
>
> «[…] Primero el flujo ya no terminará ahí, vamos a cambiar al formato que se manejaba anteriormente
> cuando el botón redirigía por mensaje a Whatsapp, ahí va a terminar el flujo, pero se seguiran
> guardando los registros en Google Sheets […] desde el CRM Conexigo empezaríamos a enviarles una
> plantilla pero solamente a esos que no llegaron a enviar el mensaje a Whatsapp, y el evento se va a
> seguir registrando cuando se completen los registros en google sheets»

Durante el cambio: «Cambié el número al cual le llegan los mensajes tenlo en cuenta» (es 0022: el número
pasó a 965 121 865).

## Cómo estaba (0017, 0018 y 0021)

- El formulario del inicio y el chat «Asesor en línea» pedían nombre, «Tu número de celular*», «¿Con
  cuánto cuentas de inicial?» (3 opciones) y «¿Cuándo quieres comprar?» (3 opciones), sin ninguna
  opción marcada.
- Al enviar: fila en la hoja → `CompleteRegistration` a Meta y TikTok (0021) → «¡Listo! Un asesor te
  contactará pronto». No abría WhatsApp.

## Qué se hizo

### Campos (los dos formularios)

- Una sola pregunta, **«¿Con cuánto inicial te gustaría empezar?»**, con **«Desde S/.5 mil»** y **«Más
  de S/. 10,000»**, escritas tal como se pidieron. La primera sale marcada al entrar o recargar
  (`INICIAL_POR_DEFECTO`). Siempre hay una marcada, así que ya no se valida.
- Se quita «¿Cuándo quieres comprar?».
- El teléfono dice **«Tu número de whatsapp*»**. En el chat su nombre accesible es «Número de
  WhatsApp», y el aviso de error dice «Escribe un número de WhatsApp de 9 dígitos que empiece con 9.».
- En el formulario del inicio, las dos opciones van en dos columnas (antes eran tres).

### Flujo

1. Se validan el nombre y el número.
2. `/api/formulario` agrega la fila a la hoja, como hasta ahora, en la pestaña según la fuente.
3. Con la fila confirmada se envía `CompleteRegistration` a Meta y TikTok, como hasta ahora (0021).
4. **Nuevo:** 800 ms después se abre WhatsApp (`terminarRegistro()` en `useRegistro.ts`) con este
   mensaje:

   ```
   Hola, quiero más información del proyecto Finca Algarrobo. Inicial: Desde S/.5 mil. Mi nombre es: Ana Pérez
   ```

   - Es el formato del formulario antes del 2026-10-17 (`MENSAJES.general` + «Mi nombre es: …»), con
     la inicial agregada para que el asesor llegue con contexto. El CRM lo reconoce como plantilla
     `general` y saca el nombre (`plantillaDe` y `nombreDe`).
   - Desde 0025 el mensaje sale con la marca «L - » delante.
   - Va al número de `SITIO.whatsapp`: desde 0022, **965 121 865**.
   - Se abre igual que antes (`abrirWhatsApp()`): en celular la misma pestaña navega a `wa.me` y abre
     la app. En escritorio se abre otra pestaña, y si el navegador la bloquea, la misma.
   - Los 800 ms (`ESPERA_WHATSAPP_MS`) son el margen para que los píxeles despachen la conversión
     antes de salir de la página.
   - El botón dice «¡Listo! Abriendo WhatsApp…». Debajo aparece «¿No se abrió WhatsApp? Ábrelo aquí»,
     un enlace al mismo chat por si el navegador no lo abrió solo.
5. Si la persona no envía el mensaje, igual quedó en la hoja, y la conversión ya se envió.

### Servidor

- `/api/formulario` ya no pide `compra`; si llega, se ignora. La columna F (TIEMPO DE COMPRA) queda
  vacía en las filas de la landing; sigue siendo del formulario instantáneo de TikTok. `eventos.datos`
  guarda `{ inicial }`.
- Acepta también las tres opciones de 0017 (`INICIALES_ANTERIORES`). Así no se pierden los registros de
  pestañas abiertas antes de publicar, que todavía mandan esas opciones. **Quitar unos días después de
  publicar.**

### Decisiones

- **No se registra un evento propio al abrir WhatsApp.** La fila `lead` que guarda `/api/formulario`
  ya tiene la huella del celular, y `POST /api/whatsapp/mensaje` (el aviso del CRM) empareja primero por
  esa huella. Un segundo evento con el mismo celular volvería ambigua esa búsqueda
  (`candidatos_telefono_ambiguos`).
- El panel no cambia. En la columna «Compra / interés», los registros nuevos muestran «—».
- Los demás botones de WhatsApp de la página no cambian y siguen sin enviar conversión.

## Para el CRM: saber quién no envió el mensaje

El CRM tiene dos formas de saber quién escribió:

- Comparar el número de cada conversación nueva con la columna NUMERO de la hoja (`+51 9XX XXX XXX`).
  Para eso el campo ahora pide el número **de WhatsApp**.
- Avisar con `POST /api/whatsapp/mensaje` incluyendo `telefono_huella`: la landing marca `recibido_en`
  en la fila `lead` de ese registro. Los registros sin mensaje son los que se quedan sin `recibido_en`.
  Hoy no hay un endpoint que los liste. Si el CRM lo necesita, se agrega.

El mensaje empieza siempre con «Hola, quiero más información del proyecto Finca Algarrobo.» y termina
con «Mi nombre es: <nombre>». Desde 0025, delante de todo va la marca «L - ».

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/config/contenido.ts` | `PREGUNTAS` con una sola pregunta; `INICIALES` = las dos opciones; `INICIAL_POR_DEFECTO`. Se quitan `TIEMPOS_COMPRA` y `TiempoCompra`. |
| `src/views/home/components/useRegistro.ts` | Campos nombre, número e inicial (marcada de entrada); `terminarRegistro()`: conversión y, 800 ms después, WhatsApp; devuelve el enlace (`whatsapp`). |
| `src/views/home/components/FormularioContacto.tsx` | Una pregunta en dos columnas; «Tu número de whatsapp*»; «¡Listo! Abriendo WhatsApp…» y enlace de respaldo. |
| `src/views/home/components/WhatsAppFlotante.tsx` | Lo mismo en el chat «Asesor en línea». |
| `src/shared/lib/whatsapp.ts` | `mensajeRegistro()`. |
| `src/shared/lib/formulario.ts` | `DatosFormulario` sin `compra`. |
| `src/app/api/formulario/route.ts` | Sin `compra`; acepta las opciones de 0017 por un tiempo; `datos: { inicial }`. |
| `src/server/hoja-calculo.ts` | `LeadHoja` sin `compra`; TIEMPO DE COMPRA vacía. |
| `test/formulario.spec.ts` | Pruebas al día y 4 nuevas (ver abajo). |

## Cómo se verificó

- `npx tsc --noEmit`: sin errores. `eslint` sobre los archivos tocados: sin avisos.
- `npx vitest run`: **46 pruebas, 4 archivos, todo verde**. Las 4 nuevas comprueban:
  - la pregunta, las dos opciones y la marcada de entrada;
  - el texto del mensaje, reconocido como plantilla `general` y con el nombre;
  - el orden: la conversión sale primero, la página sigue en la landing, y a los 800 ms navega a
    `https://wa.me/…` con ese mensaje (en celular, sin abrir otra ventana);
  - el servidor acepta las dos opciones nuevas y las de 0017, ignora `compra` y deja TIEMPO DE COMPRA
    vacía.
- `next build`: compila sin errores.
- **Prueba en el navegador** (Brave aislado, sobre `next start` local con la base de datos apuntando a
  una dirección inexistente). Los píxeles se reemplazaron por grabadoras y la respuesta de
  `/api/formulario` se simuló, así que no se escribió en la hoja ni se envió nada a Meta, TikTok ni la
  base:
  - Formulario del inicio: una pregunta, «Desde S/.5 mil» marcada y «Tu número de whatsapp*». Al
    enviarlo, el cuerpo lleva `inicial: "Desde S/.5 mil"` y no lleva `compra`. 40 ms después sale
    `CompleteRegistration` a Meta y TikTok con el id del registro, y 816 ms después se abre
    `wa.me/51965121865` con «Hola, quiero más información del proyecto Finca Algarrobo. Inicial: Desde
    S/.5 mil. Mi nombre es: Prueba Claude 0023».
  - Chat «Asesor en línea», eligiendo «Más de S/. 10,000»: los mismos pasos (806 ms hasta WhatsApp),
    con `origen: chat-flotante-registro` y esa opción en el mensaje.
  - Los botones muestran «¡Listo! Abriendo WhatsApp…». «Ábrelo aquí» abre el mismo chat y no manda
    nada a `/api/eventos`.
  - Al recargar, vuelve a salir marcada «Desde S/.5 mil». A ancho de celular las dos opciones caben
    lado a lado.
- El botón del formulario del inicio dice «Reclama tu descuento por WhatsApp». Eso es de 0024, hecho
  en paralelo; los dos cambios conviven en `FormularioContacto.tsx` sin pisarse.

## Pendientes (para el dueño)

1. **Publicar** (merge a `main` y despliegue) junto con 0020, 0021 y 0022, que también están en
   `Jheferson`. Hasta entonces producción sigue con el formulario anterior.
2. Después de publicar, un registro de prueba con «prueba» en el nombre, desde el celular. Debe llegar
   la fila a la hoja (columna F vacía), `CompleteRegistration` en «Probar eventos» de Meta y TikTok, y
   abrirse WhatsApp con el 965 121 865 y el mensaje. Después, borrar la fila.
3. Quitar `INICIALES_ANTERIORES` de `/api/formulario` unos días después de publicar.
4. **CRM ConexiGO:** armar el envío de la plantilla a quienes no escribieron (ver «Para el CRM»). Es
   trabajo del CRM, no de la landing.
