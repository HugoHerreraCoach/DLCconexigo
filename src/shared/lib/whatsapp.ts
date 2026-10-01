import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/* Los mensajes de WhatsApp salen tal cual, SIN código de referencia (acordado
   con el equipo el 2026-10-01): ya no se mide si el mensaje llegó al CRM.
   PATRON_REFERENCIA solo lo usa /api/whatsapp/recibido para aceptar avisos de
   códigos antiguos ("L-1", "L-2"…) que el CRM pudiera reenviar. */
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

/** Abre WhatsApp con el mensaje tal cual. `medir` registra el «Cliente
 *  potencial» (píxeles + registro propio) antes de salir de la página.
 *  En escritorio abre otra pestaña; en celular navega directo (abre la app). */
export function abrirWhatsApp(enlace: string, medir?: () => void) {
  medir?.();
  const escritorio = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const ventana = escritorio ? window.open(enlace, "_blank") : null;
  if (ventana) ventana.opener = null;
  else window.location.href = enlace;
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
