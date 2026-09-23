"use client";

import { motion } from "framer-motion";
import { alEntrar, escalonar, subir } from "@/shared/lib/motion";

type Props = {
  etiqueta: string;
  titulo: React.ReactNode;
  bajada?: React.ReactNode;
  centrado?: boolean;
  id?: string;
};

/** Encabezado de sección: etiqueta con filete + titular + bajada opcional. */
export function Encabezado({ etiqueta, titulo, bajada, centrado = false, id }: Props) {
  return (
    <motion.div {...alEntrar} variants={escalonar(0.1)} className={centrado ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <motion.p
        variants={subir}
        className={`flex items-center gap-3 text-xs font-medium tracking-[0.3em] text-dlc uppercase ${
          centrado ? "justify-center" : ""
        }`}
      >
        <span className="filete h-px w-10" aria-hidden="true" />
        {etiqueta}
      </motion.p>
      <motion.h2
        id={id}
        variants={subir}
        className="mt-5 font-display text-4xl leading-[1.08] font-light tracking-tight text-balance sm:text-5xl"
      >
        {titulo}
      </motion.h2>
      {bajada && (
        <motion.p variants={subir} className="mt-5 text-lg leading-relaxed text-pretty text-tinta-2">
          {bajada}
        </motion.p>
      )}
    </motion.div>
  );
}
