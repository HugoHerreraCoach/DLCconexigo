import { RASTROS, type IdRastro } from "@/config/rastros";
import { nombreDe, plantillaDe } from "@/shared/lib/plantillas";
import { registrar } from "@/shared/lib/registro";

/* Eventos de los píxeles y registro de intenciones de contacto para analítica interna.

   REGLA DE CONVERSIÓN (2026-10-17; evento cambiado el 2026-10-20, docs/0021):
   · La conversión (`CompleteRegistration` en Meta y en TikTok) se envía SOLO
     cuando un formulario de registro (el del hero o el del chat flotante) quedó
     guardado como fila en la hoja de cálculo de leads: /api/formulario responde
     ok después de que Google confirma la fila y recién entonces useRegistro llama
     a clientePotencial(). Nunca antes.
   · `Lead` (Meta) y `SubmitForm` (TikTok, que lo muestra como «Lead») quedaron en
     desuso: la landing ya no los envía.
   · Un clic a WhatsApp no emite conversión: ahí se registra solo la
     INTENCIÓN ("contacto"); la adquisición por WhatsApp la confirma el CRM
     ConexiGO al recibir el primer mensaje real.
*/

type Fbq = (accion: "track", evento: string, datos?: Record<string, unknown>, opciones?: { eventID?: string }) => void;
type Ttq = { track: (evento: string, datos?: Record<string, unknown>, opciones?: { event_id?: string }) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    ttq?: Ttq;
  }
}

const CONTENIDO = { content_name: "Finca Algarrobo", content_category: "Terrenos campestres" };

/** Evento de conversión de la landing en los dos píxeles. */
export const EVENTO_REGISTRO = "CompleteRegistration";

/** Conversión en los píxeles: `CompleteRegistration` en Meta y en TikTok.
 *  Llamar SOLO con la fila ya confirmada en la hoja. `registroId` es el id del
 *  envío (columna «TikTok Lead ID» de la hoja) y va como id del evento, para
 *  deduplicar si luego se envía también desde el servidor.
 *  Sin nombre ni celular: los píxeles no reciben datos personales. */
export function clientePotencial(id: IdRastro, registroId: string, datos?: Record<string, string>) {
  const rastro = RASTROS[id].nombre;
  try {
    window.fbq?.("track", EVENTO_REGISTRO, { ...CONTENIDO, ...datos, origen: id, rastro }, { eventID: registroId });
    window.ttq?.track(EVENTO_REGISTRO, { ...CONTENIDO, description: rastro }, { event_id: registroId });
  } catch {
    /* la medición nunca debe romper la página */
  }
}

/** Plantilla y nombre del mensaje que se abre en WhatsApp (para reconocerlo
 *  cuando llegue al CRM). */
const delMensaje = (texto?: string) => (texto ? { plantilla: plantillaDe(texto), nombre: nombreDe(texto) } : {});

/** Datos complementarios del formulario. */
export type DatosFormularioLead = {
  motivo: string;
  inicial: string;
  ubicacion: string;
  paso: string;
  celular?: string;
  nombre?: string;
};

/** Se completó un formulario que abre WhatsApp (intención de contacto preparada).
 *  `texto`: el mensaje exacto que se abre en WhatsApp. El formulario del hero
 *  ya no la usa: va a la hoja de cálculo (/api/formulario + clientePotencial). */
export function rastrearLead(
  id: IdRastro,
  datos: DatosFormularioLead,
  texto?: string,
  intencionId?: string
) {
  return registrar("formulario_preparado", {
    origen: id,
    datos: {
      motivo: datos.motivo,
      inicial: datos.inicial,
      ubicacion: datos.ubicacion,
      paso: datos.paso,
    },
    telefono: datos.celular,
    nombre: datos.nombre,
    intencion_id: intencionId,
    ...delMensaje(texto),
  });
}

/** Clic en un botón/enlace de WhatsApp (intención de contacto). No es conversión. */
export function rastrearContacto(id: IdRastro, texto?: string, intencionId?: string) {
  return registrar("contacto", {
    origen: id,
    intencion_id: intencionId,
    ...delMensaje(texto),
  });
}

