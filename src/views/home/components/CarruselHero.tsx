"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin } from "lucide-react";
import { EASE } from "@/shared/lib/motion";

export const FOTOS_PROYECTO_HERO = [
  {
    src: "/proyecto/terreno-algarrobo.jpg",
    alt: "Vista panorámica del terreno real de Finca Algarrobo en Capote",
    etiqueta: "Entorno natural y casas de campo",
  },
  {
    src: "/proyecto/porton-real.jpg",
    alt: "Portón de ingreso privado al condominio Finca Algarrobo",
    etiqueta: "Portón y pórtico de ingreso privado",
  },
  {
    src: "/proyecto/interior-palmeras.jpg",
    alt: "Áreas verdes interiores y paisajismo con palmeras",
    etiqueta: "Áreas verdes y paisajismo",
  },
  {
    src: "/proyecto/vias-cerco.jpg",
    alt: "Vías afirmadas con sardineles y cerco perimétrico del condominio",
    etiqueta: "Vías afirmadas y cerco perimétrico",
  },
] as const;

export function CarruselHero() {
  const [activo, setActivo] = useState(0);
  const [interactuado, setInteractuado] = useState(false);

  // Rotación automática sutil cada 5 segundos a menos que el usuario interactúe
  useEffect(() => {
    if (interactuado) return;
    const temporizador = setInterval(() => {
      setActivo((prev) => (prev + 1) % FOTOS_PROYECTO_HERO.length);
    }, 5000);
    return () => clearInterval(temporizador);
  }, [interactuado]);

  const seleccionar = (idx: number) => {
    setActivo(idx);
    setInteractuado(true);
  };

  const fotoActual = FOTOS_PROYECTO_HERO[activo];

  return (
    <div className="flex flex-col w-full">
      {/* Marco principal de la foto con esquinas redondeadas tipo mockup */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border border-white/15 bg-neutral-950 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={fotoActual.src}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-0"
          >
            <Image
              src={fotoActual.src}
              alt={fotoActual.alt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradiente inferior para legibilidad del badge */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/15 to-transparent pointer-events-none"
        />

        {/* Badge inferior izquierdo con ubicación / concepto */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 flex items-center gap-2 rounded-full bg-neutral-950/85 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md border border-white/15 shadow-lg">
          <MapPin className="size-3.5 sm:size-4 text-dlc shrink-0" aria-hidden="true" />
          <span>{fotoActual.etiqueta}</span>
        </div>

        {/* Indicador de fotos 1/4 */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 rounded-full bg-neutral-950/70 px-2.5 py-1 text-[11px] font-medium text-neutral-300 backdrop-blur-md border border-white/10">
          {activo + 1} / {FOTOS_PROYECTO_HERO.length}
        </div>
      </div>

      {/* Tira de 4 miniaturas interactivas */}
      <div className="mt-3 sm:mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {FOTOS_PROYECTO_HERO.map((foto, idx) => {
          const esActiva = activo === idx;
          return (
            <button
              key={foto.src}
              type="button"
              onClick={() => seleccionar(idx)}
              aria-label={`Ver foto: ${foto.etiqueta}`}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                esActiva
                  ? "border-2 border-dlc ring-2 ring-dlc/30 scale-[1.02] shadow-[0_0_16px_rgba(253,185,12,0.35)] opacity-100"
                  : "border border-white/15 opacity-60 hover:opacity-100 hover:scale-[1.01]"
              }`}
            >
              <Image
                src={foto.src}
                alt={foto.etiqueta}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>

      {/* Micro-CTA hacia el formulario en móvil */}
      <div className="mt-4 sm:mt-5 text-center lg:hidden">
        <a
          href="#formulario"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-wide text-dlc hover:text-dlc-claro transition-colors uppercase"
        >
          <span>Registra tus datos aquí</span>
          <ChevronDown className="size-4 animate-bounce text-dlc" />
        </a>
      </div>
    </div>
  );
}
