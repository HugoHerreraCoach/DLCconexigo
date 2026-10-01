import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/* ── Número de referencia ────────────────────────────────────────────────────
   Cada clic a WhatsApp (y cada formulario) lleva en el inicio del mensaje un
   código correlativo: "L-1 - Hola...", "L-2 - Hola...". Lo asigna el servidor
   (/api/eventos con `reservar`, secuencia de Postgres) al registrar el clic, y
   queda guardado con la campaña, la fuente y el botón (tabla `eventos`).
   Cuando el mensaje LLEGA de verdad, el CRM ConexiGO lee el código y avisa a
   /api/whatsapp/recibido, que marca ese clic como recibido. Así el panel
   distingue "hizo clic" de "el mensaje llegó". */

export const PREFIJO_REFERENCIA = "L";
export const PATRON_REFERENCIA = /^L-?[1-9]\d{0,9}$/i;

export const CLAVE_NOMBRE = "dlc_lead_nombre";

/** Guarda en almacenamiento local el nombre del prospecto ingresado en el formulario */
export function guardarNombreLead(nombre: string) {
  if (typeof window === "undefined") return;
  try {
    const limpio = nombre.trim();
    if (limpio) localStorage.setItem(CLAVE_NOMBRE, limpio);
  } catch {}
}

/** Obtiene el nombre guardado del prospecto para personalizar cualquier botón de WhatsApp */
export function obtenerNombreLead(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CLAVE_NOMBRE)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Incorpora el nombre del usuario al mensaje si está disponible */
export function mensajeConNombre(base: string, nombre?: string): string {
  const nombreFinal = (nombre ?? obtenerNombreLead()).trim();
  if (!nombreFinal) return base;
  if (/mi nombre es/i.test(base)) return base;
  const baseLimpia = base.replace(/[.\s]+$/, "");
  return `${baseLimpia}. Mi nombre es: ${nombreFinal}`;
}

/** Pone el número de referencia al inicio del mensaje: "L-1 - Hola, quiero..." */
export const conReferencia = (mensaje: string, codigo: string) => {
  const sinCodigo = mensaje.replace(/^L-?\d+\s*[-:\n]?\s*/i, "").trim();
  return `${codigo} - ${sinCodigo}`;
};

function obtenerCodigoFallback(): string {
  if (typeof window === "undefined") return `${PREFIJO_REFERENCIA}-1`;
  try {
    const actual = parseInt(localStorage.getItem("dlc_ref_seq") ?? "0", 10) + 1;
    localStorage.setItem("dlc_ref_seq", String(actual));
    return `${PREFIJO_REFERENCIA}-${actual}`;
  } catch {
    return `${PREFIJO_REFERENCIA}-1`;
  }
}

/** Abre WhatsApp con el número de referencia al inicio del mensaje. */
export async function abrirWhatsApp(enlace: string, pedirCodigo: () => Promise<string | null>) {
  const escritorio = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const ventana = escritorio ? window.open("", "_blank") : null;
  if (ventana) ventana.opener = null;

  let codigo = await pedirCodigo();
  if (!codigo) {
    codigo = obtenerCodigoFallback();
  }

  const url = new URL(enlace);
  const textoActual = url.searchParams.get("text") ?? "";
  url.searchParams.set("text", conReferencia(textoActual, codigo));

  if (ventana) ventana.location.href = url.toString();
  else window.location.href = url.toString();
}

export const MENSAJES = {
  general: "Hola, quiero más información del proyecto Finca Algarrobo.",
  visita: "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.",
  asesor: "Hola, quiero que me contacte un asesor ahora mismo sobre el proyecto Finca Algarrobo.",
  cuotas: "Hola, quiero consultar mi plan de cuotas para un lote en Finca Algarrobo.",
  ficha: "Hola, quiero evaluar la inversión. ¿Me envían la ficha del proyecto Finca Algarrobo?",
  video: "Hola, ¿me pueden enviar el video recorrido de Finca Algarrobo?",
  documentos: "Hola, quiero conocer el detalle de la documentación de Finca Algarrobo.",
} as const;
