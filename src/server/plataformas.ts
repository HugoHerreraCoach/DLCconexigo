import "server-only";
import { SITIO } from "@/config/sitio";

/* Lee de Meta y TikTok los conteos de eventos de sus píxeles, para mostrarlos
   en el panel junto al registro propio. Cada plataforma es opcional: sin token
   el panel explica qué falta. Respuestas cacheadas 5 min para no gastar cuota.

   Meta:   GET graph.facebook.com/v26.0/{pixel}/stats?aggregation=event
           (conteos por hora; Meta solo guarda ~7 días) — META_ACCESS_TOKEN
   TikTok: GET business-api.tiktok.com/open_api/v1.3/pixel/event/stats/
           (totales del rango; máximo 30 días, fechas UTC) —
           TIKTOK_ACCESS_TOKEN + TIKTOK_ADVERTISER_ID */

export type Plataforma = {
  nombre: "Meta" | "TikTok";
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

type RespuestaMeta = {
  data?: { data?: { value?: string; event?: string; count?: number }[] }[];
  paging?: { next?: string };
  error?: { message?: string };
};

export async function estadisticasMeta(dias: number): Promise<Plataforma> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || !SITIO.pixeles.meta) return { nombre: "Meta", estado: "sin-configurar" };

  const diasMeta = Math.min(dias, 7);
  const desde = Math.floor((Date.now() - diasMeta * DIA_MS) / 1000);
  const totales = new Map<string, number>();
  let url: string | undefined =
    `https://graph.facebook.com/v26.0/${SITIO.pixeles.meta}/stats?aggregation=event&start_time=${desde}&access_token=${encodeURIComponent(token)}`;

  try {
    // Paginado: una página por bloque de horas. Tope de seguridad de 30 páginas.
    for (let pagina = 0; url && pagina < 30; pagina++) {
      const res: Response = await fetch(url, CACHE);
      const json = (await res.json()) as RespuestaMeta;
      if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      for (const hora of json.data ?? []) {
        for (const e of hora.data ?? []) {
          const nombre = e.value ?? e.event ?? "?";
          totales.set(nombre, (totales.get(nombre) ?? 0) + (e.count ?? 0));
        }
      }
      url = json.paging?.next;
    }
    return {
      nombre: "Meta",
      estado: "ok",
      rango: dias > 7 ? "Últimos 7 días (Meta no guarda más)" : `Últimas ${diasMeta * 24} horas`,
      eventos: ordenar(totales),
    };
  } catch (e) {
    return { nombre: "Meta", estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}

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
