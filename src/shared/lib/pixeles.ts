import { RASTROS, type IdRastro } from "@/config/rastros";
import { registrar } from "@/shared/lib/registro";

/* Eventos de conversión para Meta, TikTok y el registro propio del panel. Los
   componentes llaman a estas funciones y no a fbq/ttq directamente: si un píxel
   no está cargado (ID vacío, bloqueador de anuncios) la llamada no hace nada.
   Cada evento lleva el id del elemento que lo generó (catálogo en
   src/config/rastros.ts) y su nombre legible. */

type Fbq = (accion: "track" | "trackCustom", evento: string, datos?: Record<string, unknown>) => void;
type Ttq = { track: (evento: string, datos?: Record<string, unknown>) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

const CONTENIDO = { content_name: "Finca Algarrobo", content_category: "Terrenos campestres" };

/** Se envió un formulario: es el lead calificado. */
export function rastrearLead(id: IdRastro, datos: { motivo: string; inicial: string; ubicacion: string; paso: string }) {
  const rastro = RASTROS[id].nombre;
  window.fbq?.("track", "Lead", { ...CONTENIDO, ...datos, origen: id, rastro });
  window.ttq?.track("SubmitForm", { ...CONTENIDO, description: rastro });
  registrar("lead", { origen: id, datos });
}

/** Clic en un botón/enlace de WhatsApp. `id` dice cuál fue, para comparar
 *  en el panel y en el Administrador de anuncios. */
export function rastrearContacto(id: IdRastro) {
  const rastro = RASTROS[id].nombre;
  window.fbq?.("track", "Contact", { ...CONTENIDO, origen: id, rastro });
  window.ttq?.track("Contact", { ...CONTENIDO, description: rastro });
  registrar("contacto", { origen: id });
}
