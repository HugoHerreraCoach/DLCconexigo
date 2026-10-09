# 0009 — Cambio del píxel de Meta de la landing

**Fecha:** 2026-09-30

## Qué se hizo

El usuario indicó que el píxel correcto para registrar el tráfico de la página
es **Pixel_DLC-CONEXIPEMA_FINCAALGARROBO** (`1409214864656514`, del negocio "DLC
inmobiliaria", creado el 2026-09-23) y no **Finca campoora**
(`24878647091813468`), que era el instalado desde [0002](0002-pixeles-meta-tiktok.md).
Se reemplazó el antiguo por el nuevo.

- Único cambio de código: `src/config/sitio.ts` → `SITIO.pixeles.meta` =
  `"1409214864656514"`. Lo usan el script base y el `<noscript>` de
  `src/shared/ui/Pixeles.tsx` (el código base que entrega Meta es idéntico al
  que ya tenía la landing; solo cambia el ID).
- Los eventos no cambian: `PageView`, `Contact` (WhatsApp) y `Lead`
  (formulario), con sus parámetros (ver `src/shared/lib/pixeles.ts`).
- El píxel de TikTok (`DAQ48QRC77U77GG14PMG`) no cambia.

## Por qué

En el Administrador de anuncios el usuario elegía
Pixel_DLC-CONEXIPEMA_FINCAALGARROBO y aparecía como "inactivo" con todos sus
eventos inactivos, porque nunca había recibido datos: el que estaba en la página
era Finca campoora.

## Efectos a tener en cuenta

- El historial de eventos queda en "Finca campoora"; el nuevo píxel empieza de
  cero (tardará unos minutos en pasar a "Activo" y los eventos "Cliente
  potencial"/"Contactar" se activan a medida que ocurran).
- Las campañas que optimizaban con "Finca campoora" deben cambiarse al nuevo
  conjunto de datos.
- Si en Vercel existe `NEXT_PUBLIC_META_PIXEL_ID`, tiene prioridad sobre el
  código: debe borrarse o poner `1409214864656514`.
- La tarjeta "Campañas de Meta" del panel no depende del píxel (lee la cuenta
  publicitaria), no cambia.

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- El build contiene `1409214864656514` y no contiene el ID antiguo (solo aparece
  en los source maps, dentro del comentario del cambio).
- Publicado el 2026-09-30 (`dfcb3da..6fc5613`). En producción el HTML contiene
  `1409214864656514` y ya no el antiguo (confirma que Vercel no lo sobrescribe
  con `NEXT_PUBLIC_META_PIXEL_ID`); en Brave la cola de `fbq` muestra
  `init 1409214864656514` + `track PageView`.
- Límite: el escudo de Brave bloqueó `fbevents.js`, así que la recepción en Meta
  no se vio desde aquí; la API de Meta seguía mostrando "nunca" para el nuevo
  píxel justo después (el dato llega con retraso). Confirmar en el
  Administrador de eventos tras una visita real sin bloqueador.
