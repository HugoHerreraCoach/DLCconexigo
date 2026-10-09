# 0008 — Galería de fotos y video recorrido en la landing

**Fecha:** 2026-09-25

## Qué se hizo

1. **Comprimí el video recorrido** que el usuario dejó en
   `recursos/Galeria/VIDEORECORRIDO.mp4` (1.27 GB, H.264 casi sin comprimir a
   ~273 Mbps, 1080p60, 39 s) con `ffmpeg` (instalado con `winget` porque no
   estaba disponible): 1280×720, 30 fps, CRF 26 + `-maxrate 5M -bufsize 10M`,
   audio AAC 128k, `+faststart`. Resultado: **22.2 MB** (~98% menos), calidad
   suficiente para web.
2. **Reemplacé todas las fotos stock de Unsplash** de la landing (hero +
   grid "Lo que vas a disfrutar") por los **renders 3D reales del proyecto**
   que el usuario subió a `recursos/Galeria/` (12 imágenes, cada una asignada
   por tema: hamacas, cancha de fútbol, básquet, juegos infantiles, parque
   con fuente, calle residencial, pórtico de ingreso).
3. **Agregué una sección nueva "Galería y video"** (`#galeria`, entre "El
   proyecto" y "Por qué DLC") con el video (click-to-play, sin autoplay) y
   un grid con los 5 renders que sobraban (bienvenida, vista aérea, gimnasio,
   básquet aéreo, fútbol aéreo).
4. Revisé la skill `ui-ux-pro-max` antes de diseñar el grid y el video:
   confirmó **click-to-play con `preload="none"`** en vez de autoplay (ahorro
   de datos, sin barrera de movimiento) y el uso de `next/image` con
   `sizes`/lazy loading que el sitio ya sigue.

## Por qué

El código ya anticipaba este cambio: el comentario de `contenido.ts` decía
literalmente *"Las FOTOS son referenciales (Unsplash): reemplazarlas por
fotos y drone del proyecto real en cuanto existan"*. El usuario entregó esas
fotos y el video; esta entrega los pone en producción.

## Cómo funciona

- Las fotos y el video viven en **`public/galeria/`** (assets estáticos que
  Next sirve directo) con nombres descriptivos, no los hashes originales.
- `next/image` optimiza las fotos locales igual que las remotas de Unsplash
  (resize + reencode on-demand): no hizo falta comprimirlas a mano.
- El `<video>` usa `controls preload="none" poster="/galeria/porton-ingreso.jpg"`:
  el navegador **no pide el archivo hasta que el usuario le da play**
  (verificado con la pestaña de red de Brave DevTools: 0 requests `media`
  antes del clic).
- El grid de fotos es un bento simple (CSS grid, primera imagen
  `col-span-2`, sin JS de masonry ni lightbox) para no sumar complejidad
  fuera de lo que ya usa el sitio.
- El CTA "Enviármelo por WhatsApp" del video reutiliza `MENSAJES.video`
  (ya existía, pensado para cuando el video aún no existía) y queda marcado
  con el nuevo id `galeria-video-whatsapp` en el catálogo de rastros.
- `recursos/Galeria/` (fuente original, incluido el .mp4 de 1.27 GB) se
  agregó a `.gitignore`, igual que `recursos/Info/` y
  `recursos/Publico Objetivo/`: es material fuente, no se versiona.
- Como ya no queda ninguna imagen remota, se quitó `images.remotePatterns`
  de `next.config.ts` (solo permitía `images.unsplash.com`).
- Las etiquetas "Imagen referencial" (hero y grid de espacios) pasaron a
  decir **"Render del proyecto"**: ya no son fotos stock genéricas, son
  renders 3D reales de Finca Algarrobo (pero siguen siendo renders, no fotos
  de obra construida, así que el disclaimer se mantiene).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `public/galeria/*` | **Nuevo.** 12 fotos + `video-recorrido.mp4` (22.2 MB) |
| `src/views/home/components/Galeria.tsx` | **Nuevo.** Sección "Galería y video" (video + grid de 5 fotos) |
| `src/config/contenido.ts` | `FOTO_HERO` y las 6 `imagen` de `ESPACIOS` → rutas locales; se quita el helper `foto()` de Unsplash |
| `src/views/home/HomeView.tsx` | Se agrega `<Galeria />` entre `<Proyecto />` y `<PorQueDLC />`; comentario del embudo actualizado |
| `src/config/sitio.ts` | `NAVEGACION`: nuevo ítem "Galería" (`#galeria`) |
| `src/config/rastros.ts` | Nueva entrada `galeria-video-whatsapp` |
| `src/views/home/components/Hero.tsx` | `alt` del fondo y etiqueta "Render del proyecto" |
| `src/views/home/components/Proyecto.tsx` | Etiqueta "Render del proyecto" en el grid de espacios |
| `next.config.ts` | Se quita `images.remotePatterns` (ya no hay imágenes remotas) |
| `.gitignore` | Se agrega `recursos/Galeria/` |

## Cómo se verificó

- `npm run typecheck`, `npm run lint` y `npm run build` sin errores.
- Probado en Brave (`localhost:3000`, servidor de desarrollo) a 1440×900 y
  390×844 (móvil):
  - Hero, grid de "Lo que vas a disfrutar" y la sección "Galería y video"
    muestran las fotos correctas, con el grid bento respondiendo bien en
    ambos anchos.
  - Video: 0 requests de red antes del clic (`preload="none"` funciona);
    al hacer play carga y reproduce (1280×720, confirmado con
    `video.videoWidth/videoHeight` y `readyState`).
  - Menú (`Galería` nuevo) hace scroll a la sección.

## Pendientes

- Subir a producción (este cambio queda en local, en `main`, sin commit
  todavía — a pedir por el usuario).
- El video no tiene subtítulos/captions (la skill de UI/UX lo marca como
  buena práctica de severidad media); no se generó transcripción porque el
  usuario no la pidió.
- El botón flotante de WhatsApp (`WhatsAppFlotante`, fijo en toda la página)
  tapa parcialmente el ícono de pantalla completa del video cuando está
  scrolleado a esa altura; es el mismo comportamiento del botón en el resto
  del sitio (flota sobre cualquier contenido), no algo nuevo de esta sección.
