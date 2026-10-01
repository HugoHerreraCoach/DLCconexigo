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
export const MOTIVOS = ["Invertir", "Casa de campo"] as const;
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
    titulo: "Monumento y pórtico de ingreso",
    texto: "Seguridad, control y distinción desde tu llegada.",
    imagen: "/galeria/letrero-finca-algarrobo.jpg",
    alt: "Render del monumento de bienvenida de Finca Algarrobo",
  },
  {
    titulo: "Parque central y pileta",
    texto: "Senderos, áreas verdes y aire limpio para toda la familia.",
    imagen: "/galeria/parque-central-aereo.jpg",
    alt: "Render del parque central con pileta de Finca Algarrobo",
  },
  {
    titulo: "Cancha con grass sintético",
    texto: "Fútbol y básquet en un complejo deportivo exclusivo.",
    imagen: "/galeria/cancha-sintetica-aerea.jpg",
    alt: "Render de la cancha deportiva de grass sintético de Finca Algarrobo",
  },
  {
    titulo: "Zona de hamacas",
    texto: "Para no hacer nada, a propósito.",
    imagen: "/galeria/zona-hamacas.png",
    alt: "Render de personas descansando en hamacas bajo los árboles de Finca Algarrobo",
  },
  {
    titulo: "Área recreativa infantil",
    texto: "Para niños y adultos en un entorno campestre.",
    imagen: "/galeria/juegos-infantiles.jpg",
    alt: "Render de los juegos infantiles de Finca Algarrobo",
  },
  {
    titulo: "Tu casa de campo",
    texto: "Calles afirmadas y lotes listos para construir.",
    imagen: "/galeria/calle-residencial.jpg",
    alt: "Render de una calle residencial con casas construidas en Finca Algarrobo",
  },
];

/* ── Entregas reales y prueba social de Grupo DLC ─────────────────────────
   Fotos reales de propietarios recibiendo sus contratos, planos y títulos en
   los proyectos de la empresa (Residencial San José, Condominio El Golf, Valle Verde). */
export type EntregaCliente = {
  imagen: string;
  proyecto: string;
  descripcion: string;
  alt: string;
};

export const ENTREGAS_CLIENTES: EntregaCliente[] = [
  {
    imagen: "/testimonios/cliente-1.jpg",
    proyecto: "Residencial San José",
    descripcion: "Firma y entrega de lote con el equipo de Grupo DLC",
    alt: "Propietaria celebrando la entrega de su lote en Residencial San José de Grupo DLC",
  },
  {
    imagen: "/testimonios/cliente-2.jpg",
    proyecto: "DLC Company",
    descripcion: "Entrega de contrato y documentación oficial de terreno",
    alt: "Nuevos propietarios recibiendo su documentación legal de terreno con Grupo DLC",
  },
  {
    imagen: "/testimonios/cliente-3.jpg",
    proyecto: "Residencial Valle Verde",
    descripcion: "Familia propietaria con su documentación legal en regla",
    alt: "Familia celebrando la firma y adjudicación de su lote con Grupo DLC",
  },
  {
    imagen: "/testimonios/cliente-4.jpg",
    proyecto: "Residencial San José",
    descripcion: "Cumpliendo el sueño de su casa de campo propia",
    alt: "Familia con niño pequeño sonrientes en el marco de Residencial San José de Grupo DLC",
  },
  {
    imagen: "/testimonios/cliente-5.jpg",
    proyecto: "Condominio El Golf",
    descripcion: "Bienvenida a Rosa Ríos a su nuevo lote de campo",
    alt: "Rosa Ríos recibiendo su contrato y bienvenida a Condominio El Golf de DLC Inmobiliaria",
  },
];

