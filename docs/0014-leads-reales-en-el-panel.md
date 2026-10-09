# 0014 — Leads reales en el panel (los clics van aparte)

**Fecha:** 2026-10-07

## Problema

El cliente veía cifras muy altas. Revisión del 2026-10-07:

- Las **visitas** están bien (unos 1,3 visitas por visitante; Meta da 2.154
  llegadas a la landing de C_04 y la landing registra unas 2.600).
- Los **leads estaban inflados**. La landing dispara `Lead` del píxel al hacer
  **clic** a WhatsApp (acuerdo de 0010), y el panel lo sumaba como si fuera un
  lead: `extraerLeadsFormularios` tomaba la acción `lead` /
  `offsite_conversion.fb_pixel_lead`. Además, «Total Leads» era
  `max(leads de Meta, clics de la web)`, es decir, también clics.

Datos del 01/10 al 07/10 (Meta API + base de la landing):

| Campaña | Gasto | `Lead` del píxel (clics) | Chats de anuncio | Mensajes reales desde la web |
| --- | --- | --- | --- | --- |
| C_04 (landing) | S/ 336,51 | 149 | 0 | 6 |
| C_N1 (WhatsApp) | S/ 307,64 | 0 | 30 | 0 |

C_04 mostraba unos S/ 2,26 por lead, pero eran clics.

## Cambio

**`src/server/plataformas.ts`**
- `extraerLeadsFormularios` solo cuenta formularios instantáneos de Meta
  (`onsite_conversion.lead_grouped`, `leadgen_grouped`).
- Nuevo `extraerClicsWhatsApp` (`offsite_conversion.fb_pixel_lead`) y campo
  `clicsWhatsApp` en campañas, anuncios y totales.
- `leadsTotales` sigue siendo `formularios + conversaciones`, pero ya no
  incluye clics.

**`src/views/panel/PanelView.tsx`**
- **Leads reales** = mensajes que llegaron desde la landing para cada
  campaña de Meta (`recibido_en`, confirmados por el CRM; `campana` = id de la
  campaña) + chats de anuncios de clic a WhatsApp + formularios instantáneos.
- **Coste por Lead** = inversión / leads reales, tanto en el total como en
  cada campaña.
- «Leads por API (Web)» pasa a **Clics a WhatsApp (Web)** y muestra cuántos
  cuenta Meta como «Lead».
- «Leads en CRM» pasa a **Mensajes desde la web**.
- La tarjeta de cada campaña muestra «Leads reales» y, aparte, los «clics a
  WhatsApp».
- En la tabla de anuncios, «Leads» pasa a «Chats / form.» y los clics a
  WhatsApp aparecen entre paréntesis. Los mensajes desde la web solo se saben
  por campaña, no por anuncio.

Con estos datos, el panel (C_N1 + C_04) muestra 36 leads reales (30 chats + 6
mensajes web) para S/ 644 de inversión, unos S/ 17,9 por lead.

## Límites (mínimo, no exacto)

- Los mensajes desde la web se miden desde el **03/10** (0013). En rangos que
  empiecen antes, el gasto de esos días entra en el cálculo sin sus mensajes,
  y la tarjeta lo avisa.
- Solo cuenta el **primer** mensaje de cada contacto en el CRM.
- El WhatsApp estuvo **desconectado del CRM** del 05/10 21:45 al 06/10 17:44
  (unas 20 h). Los mensajes de ese tramo no se confirmaron.
- En la cola del CRM quedaron unos pocos sin emparejar: 2 sin clic encontrado
  y 4 con texto no reconocido.
- El «anuncio ganador» se ordena por chats y formularios. Un anuncio de
  landing solo gana si no hay ningún anuncio con chats.

## Verificación

- `pnpm typecheck` OK, `pnpm lint` sin errores (las 4 advertencias ya
  existían), `pnpm build` OK.
- Se contrastó con la API de Meta para el 01/10–07/10: `lead` = `fb_pixel_lead`
  = 149 en C_04, y `lead_grouped` = 0 en todas las campañas. También con la
  base: 6 recibidos en C_04 y 1 en C_02.

## Pendientes

- Avisar a Isa: el panel es suyo y cambian los nombres de las tarjetas.
- Revisar en el CRM la desconexión del 05–06/10 y los números que no están
  conectados.
