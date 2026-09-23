/* ── Datos del sitio ─────────────────────────────────────────────────────────
   Única fuente de verdad de la landing. Todo lo que el cliente pueda querer
   cambiar (número, precios, plazos) vive aquí y no repartido por las secciones.

   Fuente: recursos/Info/FINCA_ALGARROBO INFO.pdf (ficha oficial del proyecto).
   ⚠️ El doc de público objetivo menciona "hasta 36 meses" y "cuota desde S/999";
   la ficha oficial dice 24 meses y no fija cuota. Se usa la ficha hasta que DLC
   confirme. */

export const SITIO = {
  marca: "Grupo DLC",
  proyecto: "Finca Algarrobo",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://grupodlc.pe",
  /** Número de WhatsApp de ventas (976 330 336), formato internacional sin
   *  "+" ni espacios. Se puede sobrescribir con NEXT_PUBLIC_WHATSAPP. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "51976330336",
  ciudad: "Chiclayo",
  direccion: "Carretera a Ferreñafe, Capote — Chiclayo, Lambayeque",
  mapa: "https://www.google.com/maps/search/?api=1&query=Capote+Carretera+a+Ferre%C3%B1afe+Chiclayo",
} as const;

export const OFERTA = {
  precioDesde: "S/ 58,000",
  separaDesde: "S/ 500",
  inicialDesde: "S/ 5,000",
  meses: 24,
  interes: "0%",
  metraje: "500 m²",
  minutosRealPlaza: 15,
  minutosZonaUrbana: 3,
} as const;

export const NAVEGACION = [
  { href: "#proyecto", label: "El proyecto" },
  { href: "#por-que", label: "Por qué DLC" },
  { href: "#testimonios", label: "Testimonios" },
  // El formulario vive en el hero: "Contacto" lleva directo a él.
  { href: "#formulario", label: "Contacto" },
] as const;
