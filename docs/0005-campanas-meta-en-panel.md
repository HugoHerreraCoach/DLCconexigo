# 0005 — Campañas de Meta en el panel (reemplaza la tarjeta del píxel de Meta)

**Fecha:** 2026-09-24

## Qué se hizo

En `/panel`, sección "Lo que reportan las plataformas", la tarjeta **"Píxel de
Meta"** se reemplazó por **"Campañas de Meta"**: gasto, resultados y costo por
contacto de cada campaña de Finca Algarrobo, leídos de Meta Ads.

| Bloque | Contenido |
| --- | --- |
| Cifras | Gasto · Formularios de Meta · Conversaciones (WhatsApp/Messenger) · Visitas a la web · Costo por contacto |
| Tabla | Por campaña: estado (Activa/Pausada…), gasto, formularios, conversaciones, visitas web, costo por contacto. Ordenada por gasto |

Usa el mismo selector de período del panel (Hoy / 7 / 30 / 90 días), con días
en hora de Lima (la cuenta de Meta también está en `America/Lima`, moneda PEN).
La tarjeta del píxel de TikTok queda igual (pendiente de token).

## Por qué

- La tarjeta del píxel llamaba a `/{pixel}/stats`, que con la app "Grupo DLLC"
  responde `(#100) Permission Denied` para los tres píxeles de la cuenta, aunque
  el usuario del sistema `panel-dlc` tiene el píxel asignado con permisos
  completos (ver [0003](0003-panel-de-medicion.md), avance Meta). Además solo
  repetía lo que ya cuenta el registro propio.
- El mismo token **sí** lee `insights` de la cuenta publicitaria, y eso aporta
  lo que el registro propio no puede saber: **cuánto se gastó y cuánto costó
  cada contacto**.
- Hallazgo: las campañas de Finca Algarrobo son de **formulario instantáneo**
  (`ON_AD`) y **clic a WhatsApp**; ninguna manda tráfico a la landing (Visitas a
  la web = 0). Por eso el registro propio no ve tráfico de Meta hoy.

## Cómo se calcula

`GET graph.facebook.com/v26.0/act_1107857613612617/insights?level=campaign&time_range={since,until}&fields=campaign_id,campaign_name,spend,actions`
+ `/campaigns?fields=effective_status` (estado) + `?fields=currency` (moneda).
Caché 5 min.

| Columna | `action_type` de Meta |
| --- | --- |
| Formularios | `lead` (formularios instantáneos + leads del píxel) |
| Conversaciones | `onsite_conversion.messaging_conversation_started_7d` |
| Visitas web | `landing_page_view` |
| Costo por contacto | gasto / (formularios + conversaciones) |

Filtro: solo campañas cuyo nombre contiene **`ALGARROBO`** (la cuenta tiene
otras, p. ej. "VT-PERSONAL", "AYMAR…"). Cuenta y filtro son constantes en
`src/server/plataformas.ts` (`META_CUENTA`, `META_FILTRO`), no en `sitio.ts`,
para no mandarlos al navegador.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/server/plataformas.ts` | `estadisticasMeta` (píxel) → `campanasMeta` (insights por campaña); tipos `FilaCampanaMeta`, `ResultadoCampanasMeta`; `Plataforma` queda solo para TikTok |
| `src/app/panel/page.tsx` | Llama a `campanasMeta` y pasa la prop `meta` |
| `src/views/panel/PanelView.tsx` | Componentes `CampanasMeta`, `Cifra`, `ErrorApi` (el error se comparte con la tarjeta de TikTok); se quitan los pasos del píxel de Meta |

Variables: la misma `META_ACCESS_TOKEN` (usuario del sistema `panel-dlc`, app
"Grupo DLLC", no caduca, `ads_read` + `business_management`). No hay variables
nuevas.

## Cómo se verificó

- `pnpm typecheck`, `pnpm lint`, `pnpm build` sin errores.
- Panel en local (`pnpm start` con `.env.local`) en Brave, período 30 días
  (2026-08-26 → 2026-09-24): 6 campañas de Finca Algarrobo, gasto S/ 2,786.47,
  146 formularios, 269 conversaciones, 0 visitas web, S/ 6.71 por contacto.
  Estados correctos (2 activas, 4 pausadas). "VT-PERSONAL" excluida por el filtro.
- Celular (390 px): cifras en 2 columnas, tabla con scroll dentro de su tarjeta,
  sin scroll horizontal de la página.

## Pendientes

- Cargar `META_ACCESS_TOKEN` en Vercel (además de `DATABASE_URL` y
  `PANEL_PASSWORD`) y redeploy.
- Para probar la landing con Meta: crear una campaña con destino al sitio web
  (objetivo Clientes potenciales o Tráfico → sitio web
  `https://grupodlc.conexigo.com/?utm_source=facebook&utm_campaign=<nombre>`,
  píxel "Finca campoora" 24878647091813468, evento Lead). Entonces "Visitas web"
  y el registro propio empiezan a mostrar tráfico de Meta.
- Si se renombran campañas sin "ALGARROBO", no aparecerán: ajustar `META_FILTRO`.
