# 0025 — Marca «L - » en los mensajes y botones de antes en el menú y en «El proyecto»

**Fecha:** 2026-10-20 · **Rama:** `Jheferson`

## Qué se pidió

> «El mensaje predeterminado que llegará de la landing al CRM será de la siguiente forma:
> L - <<Mensaje predeterminado>>
> Para saber que llegaron de la landing
> Otros cambios son que //*[@id="proyecto"]/div/article/div[2]/div[2]/a[1] siga mostrando lo de antes de
> Agenda tu visita con el simbolo de Whatsapp
> Y el /html/body/header/div/nav/div/a en vez de decir Registrarme, diga lo de antes Reclamar mi bono con
> el ícono de regalo antes»

## Qué se hizo

### Marca «L - » en el mensaje

- `enlaceWhatsApp()` (`src/shared/lib/whatsapp.ts`) agrega **`L - `** al inicio del mensaje, una sola
  vez (constante `MARCA_LANDING`). Es el único lugar que arma los enlaces `wa.me` de la landing, así que
  cualquier botón de WhatsApp que se agregue también la llevará. Hoy el único mensaje que sale de la
  landing es el del registro (0023):

  ```
  L - Hola, quiero más información del proyecto Finca Algarrobo. Inicial: Desde S/.5 mil. Mi nombre es: Ana Pérez
  ```

- `plantillaDe()` (`src/shared/lib/plantillas.ts`) ignora la marca al reconocer el mensaje. Acepta
  `L - ` y también `L-`, por si se pierden los espacios. Así, `/api/whatsapp/mensaje` (el aviso del CRM)
  sigue reconociendo la plantilla y el nombre.
- No es el código numerado de 0007 («L-1», «L-2»…): la marca no lleva número. `PATRON_REFERENCIA` (los
  avisos de códigos antiguos de `/api/whatsapp/recibido`) no cambia.

### Botones de antes

- **Menú superior** (`Header.tsx`, `/html/body/header/div/nav/div/a`): «Registrarme» → **«Reclamar mi
  bono»**, con el ícono de regalo (`Gift`) antes del texto, como en 0015. Sigue llevando al formulario
  (`#formulario`).
- **El proyecto** (`Proyecto.tsx`, `//*[@id="proyecto"]/div/article/div[2]/div[2]/a[1]`): «Registrarme»
  → **«Agenda tu visita»**, con el ícono de WhatsApp, como estaba antes del 2026-10-17. Sigue llevando
  al formulario, igual que entonces: desde el 2026-10-08 ese botón ya no abría WhatsApp directo. Ahora
  el formulario termina en WhatsApp (0023).
- Sin cambios: el botón del pie («Registrarme»), el del formulario («Reclama tu descuento por WhatsApp»,
  0024) y el del chat («Registrarme ahora»).

## Para el CRM

El primer mensaje de un contacto que viene de la landing empieza con «L - ». Para reconocerlo basta ver
si el texto empieza con «L - » (o con «L-»).

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/whatsapp.ts` | `MARCA_LANDING`; `enlaceWhatsApp()` la agrega al inicio, una sola vez; comentario sobre los códigos. |
| `src/shared/lib/plantillas.ts` | `plantillaDe()` ignora la marca del inicio. |
| `src/views/home/components/Header.tsx` | «Reclamar mi bono» con `Gift`. |
| `src/views/home/components/Proyecto.tsx` | «Agenda tu visita» con `IconoWhatsApp`. |
| `test/formulario.spec.ts` | El enlace del registro lleva la marca; 2 pruebas nuevas (ver abajo). |
| `docs/0023-formulario-una-pregunta-y-whatsapp.md` | Nota: el mensaje ahora empieza con «L - ». |

## Cómo se verificó

- `npx tsc --noEmit`: sin errores. `eslint` sobre los archivos tocados: sin avisos.
- `npx vitest run`: **48 pruebas, todo verde**. Las 2 nuevas comprueban:
  - la marca va al inicio una sola vez, también en el mensaje del registro;
  - con la marca se sigue reconociendo la plantilla y el nombre, incluso escrita «L-», y un texto
    cualquiera con la marca no se toma por plantilla.
- `next build`: compila sin errores.
- **En el navegador** (Brave aislado, `next start` local con la base de datos apuntando a una dirección
  inexistente, píxeles reemplazados por grabadoras y `/api/formulario` simulado):
  - `/html/body/header/div/nav/div/a` muestra «Reclamar mi bono», con el ícono de regalo antes del
    texto, y lleva a `#formulario`.
  - `//*[@id="proyecto"]/div/article/div[2]/div[2]/a[1]` muestra «Agenda tu visita», con el ícono de
    WhatsApp antes del texto, y lleva a `#formulario`.
  - Un registro simulado abre `wa.me/51965121865` con «L - Hola, quiero más información del proyecto
    Finca Algarrobo. Inicial: Desde S/.5 mil. Mi nombre es: Prueba Claude 0025».

## Pendientes (para el dueño)

1. **Publicar** junto con 0020–0024 (todo está en `Jheferson`).
2. **CRM ConexiGO:** usar la marca «L - » para reconocer los contactos que vienen de la landing.
