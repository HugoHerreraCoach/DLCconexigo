# 0011 — Latencia del panel: cambio Meta ↔ TikTok instantáneo y servidor en São Paulo

**Fecha:** 2026-10-01

## Problema

En `/panel`, los botones «Meta Ads (Facebook / Instagram)» y «TikTok Ads»
tardaban en cambiar de uno a otro.

Diagnóstico:

1. Los botones eran `Link` a `/panel?p=…`: cada clic **recargaba toda la página
   en el servidor** (≈8 consultas a la base + llamadas a Meta + TikTok), aunque
   los datos de las dos pestañas ya estaban cargados.
2. El servidor de Vercel corría en **Washington (`iad1`)** y la base de Supabase
   está en **São Paulo (`sa-east-1`)**: cada consulta cruzaba el continente
   (cabecera `x-vercel-id: gru1::iad1::…`).
3. Medido en producción con `/api/conexigo/panel` (mismo trabajo que el panel):
   **≈2,2 s por carga** (3,7 s en frío).

## Qué se hizo

| Archivo | Cambio |
| --- | --- |
| `src/views/panel/ConmutadorPlataforma.tsx` | **Nuevo** (cliente): `PlataformaProvider`, `BotonPlataforma`, `VistaPlataforma`, `EnlacePeriodo`, `InputPlataforma`. La pestaña es estado del navegador; la URL se actualiza con `history.replaceState` (`?p=meta|tiktok`) |
| `src/views/panel/PanelView.tsx` | Los dos `Link` → `BotonPlataforma`; el ternario `plataforma === "meta" ? … : …` → dos `VistaPlataforma`; los presets de fechas → `EnlacePeriodo` (conservan la pestaña, **sin precarga**); el campo oculto `p` del filtro → `InputPlataforma`. Se quitan `urlPlataforma`, `urlPreset` y el import de `Link` |
| `vercel.json` | **Nuevo**: `"regions": ["gru1"]` — las funciones del sitio corren en São Paulo, junto a la base |

Por qué sin precarga en los presets: al cambiar de pestaña cambian sus `href`
y Next precargaba los 4 (Hoy/7/30/90), y cada precarga ejecuta en el servidor
todas las consultas del panel (base + Meta).

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint` (sin avisos), `pnpm build`.
- Local (Postgres en memoria + build de producción, Brave, sesión iniciada):
  - Meta → TikTok → Meta → TikTok: **5–10 ms** por cambio con la pestaña
    visible; la vista cambia, la URL pasa a `?p=tiktok` / `?p=meta`, **0
    recargas y 0 peticiones al servidor** (antes: 4 precargas por clic).
  - El enlace «7 días» queda `/panel?r=7&p=tiktok` tras elegir TikTok.
- Producción (publicado `4b3219e..17c0662`): `x-vercel-id: gru1::gru1::…`
  (antes `gru1::iad1`). `/api/conexigo/panel` con 7 días: **≈230 ms** por carga
  (antes ≈2,2 s); la primera tras el despliegue, en frío, 3,8 s.

## Notas

- Cambiar de **período** (Hoy/7/30/90 o fechas) sí vuelve a pedir datos al
  servidor: es necesario porque cambian los datos. Con el servidor en São Paulo
  esa carga también baja.
- `gru1` aplica a todo el sitio (incluido `/api/eventos`), que también habla con
  la misma base.
