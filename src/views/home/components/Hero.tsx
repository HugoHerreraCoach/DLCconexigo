"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { FOTO_HERO } from "@/config/contenido";
import { OFERTA } from "@/config/sitio";
import { EASE, escalonar, subir } from "@/shared/lib/motion";
import { FormularioContacto } from "./FormularioContacto";

const DATOS = ["Terreno matriz inscrito en SUNARP", `${OFERTA.interes} de interés`, `Hasta ${OFERTA.meses} meses para pagar`];

export function Hero() {
  return (
    <section id="inicio" className="relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-16 lg:pb-24">
      {/* Imagen de fondo con un leve "respiro" de entrada */}
      <motion.div className="absolute inset-0" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }}>
        <Image
          src={FOTO_HERO}
          alt="Campo abierto al atardecer con el sol en el horizonte"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      {/* Velos: garantizan el contraste del texto sobre la foto */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/70 to-neutral-950/40" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-fondo via-transparent to-neutral-950/40" />

      <motion.div
        initial="oculto"
        animate="visible"
        variants={escalonar(0.14, 0.3)}
        className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16"
      >
        <div>
          <motion.p
            variants={subir}
            className="flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-dlc uppercase sm:tracking-[0.32em]"
          >
            <span className="filete h-px w-10" aria-hidden="true" />
            Preventa · Finca Algarrobo · Chiclayo
          </motion.p>

          <motion.h1
            variants={subir}
            className="mt-6 font-display text-5xl leading-[1.02] font-light tracking-tight text-balance sm:text-6xl"
          >
            Tu terreno <span className="font-semibold text-dlc">campestre</span> a 15 minutos de Chiclayo
          </motion.h1>

          <motion.p variants={subir} className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
            Lotes desde {OFERTA.metraje} en un condominio cercado, con áreas verdes, canchas y zona de hamacas.
            Preventa desde <strong className="font-semibold text-white">{OFERTA.precioDesde}</strong> y separas con{" "}
            <strong className="font-semibold text-white">{OFERTA.separaDesde}</strong>.
          </motion.p>

          <motion.ul variants={subir} className="mt-8 flex flex-col gap-3 text-sm text-neutral-300">
            {DATOS.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-dlc" aria-hidden="true" />
                {d}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={subir}>
          <FormularioContacto />
        </motion.div>
      </motion.div>

      <p className="absolute bottom-4 left-4 text-[0.7rem] text-white/50 sm:left-6">Imagen referencial</p>
    </section>
  );
}
