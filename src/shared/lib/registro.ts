/* Registro propio de eventos para el panel (/panel). Complementa a los píxeles:
   los bloqueadores de anuncios frenan a Meta/TikTok pero no a nuestro propio
   endpoint, así que aquí se ve el tráfico real. No guarda nombre ni celular. */

export type TipoEvento = "visita" | "contacto" | "formulario_preparado" | "lead";

export type Fuente = "meta" | "tiktok" | "google" | "otro" | "directo";

/** `campana` = utm_campaign (los anuncios de Meta mandan el id de la campaña;
 *  los de TikTok, el nombre) y `campana_id` = utm_id. Las sesiones guardadas
 *  antes de existir `campana_id` no lo traen. */
type Atribucion = { fuente: Fuente; campana: string | null; campana_id?: string | null };

const CLAVE_VISITANTE = "dlc_v";
const CLAVE_ATRIBUCION = "dlc_a";

function leer(almacen: Storage, clave: string): string | null {
  try {
    return almacen.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(almacen: Storage, clave: string, valor: string) {
  try {
    almacen.setItem(clave, valor);
  } catch {
    /* modo privado o almacenamiento bloqueado: se sigue sin persistir */
  }
}

/** Id anónimo y aleatorio para contar visitantes únicos. */
function visitante(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "00000000-0000-0000-0000-000000000000";
  }
  const existente = leer(window.localStorage, CLAVE_VISITANTE);
  if (existente) return existente;
  const nuevo = crypto.randomUUID();
  guardar(window.localStorage, CLAVE_VISITANTE, nuevo);
  return nuevo;
}

/** De dónde llegó el visitante. Se decide al entrar y se mantiene toda la
 *  sesión, para que un clic a WhatsApp minutos después se atribuya igual. */
function atribucion(): Atribucion {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return { fuente: "directo", campana: null };
  }
  const guardada = leer(window.sessionStorage, CLAVE_ATRIBUCION);
  if (guardada) {
    try {
      return JSON.parse(guardada) as Atribucion;
    } catch {}
  }

  const search = typeof location !== "undefined" ? location.search : "";
  const p = new URLSearchParams(search);
  const utm = (p.get("utm_source") ?? "").toLowerCase();
  const ref = typeof document !== "undefined" && document.referrer ? new URL(document.referrer).hostname : "";
  const host = typeof location !== "undefined" ? location.hostname : "";

  let fuente: Fuente = "directo";
  if (p.has("ttclid") || utm.includes("tiktok") || ref.includes("tiktok")) fuente = "tiktok";
  else if (p.has("fbclid") || /^(fb|ig|facebook|instagram|meta)/.test(utm) || /facebook|instagram/.test(ref)) fuente = "meta";
  else if (p.has("gclid") || utm.includes("google") || ref.includes("google.")) fuente = "google";
  else if (utm || (ref && ref !== host)) fuente = "otro";

  const nueva = { fuente, campana: p.get("utm_campaign"), campana_id: p.get("utm_id") };
  guardar(window.sessionStorage, CLAVE_ATRIBUCION, JSON.stringify(nueva));
  return nueva;
}

function esMovil(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 767px)").matches
    : false;
}

/** Visitante y procedencia, para lo que el servidor registra por su cuenta
 *  (el formulario → hoja de cálculo, ver /api/formulario). */
export function contextoVisita() {
  return { visitante: visitante(), ...atribucion(), movil: esMovil() };
}

/** `plantilla`, `nombre`, `telefono`: para reconocer el mensaje de WhatsApp cuando llegue
 *  al CRM. El servidor calcula únicamente huellas HMAC sin almacenar datos en claro. */
export type Extra = {
  origen?: string | null;
  datos?: Record<string, string>;
  plantilla?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  intencion_id?: string;
};

// Deduplicación en cliente de intenciones recientes para evitar dobles envíos
const intencionesRecientes = new Set<string>();

export function registrar(tipo: TipoEvento, extra: Extra = {}): string {
  const intencionId = extra.intencion_id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `int_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  if (intencionesRecientes.has(intencionId)) {
    return intencionId;
  }
  intencionesRecientes.add(intencionId);
  if (intencionesRecientes.size > 200) {
    const primerKey = intencionesRecientes.values().next().value;
    if (primerKey) intencionesRecientes.delete(primerKey);
  }

  try {
    // intencion_id va al final: `extra` puede traerlo como undefined y no debe
    // borrar el id generado (es el id del evento del píxel y el de deduplicación).
    const cuerpo = JSON.stringify({
      tipo,
      ...contextoVisita(),
      ...extra,
      intencion_id: intencionId,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([cuerpo], { type: "application/json" });
      if (!navigator.sendBeacon("/api/eventos", blob)) {
        void fetch("/api/eventos", {
          method: "POST",
          body: cuerpo,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else if (typeof fetch !== "undefined") {
      void fetch("/api/eventos", {
        method: "POST",
        body: cuerpo,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    /* la medición nunca debe romper la página */
  }


  return intencionId;
}


