import "server-only";
import { createHash } from "node:crypto";
import { SITIO } from "@/config/sitio";
import type { IdFormulario } from "@/shared/lib/formulario";
import { datosRegistroMeta, datosRegistroTikTok, EVENTO_REGISTRO } from "@/shared/lib/pixeles";

/* Conversión del registro enviada desde el servidor (docs/0026).

   El navegador envía `CompleteRegistration` a los píxeles 800 ms antes de abrir
   WhatsApp y, en celular, al saltar a la app se cancela parte de esas peticiones.
   Con la fila ya confirmada en la hoja, /api/formulario manda el mismo evento
   desde el servidor, después de responder:
     Meta    POST graph.facebook.com/v26.0/{píxel}/events (API de conversiones)
             — META_CAPI_TOKEN (Administrador de eventos → píxel → Configuración →
             API de conversiones → Generar token de acceso)
     TikTok  POST business-api.tiktok.com/open_api/v1.3/event/track/ (Events API)
             — TIKTOK_EVENTS_API_TOKEN (token de Events API del píxel)
   El id del evento es el id del registro, el mismo que usa el navegador: cada
   plataforma se queda con una sola copia (mismo nombre de evento + mismo id).
   Sin su token, esa plataforma no se envía. Del visitante solo va el hash
   SHA-256 del celular, la IP, el navegador y los ids de clic y de cookie de cada
   plataforma; nunca el nombre. */

const META_API = "https://graph.facebook.com/v26.0";
const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const TIEMPO_MS = 8000;

/** `fb.1.<ms>.<id>`: cookies _fbp y _fbc de Meta (o el fbc armado con el fbclid). */
const ID_META = /^fb\.\d\.\d+\.\S+$/;
const SIN_ESPACIOS = /^\S+$/;

/** Lo que identifica al visitante ante cada plataforma. */
export type Visita = {
  url: string;
  ip: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  ttp: string | null;
  ttclid: string | null;
};

export type RegistroServidor = {
  /** Id del registro = id del evento (el mismo del navegador). */
  id: string;
  origen: IdFormulario;
  /** 9 dígitos, como los deja celularPeru. */
  celular: string;
  inicial: string;
  fecha: Date;
  visita: Visita;
};

type Resultado = "enviado" | "sin token" | "falló";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const valido = (v: unknown, patron: RegExp, max = 500) => (typeof v === "string" && v.length <= max && patron.test(v) ? v : null);
/** Las APIs rechazan o descartan los campos vacíos: no se mandan. */
const sinVacios = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== ""));

function cookie(req: Request, nombre: string): string | null {
  for (const parte of (req.headers.get("cookie") ?? "").split(";")) {
    const [clave, ...valor] = parte.trim().split("=");
    if (clave !== nombre) continue;
    try {
      return decodeURIComponent(valor.join("="));
    } catch {
      return valor.join("=");
    }
  }
  return null;
}

/** Datos del visitante que trae el pedido del formulario: cabeceras, cookies de
 *  los píxeles (_fbp, _fbc, _ttp) y los ids de clic que manda el navegador
 *  (`ttclid` y `fbc`, ver idsDeClic en src/shared/lib/registro.ts). */
export function visitaDe(req: Request, cuerpo: Record<string, unknown>): Visita {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip");
  return {
    url: valido(req.headers.get("referer"), /^https?:\/\/\S+$/, 1000) ?? `${new URL(req.url).origin}/`,
    ip: ip || null,
    userAgent: req.headers.get("user-agent") || null,
    fbp: valido(cookie(req, "_fbp"), ID_META),
    // La cookie la pone el píxel de Meta; si no está, la arma el navegador con el fbclid.
    fbc: valido(cookie(req, "_fbc"), ID_META) ?? valido(cuerpo.fbc, ID_META),
    ttp: valido(cookie(req, "_ttp"), SIN_ESPACIOS),
    ttclid: valido(cuerpo.ttclid, SIN_ESPACIOS),
  };
}

async function enviarMeta(r: RegistroServidor, token: string) {
  const evento = {
    event_name: EVENTO_REGISTRO,
    event_time: Math.floor(r.fecha.getTime() / 1000),
    event_id: r.id,
    action_source: "website",
    event_source_url: r.visita.url,
    user_data: sinVacios({
      // Meta: código de país y número, solo dígitos.
      ph: [sha256(`51${r.celular}`)],
      client_ip_address: r.visita.ip,
      client_user_agent: r.visita.userAgent,
      fbp: r.visita.fbp,
      fbc: r.visita.fbc,
    }),
    custom_data: datosRegistroMeta(r.origen, { inicial: r.inicial }),
  };
  // Como formulario (data + access_token), igual que el ejemplo de Meta: el token no va en la URL.
  const res = await fetch(`${META_API}/${SITIO.pixeles.meta}/events`, {
    method: "POST",
    body: new URLSearchParams({ data: JSON.stringify([evento]), access_token: token }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIEMPO_MS),
  });
  const json = (await res.json().catch(() => null)) as { events_received?: number; error?: { message?: string } } | null;
  if (!res.ok || json?.events_received !== 1) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
}

async function enviarTikTok(r: RegistroServidor, token: string) {
  const cuerpo = {
    event_source: "web",
    event_source_id: SITIO.pixeles.tiktok,
    data: [
      {
        event: EVENTO_REGISTRO,
        event_time: Math.floor(r.fecha.getTime() / 1000),
        event_id: r.id,
        user: sinVacios({
          ttclid: r.visita.ttclid,
          ttp: r.visita.ttp,
          // TikTok: formato E.164, con el «+».
          phone: sha256(`+51${r.celular}`),
          ip: r.visita.ip,
          user_agent: r.visita.userAgent,
        }),
        page: { url: r.visita.url },
        properties: datosRegistroTikTok(r.origen),
      },
    ],
  };
  const res = await fetch(TIKTOK_API, {
    method: "POST",
    headers: { "Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
    signal: AbortSignal.timeout(TIEMPO_MS),
  });
  const json = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
  // TikTok responde errores con HTTP 200: lo que manda es `code`.
  if (json?.code !== 0) throw new Error(json?.message ?? `HTTP ${res.status}`);
}

/** Envía la conversión del registro a Meta y a TikTok. Nunca lanza: el lead ya
 *  está en la hoja y un fallo aquí solo queda en el registro del servidor. */
export async function registroPorServidor(r: RegistroServidor): Promise<Record<"meta" | "tiktok", Resultado>> {
  const intentar = async (
    plataforma: string,
    token: string | undefined,
    enviar: (r: RegistroServidor, token: string) => Promise<void>,
  ): Promise<Resultado> => {
    if (!token) return "sin token";
    try {
      await enviar(r, token);
      return "enviado";
    } catch (e) {
      console.error(`[pixeles-servidor] ${plataforma} no aceptó ${EVENTO_REGISTRO} del registro ${r.id}`, e);
      return "falló";
    }
  };

  const [meta, tiktok] = await Promise.all([
    intentar("Meta", SITIO.pixeles.meta ? process.env.META_CAPI_TOKEN?.trim() : undefined, enviarMeta),
    intentar("TikTok", SITIO.pixeles.tiktok ? process.env.TIKTOK_EVENTS_API_TOKEN?.trim() : undefined, enviarTikTok),
  ]);
  console.info(`[pixeles-servidor] ${EVENTO_REGISTRO} ${r.id}: Meta ${meta}, TikTok ${tiktok}`);
  return { meta, tiktok };
}
