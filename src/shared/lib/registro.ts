/* Registro propio de eventos para el panel (/panel). Complementa a los píxeles:
   los bloqueadores de anuncios frenan a Meta/TikTok pero no a nuestro propio
   endpoint, así que aquí se ve el tráfico real. No guarda nombre ni celular. */

export type TipoEvento = "visita" | "contacto" | "lead";

export type Fuente = "meta" | "tiktok" | "google" | "otro" | "directo";

type Atribucion = { fuente: Fuente; campana: string | null };

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
  const existente = leer(localStorage, CLAVE_VISITANTE);
  if (existente) return existente;
  const nuevo = crypto.randomUUID();
  guardar(localStorage, CLAVE_VISITANTE, nuevo);
  return nuevo;
}

/** De dónde llegó el visitante. Se decide al entrar y se mantiene toda la
 *  sesión, para que un clic a WhatsApp minutos después se atribuya igual. */
function atribucion(): Atribucion {
  const guardada = leer(sessionStorage, CLAVE_ATRIBUCION);
  if (guardada) return JSON.parse(guardada) as Atribucion;

  const p = new URLSearchParams(location.search);
  const utm = (p.get("utm_source") ?? "").toLowerCase();
  const ref = document.referrer ? new URL(document.referrer).hostname : "";

  let fuente: Fuente = "directo";
  if (p.has("ttclid") || utm.includes("tiktok") || ref.includes("tiktok")) fuente = "tiktok";
  else if (p.has("fbclid") || /^(fb|ig|facebook|instagram|meta)/.test(utm) || /facebook|instagram/.test(ref)) fuente = "meta";
  else if (p.has("gclid") || utm.includes("google") || ref.includes("google.")) fuente = "google";
  else if (utm || (ref && ref !== location.hostname)) fuente = "otro";

  const nueva = { fuente, campana: p.get("utm_campaign") };
  guardar(sessionStorage, CLAVE_ATRIBUCION, JSON.stringify(nueva));
  return nueva;
}

export function registrar(tipo: TipoEvento, extra: { origen?: string; datos?: Record<string, string> } = {}) {
  try {
    const cuerpo = JSON.stringify({
      tipo,
      visitante: visitante(),
      ...atribucion(),
      movil: matchMedia("(max-width: 767px)").matches,
      ...extra,
    });
    // sendBeacon sobrevive a que el usuario salga a WhatsApp justo después del clic.
    const blob = new Blob([cuerpo], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/eventos", blob)) {
      void fetch("/api/eventos", { method: "POST", body: cuerpo, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* la medición nunca debe romper la página */
  }
}
