/* ── Contenido editable de la landing ───────────────────────────────────────
   Todo sale de la ficha oficial y del estudio de público objetivo
   (recursos/). Las FOTOS son renders 3D del proyecto real (recursos/Galeria/,
   entregados por DLC): reemplazarlas por fotos y drone del avance de obra en
   cuanto existan. */

export const FOTO_HERO = "/galeria/porton-ingreso.jpg";

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
    imagen: "/galeria/zona-hamacas.png",
    alt: "Render de personas descansando en hamacas bajo los árboles de Finca Algarrobo",
  },
  {
    titulo: "Cancha con grass sintético",
    texto: "El partido de los domingos, en casa.",
    imagen: "/galeria/cancha-futbol.jpg",
    alt: "Render de la cancha de fútbol con grass sintético de Finca Algarrobo al atardecer",
  },
  {
    titulo: "Mini cancha de básquet",
    texto: "Para la familia y los amigos.",
    imagen: "/galeria/cancha-basquet.jpg",
    alt: "Render de la cancha de básquet de Finca Algarrobo",
  },
  {
    titulo: "Área recreativa",
    texto: "Para niños y adultos.",
    imagen: "/galeria/juegos-infantiles.jpg",
    alt: "Render de los juegos infantiles de Finca Algarrobo",
  },
  {
    titulo: "Parque y áreas verdes",
    texto: "Aire limpio a minutos de la ciudad.",
    imagen: "/galeria/fuente-parque.jpg",
    alt: "Render del parque con fuente y áreas verdes de Finca Algarrobo",
  },
  {
    titulo: "Tu casa de campo",
    texto: "Calles afirmadas y casas ya en pie, a tu ritmo.",
    imagen: "/galeria/calle-residencial.jpg",
    alt: "Render de una calle residencial con casas construidas en Finca Algarrobo",
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
