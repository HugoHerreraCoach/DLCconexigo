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

/** Cuenta publicitaria de DLC. Tiene campañas de otros proyectos: solo entran
 *  las que llevan FILTRO en el nombre. */
const META_CUENTA = "act_1107857613612617";
const META_FILTRO = "ALGARROBO";
const META_API = "https://graph.facebook.com/v26.0";

export type FilaCampanaMeta = {
  id: string;
  nombre: string;
  estado: string;
  gasto: number;
  /** Formularios instantáneos de Meta (y leads del píxel, si los hubiera). */
  formularios: number;
  /** Conversaciones iniciadas por WhatsApp / Messenger. */
  conversaciones: number;
  /** Llegadas a la landing (landing_page_view). */
  visitasWeb: number;
  clics: number;
};

export type ResultadoCampanasMeta =
  | { estado: "ok"; moneda: string; desde: string; hasta: string; filas: FilaCampanaMeta[] }
  | { estado: "sin-configurar" }
  | { estado: "error"; mensaje: string };

type RespuestaInsights = {
  data?: { campaign_id: string; campaign_name: string; spend?: string; actions?: { action_type: string; value: string }[] }[];
  error?: { message?: string };
};
type RespuestaCampanas = { data?: { id: string; effective_status?: string }[]; error?: { message?: string } };
type RespuestaCuenta = { currency?: string; error?: { message?: string } };

/** Fecha YYYY-MM-DD en hora de Lima (la cuenta también está en America/Lima). */
const fechaLima = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(ms);

async function graph<T extends { error?: { message?: string } }>(ruta: string, token: string): Promise<T> {
  const res = await fetch(`${META_API}/${ruta}${ruta.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, CACHE);
  const json = (await res.json()) as T;
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

export async function campanasMeta(dias: number): Promise<ResultadoCampanasMeta> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return { estado: "sin-configurar" };

  const desde = fechaLima(Date.now() - (dias - 1) * DIA_MS);
  const hasta = fechaLima(Date.now());
  const rango = encodeURIComponent(JSON.stringify({ since: desde, until: hasta }));

  try {
    // En secuencia: tres llamadas pequeñas y cacheadas.
    const cuenta = await graph<RespuestaCuenta>(`${META_CUENTA}?fields=currency`, token);
    const insights = await graph<RespuestaInsights>(
      `${META_CUENTA}/insights?level=campaign&time_range=${rango}&fields=campaign_id,campaign_name,spend,actions&limit=200`,
      token,
    );
    const campanas = await graph<RespuestaCampanas>(`${META_CUENTA}/campaigns?fields=effective_status&limit=200`, token);
    const estados = new Map((campanas.data ?? []).map((c) => [c.id, c.effective_status ?? "?"]));

    const filas = (insights.data ?? [])
      .filter((c) => c.campaign_name.toUpperCase().includes(META_FILTRO))
      .map((c) => {
        const accion = (tipo: string) => Number(c.actions?.find((a) => a.action_type === tipo)?.value ?? 0);
        return {
          id: c.campaign_id,
          nombre: c.campaign_name,
          estado: estados.get(c.campaign_id) ?? "?",
          gasto: Number(c.spend ?? 0),
          formularios: accion("lead"),
          conversaciones: accion("onsite_conversion.messaging_conversation_started_7d"),
          visitasWeb: accion("landing_page_view"),
          clics: accion("link_click"),
        };
      })
      .sort((a, b) => b.gasto - a.gasto);

    return { estado: "ok", moneda: cuenta.currency ?? "PEN", desde, hasta, filas };
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

export async function estadisticasTikTok(dias: number): Promise<Plataforma> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const anunciante = process.env.TIKTOK_ADVERTISER_ID;
  if (!token || !anunciante || !SITIO.pixeles.tiktok) return { nombre: "TikTok", estado: "sin-configurar" };

  const diasTikTok = Math.min(dias, 30);
  const fecha = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const rango = { start_date: fecha(Date.now() - (diasTikTok - 1) * DIA_MS), end_date: fecha(Date.now()) };
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
      rango: `${rango.start_date} → ${rango.end_date} (UTC${dias > 30 ? ", máx. 30 días" : ""})`,
      eventos: ordenar(totales),
    };
  } catch (e) {
    return { nombre: "TikTok", estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}
