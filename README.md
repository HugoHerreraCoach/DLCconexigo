# Grupo DLC — Landing Finca Algarrobo

Landing de venta de lotes campestres (Chiclayo). Stack de Conexigo:
Next.js 16 · React 19 · Tailwind CSS 4 · Framer Motion · lucide-react · pnpm 9.

Diseño v2: dirección oscura y elegante (UI/UX Pro Max) con la paleta de marca
DLC — negro, blanco y amarillo `#FDB90C` como acento.

## Uso

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build && pnpm start
pnpm lint && pnpm typecheck
```

## Secciones

| Sección | Archivo | Interacción |
| --- | --- | --- |
| Header flotante con blur | `components/Header.tsx` | Se oscurece al hacer scroll, menú móvil animado |
| Hero + buscador | `Hero.tsx`, `Buscador.tsx` | Entrada escalonada; "Buscar mi lote" precarga el formulario |
| Proyecto + espacios | `Proyecto.tsx`, `PlanoMaestro.tsx` | Ficha del proyecto, plano animado, grid con zoom en hover |
| Por qué DLC | `PorQueDLC.tsx`, `Contador.tsx` | Pestañas (ubicación, financiamiento, papeles) y contadores |
| Testimonios | `Testimonios.tsx` | Carrusel: flechas, puntos, arrastre, autoplay con pausa |
| Contacto | `Contacto.tsx` | Validación en línea; botón animado; abre WhatsApp con el mensaje |
| Footer | `Footer.tsx` | Enlaces, contacto, volver arriba |

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| WhatsApp, precios, plazos, dirección | `src/config/sitio.ts` |
| Fotos, opciones del buscador, espacios, testimonios | `src/config/contenido.ts` |
| Mensajes pre-escritos de cada botón | `src/shared/lib/whatsapp.ts` |
| Colores y tipografías | `src/app/globals.css` (`@theme`) |

Variables de entorno opcionales: `NEXT_PUBLIC_WHATSAPP` (ej. `51987654321`) y
`NEXT_PUBLIC_SITE_URL`.

La versión 1 (diseño claro) quedó respaldada en `respaldo-landing-v1.tgz`
(`tar -xzf respaldo-landing-v1.tgz` para restaurarla).

## Pendientes antes de publicar

- [ ] **Número de WhatsApp real de DLC** (hoy es un placeholder `51900000000`).
- [ ] Confirmar plazo: la ficha dice **24 meses**; el doc de público objetivo
      dice 36 meses y cuota desde S/ 999. La web usa la ficha.
- [ ] **Testimonios reales** (hoy son ilustrativos y así se indica en la página).
- [ ] Fotos / drone / plano de lotización reales (hoy: fotos referenciales de
      Unsplash y un esquema ilustrado).
- [ ] Enlaces de Privacidad y Libro de Reclamaciones virtual.
- [ ] Dominio definitivo.
