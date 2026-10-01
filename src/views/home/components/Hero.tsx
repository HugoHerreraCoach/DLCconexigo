"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { FOTO_HERO } from "@/config/contenido";
import { OFERTA } from "@/config/sitio";
import { EASE, escalonar, subir } from "@/shared/lib/motion";
import { CarruselHero } from "./CarruselHero";
import { FormularioContacto } from "./FormularioContacto";

const BENEFICIOS_HERO = [
  "Documentación legal al día — trato directo",
  `Precios desde ${OFERTA.precioDesde}`,
  `Financia hasta en ${OFERTA.meses} meses`,
];

export function Hero() {
  return (
    <section id="inicio" className="relative flex min-h-[100svh] items-center overflow-hidden pt-20 sm:pt-28 lg:pt-32 pb-14 lg:pb-24">
      {/* Imagen de fondo con un leve "respiro" de entrada */}
      <motion.div className="absolute inset-0" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }}>
        <Image
          src={FOTO_HERO}
          alt="Render del pórtico de ingreso de Finca Algarrobo al atardecer"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      {/* Velos: garantizan el contraste del texto sobre la foto */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-neutral-950/90 via-neutral-950/80 to-fondo" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-fondo via-transparent to-neutral-950/40" />

      <motion.div
        initial="oculto"
        animate="visible"
        variants={escalonar(0.12, 0.2)}
        className="relative mx-auto w-full max-w-6xl px-4 sm:px-6"
      >
        {/* Cabecera del Hero centrada, más grande y con máximo protagonismo */}
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          {/* Ubicación estratégica centrada con filetes dorados */}
          <motion.p
            variants={subir}
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-[0.16em] text-dlc uppercase"
          >
            <span className="filete h-px w-6 sm:w-10 shrink-0" aria-hidden="true" />
            <span>A 15 min del Real Plaza de Chiclayo · Capote</span>
            <span className="filete h-px w-6 sm:w-10 shrink-0" aria-hidden="true" />
          </motion.p>

          {/* Titular principal imponente y centrado */}
          <motion.h1
            variants={subir}
            className="mt-4 sm:mt-5 font-display flex flex-col items-center"
          >
            {/* Nivel 1: Introducción editorial */}
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-light tracking-wide text-neutral-300">
              Terrenos exclusivos para
            </span>

            {/* Nivel 2: Protagonista con gran formato y brillo dorado continuo */}
            <span className="block mt-1 sm:mt-2 text-5xl sm:text-7xl lg:text-[5.5rem] font-black uppercase tracking-tight leading-[0.98] texto-dorado-animado drop-shadow-[0_4px_30px_rgba(253,185,12,0.35)]">
              Casa de Campo
            </span>

            {/* Nivel 3: Especificaciones en texto continuo con contraste tipográfico */}
            <span className="block mt-3 sm:mt-4 text-xl sm:text-2xl lg:text-3xl font-light text-neutral-200 leading-snug">
              desde <span className="font-extrabold text-dlc whitespace-nowrap">500 m²</span> a{" "}
              <span className="font-semibold text-white whitespace-nowrap">3 min</span> de la zona urbana
            </span>
          </motion.h1>

          {/* Checklist de beneficios centrado en cápsulas elegantes */}
          <motion.ul
            variants={subir}
            className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-xs sm:text-sm text-neutral-200"
          >
            {BENEFICIOS_HERO.map((item) => (
              <motion.li
                key={item}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:border-dlc/40"
              >
                <Check className="size-3.5 sm:size-4 shrink-0 text-dlc" strokeWidth={2.5} aria-hidden="true" />
                <span className="font-medium text-neutral-200">{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Bloque: Carrusel de fotos reales antes del formulario */}
        <div className="mt-10 lg:mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:items-start">
          <motion.div variants={subir} className="w-full">
            <CarruselHero />
          </motion.div>

          <motion.div variants={subir} className="w-full">
            <FormularioContacto />
          </motion.div>
        </div>
      </motion.div>

      <p className="absolute bottom-4 left-4 text-[0.7rem] text-white/50 sm:left-6">Render del proyecto</p>
    </section>
  );
}

