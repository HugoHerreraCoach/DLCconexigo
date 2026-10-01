import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/* ── Número de referencia ────────────────────────────────────────────────────
   Cada clic a WhatsApp (y cada formulario) lleva al inicio del mensaje el
   código oficial "L-1 - Hola...". El CRM ConexiGO lo lee y avisa a
   /api/whatsapp/recibido para confirmar que el prospecto llegó efectivamente. */

export const CODIGO_FIJO = "L-1";
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

/** Pone siempre el identificador "L-1" al inicio del mensaje */
export const conReferencia = (mensaje: string, codigo: string = CODIGO_FIJO) => {
  const prefijo = (codigo || CODIGO_FIJO).trim();
  const sinCodigo = mensaje.replace(/^L-?\w+\s*[-:\n]?\s*/i, "").trim();
  return `${prefijo} - ${sinCodigo}`;
};

/** Abre WhatsApp con "L-1" fijo al inicio del mensaje sin demoras */
export async function abrirWhatsApp(enlace: string, pedirCodigo?: () => Promise<string | null>) {
  const escritorio = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const ventana = escritorio ? window.open("", "_blank") : null;
  if (ventana) ventana.opener = null;

  // Ejecutamos el registro de medición en segundo plano
  if (pedirCodigo) {
    void pedirCodigo();
  }

  const url = new URL(enlace);
  const textoActual = url.searchParams.get("text") ?? "";
  url.searchParams.set("text", conReferencia(textoActual, CODIGO_FIJO));

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
