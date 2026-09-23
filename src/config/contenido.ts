/* ── Contenido editable de la landing ───────────────────────────────────────
   Todo sale de la ficha oficial y del estudio de público objetivo
   (recursos/). Las FOTOS son referenciales (Unsplash): reemplazarlas por
   fotos y drone del proyecto real en cuanto existan. */

const foto = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

export const FOTO_HERO = foto("1500382017468-9049fed747ef", 2400);

/* ── Opciones del formulario de contacto (hero) ────────────────────────────
   Qué busca la persona: para qué quiere el lote, con cuánta inicial cuenta y
   qué ubicación prefiere dentro del condominio. Viajan en el mensaje de
   WhatsApp para que el asesor llegue a la conversación con contexto. */
export const MOTIVOS = ["Invertir", "Mi primer patrimonio", "Casa de campo"] as const;
export const INICIALES = ["Desde S/ 5,000", "S/ 10,000 a más", "S/ 20,000 a más", "Pago al contado"] as const;
export const UBICACIONES_LOTE = ["Sin preferencia", "Cerca al parque", "Cerca a las canchas", "Lote en esquina"] as const;
export const SIGUIENTE_PASO = ["Visitarlo este fin de semana", "Recibir el video recorrido", "Conocer mi plan de cuotas"] as const;

export type Consulta = {
  motivo: (typeof MOTIVOS)[number];
  inicial: (typeof INICIALES)[number];
  ubicacion: (typeof UBICACIONES_LOTE)[number];
};

export const CONSULTA_INICIAL: Consulta = {
  motivo: MOTIVOS[0],
  inicial: INICIALES[0],
  ubicacion: UBICACIONES_LOTE[0],
};

/* ── Espacios del condominio (grid) ─────────────────────────────────────── */
export type Espacio = { titulo: string; texto: string; imagen: string; alt: string };

export const ESPACIOS: Espacio[] = [
  {
    titulo: "Zona de hamacas",
    texto: "Para no hacer nada, a propósito.",
    imagen: foto("1445307806294-bff7f67ff225"),
    alt: "Persona descansando en una hamaca entre árboles",
  },
  {
    titulo: "Cancha con grass sintético",
    texto: "El partido de los domingos, en casa.",
    imagen: foto("1574629810360-7efbbe195018"),
    alt: "Balón de fútbol sobre césped de cancha",
  },
  {
    titulo: "Mini cancha de básquet",
    texto: "Para la familia y los amigos.",
    imagen: foto("1519861531473-9200262188bf"),
    alt: "Pelota de básquet en una cancha al aire libre",
  },
  {
    titulo: "Área recreativa",
    texto: "Para niños y adultos.",
    imagen: foto("1596997000103-e597b3ca50df"),
    alt: "Juegos infantiles en un parque rodeado de árboles",
  },
  {
    titulo: "Parque y áreas verdes",
    texto: "Aire limpio a minutos de la ciudad.",
    imagen: foto("1502082553048-f009c37129b9"),
    alt: "Árbol frondoso en medio de un prado verde",
  },
  {
    titulo: "Tu casa de campo",
    texto: "La parrilla del domingo en tus 500 m².",
    imagen: foto("1555939594-58d7cb561ad1"),
    alt: "Parrillada de carnes y verduras",
  },
];

/* ── Testimonios ──────────────────────────────────────────────────────────
   ⚠️ ILUSTRATIVOS: DLC aún no entregó testimonios. El estudio de público dice
   que la prueba social es lo que más vende (referidos del proyecto anterior):
   reemplazar por testimonios reales, con nombre y autorización, y poner
   `ilustrativo: false`. Mientras sea true, la página lo indica en cada tarjeta. */
export type Testimonio = { nombre: string; rol: string; cita: string; ilustrativo: boolean };

export const TESTIMONIOS: Testimonio[] = [
  {
    nombre: "Profesional de Chiclayo",
    rol: "Perfil inversionista",
    cita:
      "Buscaba dónde poner mi ahorro que fuera tangible y cerca de la ciudad. Lo que me convenció fue ver el terreno cercado y entender bien la documentación antes de firmar.",
    ilustrativo: true,
  },
  {
    nombre: "Emprendedora",
    rol: "Su primer terreno",
    cita:
      "Pensé que no me alcanzaba. Separé con S/ 500 y ahora pago mis cuotas sin intereses. Por fin tengo algo a mi nombre.",
    ilustrativo: true,
  },
  {
    nombre: "Pequeño empresario",
    rol: "Su casa de campo",
    cita:
      "Siempre soñé con llevar a mi familia a un lugar propio los fines de semana. Está a 15 minutos, así que vamos cada vez que podemos.",
    ilustrativo: true,
  },
];
