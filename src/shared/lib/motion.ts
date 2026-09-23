import type { Variants } from "framer-motion";

/* Un solo lenguaje de movimiento para toda la página: entradas cortas
   (fade + slide-up de 24px), easing suave y escalonado discreto. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const subir: Variants = {
  oculto: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const escalonar = (cada = 0.1, retraso = 0): Variants => ({
  oculto: {},
  visible: { transition: { staggerChildren: cada, delayChildren: retraso } },
});

/** Props comunes para revelar al hacer scroll (una sola vez). */
export const alEntrar = {
  initial: "oculto",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
} as const;
