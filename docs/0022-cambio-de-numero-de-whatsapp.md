# 0022 — Cambio del número de WhatsApp de ventas a 965 121 865

**Fecha:** 2026-10-20 · **Rama:** `Jheferson`

## Qué se pidió

> «Cambia el número al cual le llegan los mensajes por 965121865»

## Cómo estaba

Todos los botones y enlaces de WhatsApp de la landing abren
`https://wa.me/<número>?text=…`, armado por `enlaceWhatsApp()` (`src/shared/lib/whatsapp.ts`) con
`SITIO.whatsapp` (`src/config/sitio.ts`). El número era **`51976330336`** (976 330 336).

`SITIO.whatsapp` toma primero la variable `NEXT_PUBLIC_WHATSAPP` y, si no existe, el valor escrito en el
código. En producción (`grupodlc.conexigo.com`, 2026-10-20) el paquete de JavaScript lleva
`51976330336`, el mismo valor del código. `.env.local` no define `NEXT_PUBLIC_WHATSAPP`.

## Qué se hizo

`src/config/sitio.ts`: el número pasa a **`51965121865`** (965 121 865, con el prefijo `51` de Perú). El
comentario guarda el número anterior y la fecha del cambio.

No hace falta tocar nada más:

- El número no aparece escrito como texto en ninguna sección de la página. Se buscó `976`,
  `976 330 336` y `976330336` en el código.
- Las pruebas no fijan el número.
- Las rutas `/api/whatsapp/*` no filtran por número de destino.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/config/sitio.ts` | `whatsapp`: `51976330336` → `51965121865`; comentario. |

## Cómo se verificó

- `npx vitest run`: 42 pruebas, todo verde. `npx tsc --noEmit`: sin errores.
- Lectura del sitio en producción: el número que usa hoy es el valor del código, así que el cambio llega
  a producción al publicar (si en Vercel no hay un `NEXT_PUBLIC_WHATSAPP` con el número viejo).

## Pendientes (para el dueño)

1. **Publicar** (merge a `main` y despliegue). Hasta entonces los botones siguen abriendo el 976 330 336.
2. **Vercel:** confirmar que **no** existe la variable `NEXT_PUBLIC_WHATSAPP` en Production. Si existe,
   cambiarla a `51965121865` o borrarla; si no, seguirá mandando al número viejo aunque el código cambie.
3. **CRM ConexiGO:** si el 965 121 865 no está conectado al CRM, los mensajes llegarán al teléfono pero
   el CRM no los verá, y el panel no podrá emparejarlos («Mensajes recibidos», 0013).
4. Tras publicar: abrir la landing, pulsar un botón de WhatsApp y comprobar que abre el chat con
   +51 965 121 865.
