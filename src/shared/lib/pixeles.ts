import { MENSAJES } from "@/shared/lib/whatsapp";

/* Eventos de conversión para Meta y TikTok. Los componentes llaman a estas
   funciones y no a fbq/ttq directamente: si un píxel no está cargado (ID vacío,
   bloqueador de anuncios) la llamada simplemente no hace nada. */

type Fbq = (accion: "track" | "trackCustom", evento: string, datos?: Record<string, unknown>) => void;
type Ttq = { track: (evento: string, datos?: Record<string, unknown>) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

const CONTENIDO = { content_name: "Finca Algarrobo", content_category: "Terrenos campestres" };

/** El formulario del hero se envió: es el lead calificado. */
export function rastrearLead(datos: { motivo: string; inicial: string; ubicacion: string; paso: string }) {
  window.fbq?.("track", "Lead", { ...CONTENIDO, ...datos });
  window.ttq?.track("SubmitForm", { ...CONTENIDO, description: datos.paso });
}

/** Clic en cualquier botón/enlace de WhatsApp. `origen` dice qué CTA fue
 *  (visita, cuotas, ficha…) para comparar en el Administrador de anuncios. */
export function rastrearContacto(origen: string) {
  window.fbq?.("track", "Contact", { ...CONTENIDO, origen });
  window.ttq?.track("Contact", { ...CONTENIDO, description: origen });
}

/** Deduce qué CTA se pulsó a partir del mensaje del enlace wa.me. */
export function origenDeEnlace(href: string): string {
  const texto = new URL(href).searchParams.get("text") ?? "";
  const clave = (Object.keys(MENSAJES) as (keyof typeof MENSAJES)[]).find((k) => MENSAJES[k] === texto);
  return clave ?? "otro";
}
