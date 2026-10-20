# 0024 — Botón del formulario: «Reclama tu descuento por WhatsApp»

**Fecha:** 2026-10-20 · **Rama:** `Jheferson`

## Qué se pidió

> «Quiero que cammbies el nombre del botón del formulario, en vez que diga Registrarme, cambia el nombre
> por Reclama tu descuento por Whatsapp»

## Qué se hizo

En el formulario del inicio (`FormularioContacto`), el botón de envío dice ahora **«Reclama tu descuento
por WhatsApp»** en lugar de «Registrarme». Se escribe «WhatsApp» como en el resto de la página. Se
muestra en mayúsculas, como antes. Si el envío falla, sigue diciendo «Intentar de nuevo».

### Ajuste de diseño para que quepa

El botón mide 56 px de alto y el texto nuevo es tres veces más largo. En un celular de 360 px de ancho se
partía en **3 líneas y se salía del botón**. Ahora:

- en celular el espacio entre letras es normal (`tracking-normal`; desde `sm`, `tracking-wide` como
  antes), el interlineado es más corto (`leading-tight`) y el texto va centrado;
- el ícono de la izquierda (`UserPlus`) se oculta en celular (`hidden sm:block`). La flecha de la
  derecha se mantiene.

Medido en el navegador:

| Ancho | Líneas | ¿Cabe en el botón? | Ícono izquierdo |
| --- | --- | --- | --- |
| 360 px (celular) | 2 | Sí (35 px de 56) | Oculto |
| 640 px | 1 | Sí | Visible |
| 1280 px (escritorio) | 2 | Sí (40 px de 56) | Visible |

## Qué no se tocó

Otros botones siguen diciendo «Registrarme»: los del menú (`Header`), «El proyecto» (`Proyecto`) y el
pie (`Footer`), que llevan al formulario. También el botón «Registrarme ahora» del chat «Asesor en
línea» (`WhatsAppFlotante`). Se pidió solo el del formulario.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/views/home/components/FormularioContacto.tsx` | Texto del botón; clases del texto (`text-center leading-tight tracking-normal sm:tracking-wide`); `UserPlus` oculto en celular. |

Ese archivo tenía además cambios sin confirmar de otro trabajo en curso (0023: formulario de una pregunta
que termina en WhatsApp). **El commit lleva solo las líneas del botón**, aplicadas sobre la versión
confirmada. Lo demás sigue en el disco, sin confirmar, para quien lo está haciendo.

## Cómo se verificó

- Landing en local (`next dev`, puerto 3199) con los píxeles desactivados
  (`NEXT_PUBLIC_META_PIXEL_ID=""`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID=""`): no se envió ningún evento.
  Capturas y medidas en Chrome a 360, 640 y 1280 px (tabla de arriba). Sin desplazamiento horizontal.
- `npx vitest run`: 46 pruebas, todo verde. `npx tsc --noEmit` y `eslint` del archivo: sin errores.

## Pendientes

- **Publicar** (merge a `main` y despliegue).
- Si se quiere el mismo texto en los botones «Registrarme» del menú, «El proyecto», el pie y el chat,
  hay que pedirlo.
