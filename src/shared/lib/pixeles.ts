import { type IdRastro } from "@/config/rastros";
import { nombreDe, plantillaDe } from "@/shared/lib/plantillas";
import { registrar } from "@/shared/lib/registro";

/* Registro de intenciones de contacto para analítica interna.
   Los componentes llaman a estas funciones al interactuar con formularios o botones de WhatsApp.

   REGLA DE CONVERSIÓN CANÓNICA (2026-10):
   Ningún clic ni formulario en el navegador emite un evento de conversión "Lead"
   ni "SubmitForm" a Meta ni a TikTok. La adquisición de un cliente potencial ocurre
   ÚNICAMENTE en el servidor de ConexiGO cuando el primer mensaje humano real de WhatsApp
   es recibido y almacenado en la base de datos del CRM.

   Aquí en el navegador se registra exclusivamente la INTENCIÓN:
     · Formulario: "formulario_preparado"
     · Clic en WhatsApp: "contacto"
*/

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

/** Se completó el formulario de contacto (intención de contacto preparada).
 *  `texto`: el mensaje exacto que se abre en WhatsApp. */
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

/** Clic en un botón/enlace de WhatsApp o mensaje desde el chat flotante (intención de contacto). */
export function rastrearContacto(id: IdRastro, texto?: string, intencionId?: string) {
  return registrar("contacto", {
    origen: id,
    intencion_id: intencionId,
    ...delMensaje(texto),
  });
}

