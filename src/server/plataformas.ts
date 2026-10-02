import "server-only";
import { SITIO } from "@/config/sitio";

/* Datos de las plataformas de anuncios para el panel, junto al registro propio.
   Cada una es opcional: sin token el panel explica qué falta. Respuestas
   cacheadas 5 min para no gastar cuota.

   Meta:   GET graph.facebook.com/v26.0/{cuenta}/insights?level=campaign
           (gasto y resultados por campaña, días en hora de Lima) — META_ACCESS_TOKEN.
           Los conteos del píxel (/{pixel}/stats) responden "Permission Denied"
           con la app actual; por eso se muestran campañas y no el píxel.
   TikTok: GET business-api.tiktok.com/open_api/v1.3/pixel/event/stats/
           (totales del rango; máximo 30 días, fechas UTC) —
           TIKTOK_ACCESS_TOKEN + TIKTOK_ADVERTISER_ID */

export type Plataforma = {
  nombre: "TikTok";
  estado: "ok" | "sin-configurar" | "error";
  /** Qué rango cubren los datos (las plataformas limitan el histórico). */
  rango?: string;
  eventos?: { evento: string; total: number }[];
  mensaje?: string;
};

const CACHE = { next: { revalidate: 300 } } as const;
const DIA_MS = 86_400_000;

const ordenar = (m: Map<string, number>) =>
  [...m].map(([evento, total]) => ({ evento, total })).sort((a, b) => b.total - a.total);

/* ── Meta: campañas ─────────────────────────────────────────────────────── */

/** Cuenta publicitaria de DLC.
 *  Solo deben considerarse estas 2 campañas oficiales del proyecto Finca Algarrobo:
 *  - C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP
 *  - C_04_CONEXIPEMA_FINCAALGARROBO_LANDING
 */
const META_CUENTA = "act_1107857613612617";
const META_API = "https://graph.facebook.com/v26.0";

export const CAMPANAS_OFICIALES = [
  "C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP",
  "C_04_CONEXIPEMA_FINCAALGARROBO_LANDING",
] as const;

/** Filtro estricto: solo cuenta y jala información de estas 2 campañas del proyecto */
export function esCampanaObjetivo(nombre: string): boolean {
  if (!nombre) return false;
  const n = nombre.toUpperCase().trim();
  return (
    n.includes("C_N1_CONEXIPEMA_FINCAALGARROBO") ||
    n.includes("C_04_CONEXIPEMA_FINCAALGARROBO") ||
    (n.includes("FINCAALGARROBO") && (n.includes("C_N1") || n.includes("C_04")))
  );
}

export type FilaCampanaMeta = {
  id: string;
  nombre: string;
  estado: string;
  gasto: number;
  /** Presupuesto diario asignado en Meta Ads (S/ día). */
  presupuestoDiario: number | null;
  /** Presupuesto total asignado en Meta Ads si fuera lifetime. */
  presupuestoTotal: number | null;
  /** Formularios instantáneos de Meta (y leads del píxel, si los hubiera). */
  formularios: number;
  /** Conversaciones iniciadas por WhatsApp / Messenger. */
  conversaciones: number;
  /** Total de leads sumando formularios y conversaciones. */
  leadsTotales: number;
  /** Costo por lead (gasto / leadsTotales) o null si no hay leads. */
  costoPorLead: number | null;
  /** Llegadas a la landing (landing_page_view). */
  visitasWeb: number;
  clics: number;
};

export type FilaAnuncioMeta = {
  id: string;
  nombre: string;
  campanaId: string;
  campanaNombre: string;
  gasto: number;
  formularios: number;
  conversaciones: number;
  leadsTotales: number;
  costoPorLead: number | null;
  visitasWeb: number;
  clics: number;
  esGanador?: boolean;
};

export type TotalesMeta = {
  gasto: number;
  presupuestoDiarioTotal: number;
  formularios: number;
  conversaciones: number;
  leadsTotales: number;
  costoPorLead: number | null;
  visitasWeb: number;
  clics: number;
};

export type ResultadoCampanasMeta =
  | {
    estado: "ok";
    moneda: string;
    desde: string;
    hasta: string;
    filas: FilaCampanaMeta[];
    anuncios: FilaAnuncioMeta[];
    anuncioGanador: FilaAnuncioMeta | null;
    totales: TotalesMeta;
  }
  | { estado: "sin-configurar" }
  | { estado: "error"; mensaje: string };

type RespuestaInsights = {
  data?: {
    campaign_id: string;
    campaign_name: string;
    spend?: string;
    impressions?: string;
    reach?: string;
    actions?: { action_type: string; value: string }[];
  }[];
  error?: { message?: string };
};
type RespuestaInsightsAds = {
  data?: {
    ad_id: string;
    ad_name: string;
    campaign_id: string;
    campaign_name: string;
    spend?: string;
    impressions?: string;
    reach?: string;
    actions?: { action_type: string; value: string }[];
  }[];
  error?: { message?: string };
};
type RespuestaCampanas = {
  data?: {
    id: string;
    name?: string;
    effective_status?: string;
    daily_budget?: string;
    lifetime_budget?: string;
  }[];
  error?: { message?: string };
};
type RespuestaCuenta = { currency?: string; error?: { message?: string } };

function extraerLeadsFormularios(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  const tipos = [
    "lead",
    "offsite_conversion.fb_pixel_lead",
    "onsite_conversion.lead_grouped",
    "contact",
    "submit_application",
  ];
  for (const t of tipos) {
    const a = actions.find((x) => x.action_type === t);
    if (a && Number(a.value) > 0) return Number(a.value);
  }
  return 0;
}

function extraerConversaciones(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  const tipos = [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.messaging_first_reply",
  ];
  for (const t of tipos) {
    const a = actions.find((x) => x.action_type === t);
    if (a && Number(a.value) > 0) return Number(a.value);
  }
  return 0;
}

/** Fecha YYYY-MM-DD en hora de Lima (la cuenta también está en America/Lima). */
const fechaLima = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(ms);

async function graph<T extends { error?: { message?: string } }>(ruta: string, token: string): Promise<T> {
  const res = await fetch(`${META_API}/${ruta}${ruta.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, CACHE);
  const json = (await res.json()) as T;
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

export type ParametroRango = number | { desde: string; hasta: string };

export async function campanasMeta(rangoParam: ParametroRango): Promise<ResultadoCampanasMeta> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return { estado: "sin-configurar" };

  const desde = typeof rangoParam === "object" ? rangoParam.desde : fechaLima(Date.now() - (rangoParam - 1) * DIA_MS);
  const hasta = typeof rangoParam === "object" ? rangoParam.hasta : fechaLima(Date.now());
  const rango = encodeURIComponent(JSON.stringify({ since: desde, until: hasta }));

  try {
    // Consultas en paralelo para rapidez: cuenta, lista de campañas, insights de campañas y de anuncios
    const [cuenta, campanas, insightsCampanas, insightsAds] = await Promise.all([
      graph<RespuestaCuenta>(`${META_CUENTA}?fields=currency`, token),
      graph<RespuestaCampanas>(
        `${META_CUENTA}/campaigns?fields=id,name,effective_status,daily_budget,lifetime_budget&limit=200`,
        token,
      ),
      graph<RespuestaInsights>(
        `${META_CUENTA}/insights?level=campaign&time_range=${rango}&fields=campaign_id,campaign_name,spend,actions,impressions,reach&limit=200`,
        token,
      ).catch(() => ({ data: [] } as RespuestaInsights)),
      graph<RespuestaInsightsAds>(
        `${META_CUENTA}/insights?level=ad&time_range=${rango}&fields=ad_id,ad_name,campaign_id,campaign_name,spend,actions,impressions,reach&limit=200`,
        token,
      ).catch(() => ({ data: [] } as RespuestaInsightsAds)),
    ]);

    const todasCampanas = campanas.data ?? [];
    const estados = new Map(todasCampanas.map((c) => [c.id, c.effective_status ?? "?"]));
    const nombres = new Map(todasCampanas.map((c) => [c.id, c.name ?? ""]));
    const presupuestosDiarios = new Map(
      todasCampanas.map((c) => [c.id, c.daily_budget ? Number(c.daily_budget) / 100 : null]),
    );
    const presupuestosTotales = new Map(
      todasCampanas.map((c) => [c.id, c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null]),
    );

    // 1. Filtrar únicamente las 2 campañas objetivo
    const campanasObjetivoMap = new Map<string, { id: string; nombre: string; estado: string }>();
    for (const c of todasCampanas) {
      if (esCampanaObjetivo(c.name ?? "")) {
        campanasObjetivoMap.set(c.id, { id: c.id, nombre: c.name ?? "", estado: c.effective_status ?? "PROGRAMADO" });
      }
    }

    type FilaInsightCampana = {
      campaign_id: string;
      campaign_name: string;
      spend?: string;
      impressions?: string;
      reach?: string;
      actions?: { action_type: string; value: string }[];
    };
    const mapaInsightsCampanas = new Map<string, FilaInsightCampana>();
    for (const c of insightsCampanas.data ?? []) {
      if (esCampanaObjetivo(c.campaign_name)) {
        mapaInsightsCampanas.set(c.campaign_id, c);
        if (!campanasObjetivoMap.has(c.campaign_id)) {
          campanasObjetivoMap.set(c.campaign_id, {
            id: c.campaign_id,
            nombre: c.campaign_name,
            estado: estados.get(c.campaign_id) ?? "PROGRAMADO",
          });
        }
      }
    }

    const filas: FilaCampanaMeta[] = Array.from(campanasObjetivoMap.values()).map((c) => {
      const ins = mapaInsightsCampanas.get(c.id);
      const accion = (tipo: string) =>
        Number(ins?.actions?.find((a: { action_type: string; value: string }) => a.action_type === tipo)?.value ?? 0);
      const gasto = Number(ins?.spend ?? 0);
      const formularios = extraerLeadsFormularios(ins?.actions);
      const conversaciones = extraerConversaciones(ins?.actions);
      const leadsTotales = formularios + conversaciones;
      const costoPorLead = leadsTotales > 0 ? gasto / leadsTotales : null;

      return {
        id: c.id,
        nombre: c.nombre || nombres.get(c.id) || "Campaña Finca Algarrobo",
        estado: c.estado,
        gasto,
        presupuestoDiario: presupuestosDiarios.get(c.id) ?? 70,
        presupuestoTotal: presupuestosTotales.get(c.id) ?? null,
        formularios,
        conversaciones,
        leadsTotales,
        costoPorLead,
        visitasWeb: accion("landing_page_view"),
        clics: accion("link_click"),
      };
    }).sort((a, b) => b.gasto - a.gasto || b.leadsTotales - a.leadsTotales);

    // 2. Filtrar y procesar anuncios de estas 2 campañas
    const anuncios: FilaAnuncioMeta[] = (insightsAds.data ?? [])
      .filter((ad) => esCampanaObjetivo(ad.campaign_name))
      .map((ad) => {
        const accion = (tipo: string) =>
          Number(ad.actions?.find((a: { action_type: string; value: string }) => a.action_type === tipo)?.value ?? 0);
        const gasto = Number(ad.spend ?? 0);
        const formularios = extraerLeadsFormularios(ad.actions);
        const conversaciones = extraerConversaciones(ad.actions);
        const leadsTotales = formularios + conversaciones;
        const costoPorLead = leadsTotales > 0 ? gasto / leadsTotales : null;

        return {
          id: ad.ad_id,
          nombre: ad.ad_name,
          campanaId: ad.campaign_id,
          campanaNombre: ad.campaign_name,
          gasto,
          formularios,
          conversaciones,
          leadsTotales,
          costoPorLead,
          visitasWeb: accion("landing_page_view"),
          clics: accion("link_click"),
        };
      })
      .sort((a, b) => {
        // Ordenar anuncios: los que tienen leads primero por menor costo por lead, luego por más leads
        if (a.leadsTotales > 0 && b.leadsTotales === 0) return -1;
        if (b.leadsTotales > 0 && a.leadsTotales === 0) return 1;
        if (a.leadsTotales > 0 && b.leadsTotales > 0) {
          if (a.costoPorLead !== null && b.costoPorLead !== null && a.costoPorLead !== b.costoPorLead) {
            return a.costoPorLead - b.costoPorLead;
          }
          return b.leadsTotales - a.leadsTotales;
        }
        return b.clics - a.clics || b.gasto - a.gasto;
      });

    // 3. Determinar el Anuncio Ganador (Mejor Rendimiento)
    let anuncioGanador: FilaAnuncioMeta | null = null;
    if (anuncios.length > 0) {
      anuncioGanador = { ...anuncios[0], esGanador: true };
      anuncios[0].esGanador = true;
    }

    // 4. Totales consolidados de Meta
    const gastoTotal = filas.reduce((acc, f) => acc + f.gasto, 0);
    const presupuestoDiarioTotal = filas.reduce((acc, f) => acc + (f.presupuestoDiario ?? 70), 0) || 140;
    const formulariosTotal = filas.reduce((acc, f) => acc + f.formularios, 0);
    const conversacionesTotal = filas.reduce((acc, f) => acc + f.conversaciones, 0);
    const leadsTotales = formulariosTotal + conversacionesTotal;

    const totales: TotalesMeta = {
      gasto: gastoTotal,
      presupuestoDiarioTotal,
      formularios: formulariosTotal,
      conversaciones: conversacionesTotal,
      leadsTotales,
      costoPorLead: leadsTotales > 0 ? gastoTotal / leadsTotales : null,
      visitasWeb: filas.reduce((acc, f) => acc + f.visitasWeb, 0),
      clics: filas.reduce((acc, f) => acc + f.clics, 0),
    };

    return {
      estado: "ok",
      moneda: cuenta.currency ?? "PEN",
      desde,
      hasta,
      filas,
      anuncios,
      anuncioGanador,
      totales,
    };
  } catch (e) {
    return { estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}

/* ── TikTok: píxel ──────────────────────────────────────────────────────── */

type RespuestaTikTok = {
  code?: number;
  message?: string;
  data?: {
    list?: {
      statistics?: { pixel_event_type?: string; custom_event_type?: string; total_count?: number }[];
    }[];
  };
};

/** TikTok devuelve tipos de optimización (ON_WEB_…) en vez del nombre del evento. */
function nombreTikTok(tipo: string) {
  const t = tipo.toUpperCase();
  if (t.includes("FORM")) return "SubmitForm (formulario)";
  if (t.includes("CONTACT") || t.includes("CONSULT")) return "Contact (WhatsApp)";
  if (t.includes("PAGE") || t.includes("VIEW") || t.includes("LANDING")) return `Page view (${tipo})`;
  return tipo;
}

export async function estadisticasTikTok(rangoParam: ParametroRango): Promise<Plataforma> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const anunciante = process.env.TIKTOK_ADVERTISER_ID;
  if (!token || !anunciante || !SITIO.pixeles.tiktok) return { nombre: "TikTok", estado: "sin-configurar" };

  const fecha = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const esObj = typeof rangoParam === "object";
  const desde = esObj ? rangoParam.desde : fecha(Date.now() - (Math.min(rangoParam, 30) - 1) * DIA_MS);
  const hasta = esObj ? rangoParam.hasta : fecha(Date.now());
  const rango = { start_date: desde, end_date: hasta };
  const params = new URLSearchParams({
    advertiser_id: anunciante,
    pixel_ids: JSON.stringify([SITIO.pixeles.tiktok]),
    date_range: JSON.stringify(rango),
  });

  try {
    const res = await fetch(`https://business-api.tiktok.com/open_api/v1.3/pixel/event/stats/?${params}`, {
      ...CACHE,
      headers: { "Access-Token": token },
    });
    const json = (await res.json()) as RespuestaTikTok;
    // TikTok responde errores con HTTP 200: lo que manda es `code`.
    if (json.code !== 0) throw new Error(json.message ?? `HTTP ${res.status}`);

    const totales = new Map<string, number>();
    for (const pixel of json.data?.list ?? []) {
      for (const s of pixel.statistics ?? []) {
        const nombre = nombreTikTok(s.pixel_event_type ?? s.custom_event_type ?? "?");
        totales.set(nombre, (totales.get(nombre) ?? 0) + (s.total_count ?? 0));
      }
    }
    return {
      nombre: "TikTok",
      estado: "ok",
      rango: `${rango.start_date} → ${rango.end_date}`,
      eventos: ordenar(totales),
    };
  } catch (e) {
    return { nombre: "TikTok", estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}
