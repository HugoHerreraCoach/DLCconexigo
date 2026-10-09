# 0002 — Píxeles de Meta y TikTok

**Fecha:** 2026-09-23 · **Commit:** `b07c890`

## Qué se hizo

Se instalaron el píxel de Meta (Facebook/Instagram) y el de TikTok para medir
la landing y optimizar campañas. Cada píxel solo se carga si tiene ID.

| Píxel | ID | Estado |
| --- | --- | --- |
| Meta | `24878647091813468` | **Activo** en producción |
| TikTok | `DAQ48QRC77U77GG14PMG` (`Pixel_DLC-CONEXIPEMA_FincaAlgarrobo`) | **Activo** en producción (commit `77dc361`) |

## Publicación

- Hosting: **Vercel**, conectado al repo de GitHub: cada push a `main` se
  publica solo en <https://grupodlc.conexigo.com/>.
- Publicado el 2026-09-23 (~16:45 hora Perú) con el commit `77dc361`. **El
  rastro de visitantes empieza desde ese momento**; las visitas anteriores no
  quedaron registradas.
- Verificado en el sitio real: `window.fbq` y `window.ttq` cargados y ambos
  scripts insertados. En Brave los bloquea el escudo (`ERR_BLOCKED_BY_CLIENT`),
  es normal: los visitantes con bloqueadores no se miden. Las URLs de ambos
  scripts responden 200.

## Eventos registrados

| Acción en la web | Meta | TikTok | Datos enviados |
| --- | --- | --- | --- |
| Carga de la página | `PageView` | `page` | — |
| Envío del formulario del hero | `Lead` | `SubmitForm` | motivo, inicial, ubicación del lote, siguiente paso |
| Clic en cualquier enlace de WhatsApp | `Contact` | `Contact` | `origen`: `visita`, `cuotas`, `ficha`, `video`, `documentos`, `general` |

Todos los eventos incluyen `content_name: "Finca Algarrobo"` y
`content_category: "Terrenos campestres"`. **No se envían nombre ni celular**
del visitante.

El campo `origen` sale del mensaje pre-escrito del enlace (`MENSAJES` en
`src/shared/lib/whatsapp.ts`), así se puede comparar qué botón convierte mejor
sin tocar cada componente.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/config/sitio.ts` | Nuevo `SITIO.pixeles` con los IDs (sobrescribibles con `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_TIKTOK_PIXEL_ID`) |
| `src/shared/ui/Pixeles.tsx` | **Nuevo.** Carga ambos scripts con `next/script` (`afterInteractive`) y escucha en el documento los clics a `wa.me` |
| `src/shared/lib/pixeles.ts` | **Nuevo.** `rastrearLead`, `rastrearContacto`, `origenDeEnlace`; no fallan si el píxel no cargó (bloqueadores) |
| `src/app/layout.tsx` | Renderiza `<Pixeles />` en el `body` |
| `src/views/home/components/FormularioContacto.tsx` | Llama a `rastrearLead` al enviar |

## Verificación

- `tsc --noEmit`, `eslint src` y `pnpm build`: sin errores.
- Prueba en Brave sobre el build de producción:
  - `fbevents.js` cargado y `PageView` enviado a `facebook.com/tr?id=24878647091813468` (HTTP 200).
  - Clics en enlaces de WhatsApp → `Contact` con `origen` correcto (`visita`, `ficha`).
- No probado: envío real del formulario (`Lead`) — validar con Meta Pixel Helper
  o el Administrador de eventos una vez publicado.

## Pendientes

- [x] ID del píxel de TikTok.
- [x] Publicar el cambio.
- [ ] Confirmar en Meta Events Manager y TikTok Events que llegan los eventos (visita sin bloqueador).
- [ ] Verificar el dominio en Meta Business y priorizar `Lead` en la configuración de eventos.
- [ ] Opcional: API de Conversiones (Meta) / Events API (TikTok) para no perder
      eventos por bloqueadores; requiere backend.
