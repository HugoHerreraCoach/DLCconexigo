/* ── Catálogo de rastros ──────────────────────────────────────────────────────
   Todo elemento de la landing que deja un rastro medible (un botón o enlace de
   WhatsApp, un formulario…) se da de alta AQUÍ con un id y un nombre. Con eso:
     · el panel (/panel) lo muestra por su nombre en "¿Qué generó cada contacto?"
       y en "Últimos formularios";
     · Meta y TikTok reciben el nombre en sus eventos (Contact / Lead);
     · la API (/api/eventos) solo acepta ids de este catálogo.

   CÓMO AGREGAR UN ELEMENTO NUEVO
   1. Añade una entrada a RASTROS, por ejemplo:
        "promo-banner-whatsapp": {
          nombre: "Banner de promoción de septiembre",
          tipo: "contacto",
          seccion: "Inicio",
        },
      · id (la clave): minúsculas y guiones, máximo 30 caracteres. Es el que se
        guarda en la base: NO lo cambies después o el histórico se parte en dos.
      · nombre: lo que verá el panel. Se puede cambiar cuando quieras.
      · tipo: "contacto" = clic que abre WhatsApp · "lead" = formulario enviado.
      · seccion: en qué parte de la página está, para ubicarlo.
   2. Marca el elemento en su componente:
      · Enlace de WhatsApp (<a href={enlaceWhatsApp(…)}>): agrega
          {...marcaRastro("promo-banner-whatsapp")}
        y listo: el clic lo registra solo el oyente de src/shared/ui/Pixeles.tsx.
        Si los enlaces salen de una lista de datos, guarda el id con
          { texto, href, rastro: idRastro("promo-banner-whatsapp") }
        y al renderizar usa {...marcaRastro(e.rastro)}.
      · Formulario: al enviarlo llama a
          rastrearLead("mi-formulario", { motivo, inicial, ubicacion, paso })
        (src/shared/lib/pixeles.ts).
   3. No hay paso 3: el panel lo muestra en cuanto tenga actividad.
      TypeScript marca error si usas un id que no está aquí.

   Un enlace de WhatsApp SIN marcaRastro se registra igual, pero como
   "sin-identificar": si lo ves en el panel, falta dar de alta un botón.
   Para retirar un elemento, quita la marca del componente pero deja su entrada
   aquí si ya tiene histórico, para que el panel siga mostrando su nombre. */

export type TipoRastro = "contacto" | "lead";

type Rastro = { nombre: string; tipo: TipoRastro; seccion: string };

export const RASTROS = {
  // ── Formularios ──
  "formulario-hero": {
    nombre: "Formulario de solicitud de información de terreno",
    tipo: "lead",
    seccion: "Inicio (hero)",
  },

  // ── Botones y enlaces de WhatsApp ──
  "header-agendar-visita": { nombre: "Botón «Agenda tu visita» del menú", tipo: "contacto", seccion: "Menú superior" },
  "menu-movil-agendar-visita": { nombre: "Botón «Agenda tu visita» del menú del celular", tipo: "contacto", seccion: "Menú (celular)" },
  "proyecto-agendar-visita": { nombre: "Botón «Agenda tu visita» de El proyecto", tipo: "contacto", seccion: "El proyecto" },
  "proyecto-pedir-ficha": { nombre: "Botón «Pide la ficha»", tipo: "contacto", seccion: "El proyecto" },
  "galeria-video-whatsapp": { nombre: "Enlace «Enviármelo por WhatsApp» del video recorrido", tipo: "contacto", seccion: "Galería y video" },
  "financiamiento-plan-cuotas": { nombre: "Enlace «Consultar mi plan de cuotas»", tipo: "contacto", seccion: "Por qué DLC · Financiamiento" },
  "legal-documentacion": { nombre: "Enlace «Consultar la documentación»", tipo: "contacto", seccion: "Por qué DLC · Papeles claros" },
  "contacto-whatsapp": { nombre: "Tarjeta «Escríbenos por WhatsApp»", tipo: "contacto", seccion: "Contacto" },
  "contacto-video-recorrido": { nombre: "Tarjeta «Pide el video recorrido»", tipo: "contacto", seccion: "Contacto" },
  "footer-financiamiento": { nombre: "Enlace «Planes de financiamiento» del pie", tipo: "contacto", seccion: "Pie de página" },
  "footer-ficha": { nombre: "Enlace «Pide la ficha del proyecto» del pie", tipo: "contacto", seccion: "Pie de página" },
  "footer-video": { nombre: "Enlace «Video recorrido» del pie", tipo: "contacto", seccion: "Pie de página" },
  "footer-documentacion": { nombre: "Enlace «Documentación» del pie", tipo: "contacto", seccion: "Pie de página" },
  "footer-whatsapp": { nombre: "Enlace «Escríbenos por WhatsApp» del pie", tipo: "contacto", seccion: "Pie de página" },
  "whatsapp-flotante": { nombre: "Botón flotante de WhatsApp", tipo: "contacto", seccion: "Toda la página" },

  // ── Reservado: no usar en componentes ──
  "sin-identificar": { nombre: "Enlace de WhatsApp sin identificar", tipo: "contacto", seccion: "Falta marcaRastro()" },
} as const satisfies Record<string, Rastro>;

export type IdRastro = keyof typeof RASTROS;
/** Ids que se pueden poner en un componente (todos menos el reservado). */
export type IdMarcable = Exclude<IdRastro, "sin-identificar">;

export const esRastro = (id: unknown): id is IdRastro => typeof id === "string" && Object.hasOwn(RASTROS, id);

/** Atributo que identifica un enlace de WhatsApp: `<a {...marcaRastro("id")}>`. */
export const marcaRastro = (id: IdMarcable) => ({ "data-rastro": id });

/** Para guardar el id en una lista de datos y marcar el enlace al renderizar:
 *  `{ texto, href, rastro: idRastro("mi-id") }` → `<a {...marcaRastro(e.rastro)}>`. */
export const idRastro = (id: IdMarcable) => id;
