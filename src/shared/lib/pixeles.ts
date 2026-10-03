import { RASTROS, type IdRastro } from "@/config/rastros";
import { nombreDe, plantillaDe } from "@/shared/lib/plantillas";
import { registrar } from "@/shared/lib/registro";

/* Eventos de conversión para Meta, TikTok y el registro propio del panel. Los
   componentes llaman a estas funciones y no a fbq/ttq directamente: si un píxel
   no está cargado (ID vacío, bloqueador de anuncios) la llamada no hace nada.

   Regla acordada con el equipo (2026-10-01): SOLO existe «Cliente potencial».
   Toda acción que abre WhatsApp —cualquier botón o enlace, el chat flotante y
   el formulario— envía UN único evento:
     · Meta:   Lead        («Cliente potencial» en el Administrador de anuncios)
     · TikTok: SubmitForm  (TikTok lo muestra como «Lead»)
   Sin Contact ni eventos personalizados, para no contar dos veces la misma
   persona. Cada evento lleva el id del elemento (catálogo en
   src/config/rastros.ts) y su nombre legible. El registro propio sí distingue
   «contacto» (botón de WhatsApp) de «lead» (formulario) para el panel. */

type Fbq = (accion: "track" | "trackCustom", evento: string, datos?: Record<string, unknown>) => void;
type Ttq = { track: (evento: string, datos?: Record<string, unknown>) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

const CONTENIDO = { content_name: "Finca Algarrobo", content_category: "Terrenos campestres" };

/** El único evento de conversión de los píxeles: «Cliente potencial». */
function clientePotencial(id: IdRastro, datos?: Record<string, string>) {
  const rastro = RASTROS[id].nombre;
  window.fbq?.("track", "Lead", { ...CONTENIDO, ...datos, origen: id, rastro });
  window.ttq?.track("SubmitForm", { ...CONTENIDO, description: rastro });
}

/** Plantilla y nombre del mensaje que se abre en WhatsApp (para reconocerlo
 *  cuando llegue al CRM). */
const delMensaje = (texto?: string) => (texto ? { plantilla: plantillaDe(texto), nombre: nombreDe(texto) } : {});

/** Se envió un formulario. `texto`: el mensaje exacto que se abre en WhatsApp. */
export function rastrearLead(id: IdRastro, datos: { motivo: string; inicial: string; ubicacion: string; paso: string }, texto?: string) {
  clientePotencial(id, datos);
  registrar("lead", { origen: id, datos, ...delMensaje(texto) });
}

/** Clic en un botón/enlace de WhatsApp o mensaje desde el chat flotante. */
export function rastrearContacto(id: IdRastro, texto?: string) {
  clientePotencial(id);
  registrar("contacto", { origen: id, ...delMensaje(texto) });
}
