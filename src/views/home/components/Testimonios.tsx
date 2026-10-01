"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, ChevronLeft, ChevronRight, Pause, Play, ShieldCheck } from "lucide-react";
import { ENTREGAS_CLIENTES } from "@/config/contenido";
import { EASE } from "@/shared/lib/motion";
import { Encabezado } from "@/shared/ui/Encabezado";

const INTERVALO = 6000;
const UMBRAL_ARRASTRE = 60;

export function Testimonios() {
  const [[indice, direccion], setEstado] = useState<[number, number]>([0, 0]);
  const [pausado, setPausado] = useState(false);
  const [enFoco, setEnFoco] = useState(false);
  const reducir = useReducedMotion();
  const autoplay = !pausado && !enFoco && !reducir;

  const ir = useCallback((paso: number) => {
    setEstado(([i]) => [(i + paso + ENTREGAS_CLIENTES.length) % ENTREGAS_CLIENTES.length, paso]);
  }, []);

  const saltarA = (nuevoIndice: number) => {
    setEstado([nuevoIndice, nuevoIndice > indice ? 1 : -1]);
  };

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => ir(1), INTERVALO);
    return () => clearInterval(t);
  }, [autoplay, ir, indice]);

  const entregaActual = ENTREGAS_CLIENTES[indice];

  return (
    <section id="testimonios" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Encabezado
          centrado
          etiqueta="Confianza y Respaldo DLC"
          titulo={
            <>
              Ellos ya han confiado en{" "}
              <span className="font-semibold text-dlc">nuestros proyectos</span>
            </>
          }
          bajada="Cientos de familias e inversionistas ya tienen su lote propio y disfrutan la seguridad jurídica de Grupo DLC en nuestros condominios y desarrollos entregados."
        />

        {/* Carrusel visual con fotos reales de clientes */}
        <div
          role="region"
          aria-roledescription="carrusel"
          aria-label="Fotos de entregas a propietarios"
          onMouseEnter={() => setEnFoco(true)}
          onMouseLeave={() => setEnFoco(false)}
          onFocus={() => setEnFoco(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setEnFoco(false)}
          className="relative mx-auto mt-12 max-w-4xl"
        >
          {/* Tarjeta principal de foto */}
          <div className="relative aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-950 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={indice}
                initial={{ opacity: 0, scale: 0.96, x: direccion >= 0 ? 40 : -40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: direccion >= 0 ? -40 : 40 }}
                transition={{ duration: 0.45, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -UMBRAL_ARRASTRE) ir(1);
                  else if (info.offset.x > UMBRAL_ARRASTRE) ir(-1);
                }}
                className="relative size-full cursor-grab active:cursor-grabbing"
              >
                <Image
                  src={entregaActual.imagen}
                  alt={entregaActual.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-cover object-center"
                />

                {/* Filtro degradado para garantizar legibilidad */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-neutral-950/10"
                />

                {/* Badge superior del proyecto */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-neutral-950/70 px-3.5 py-1.5 text-xs font-semibold text-dlc backdrop-blur-md shadow-md">
                    <BadgeCheck className="size-4 text-dlc" />
                    Proyecto: {entregaActual.proyecto}
                  </span>
                </div>

                {/* Pie con detalles del cliente y garantía DLC */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
                  <span className="mb-2 block h-0.5 w-10 bg-dlc" aria-hidden="true" />
                  <h4 className="font-display text-xl font-bold text-white sm:text-2xl text-balance">
                    {entregaActual.descripcion}
                  </h4>
                  <p className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-neutral-300">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
                    <span>Entrega oficial de propiedad y documentación con Grupo DLC</span>
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Fila interactiva de miniaturas de fotos */}
          <div className="mt-4 flex items-center justify-center gap-2.5 sm:gap-3 overflow-x-auto py-2">
            {ENTREGAS_CLIENTES.map((entrega, i) => (
              <button
                key={entrega.imagen}
                type="button"
                onClick={() => saltarA(i)}
                aria-label={`Ver foto ${i + 1} de ${entrega.proyecto}`}
                className={`group relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                  i === indice
                    ? "border-dlc ring-2 ring-dlc/50 scale-105 shadow-md"
                    : "border-white/15 opacity-60 hover:opacity-100 hover:scale-100"
                }`}
              >
                <Image
                  src={entrega.imagen}
                  alt={entrega.proyecto}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {/* Controles de navegación y estado */}
          <div className="mt-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <span className="text-white font-bold">{indice + 1}</span>
              <span>/</span>
              <span>{ENTREGAS_CLIENTES.length}</span>
              <span className="hidden sm:inline text-neutral-500">· {entregaActual.proyecto}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Foto anterior"
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-neutral-900/60 text-white transition-colors hover:border-dlc hover:text-dlc active:scale-95"
              >
                <ChevronLeft className="size-5" />
              </button>

              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Foto siguiente"
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-neutral-900/60 text-white transition-colors hover:border-dlc hover:text-dlc active:scale-95"
              >
                <ChevronRight className="size-5" />
              </button>

              {!reducir && (
                <button
                  type="button"
                  onClick={() => setPausado((v) => !v)}
                  aria-label={pausado ? "Reanudar carrusel" : "Pausar carrusel"}
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-dlc"
                >
                  {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

